import pool from '../db.js';
import { materializarProgreso } from './access.service.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { publishInteractiveGames } from '../publish-interactive-games.js';

const defaultRapTitles = [
  'RAP 1 - Basic Nursing English',
  'RAP 2 - Patient Interaction',
  'RAP 3 - Clinical Communication',
  'RAP 4 - Medical Documentation',
  'RAP 5 - Advanced Terminology',
  'RAP 6 - Emergency Procedures'
];

const defaultModules = [
  {
    titulo: 'MODULO 1 GETTING TO KNOW OTHER PEOPLE',
    fase: 'Fase Analisis',
    orden: 1,
    rapOrders: [1]
  },
  {
    titulo: 'MODULO 2 WORK LIFE INTERACTION',
    fase: 'Fase Planeacion',
    orden: 2,
    rapOrders: [2, 3]
  },
  {
    titulo: 'MODULO 3 WORK PLACE COMUNICATION',
    fase: 'Fase Ejecucion',
    orden: 3,
    rapOrders: [4, 5]
  },
  {
    titulo: 'MODULO 4 PROFESSIONAL PRACTICE',
    fase: 'Fase Evaluacion',
    orden: 4,
    rapOrders: [6]
  }
];

export async function replaceModuleRapLinks(client, moduleId, rapIds) {
  await client.query('DELETE FROM modulo_rap WHERE modulo_id = $1', [moduleId]);
  let orden = 1;
  for (const rapId of rapIds) {
    await client.query(
      `INSERT INTO modulo_rap (modulo_id, rap_id, orden)
       VALUES ($1, $2, $3)
       ON CONFLICT (modulo_id, rap_id) DO UPDATE SET orden = EXCLUDED.orden`,
      [moduleId, rapId, orden++]
    );
  }
}

export async function initializeDatabaseSchema() {
  try {
    const check = await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'fases'`);
    if (check.rows.length === 0) {
      console.log('⚡ Base de datos vacía. Inicializando esquemas desde database_schema.sql...');
      const schemaPath = path.join(process.cwd(), 'database_schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(sql);
        console.log('✅ Esquema de base de datos cargado exitosamente desde database_schema.sql');
      } else {
        console.warn('⚠️ No se encontró database_schema.sql en la raíz.');
      }
    }
  } catch (err) {
    console.error('Error initializing DB schema:', err.message);
  }
}

export async function seedDefaultAcademicContent() {
  try {
    // 1. Seed Fases if empty
    const fasesCheck = await pool.query('SELECT COUNT(*) FROM fases');
    if (parseInt(fasesCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO fases (nombre, descripcion, orden) VALUES
        ('Análisis', 'Fase de análisis del programa de formación.', 1),
        ('Planeación', 'Fase de planeación del programa de formación.', 2),
        ('Ejecución', 'Fase de ejecución del programa de formación.', 3),
        ('Evaluación', 'Fase de evaluación del programa de formación.', 4)
        ON CONFLICT (orden) DO NOTHING;
      `);
    }

    // 2. Seed Momentos if empty
    const momentosCheck = await pool.query('SELECT COUNT(*) FROM momentos');
    if (parseInt(momentosCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO momentos (codigo, nombre, descripcion, orden) VALUES
        ('PREPARACION', 'Preparación', 'Introducción, objetivos y activación de conocimientos previos.', 1),
        ('ABSORCION', 'Absorción del conocimiento', 'Presentación y explicación de nuevos conocimientos.', 2),
        ('PRACTICA', 'Práctica y aplicación', 'Aplicación práctica de los conocimientos adquiridos.', 3),
        ('CIERRE', 'Cierre', 'Evaluación, consolidación y cierre del aprendizaje.', 4)
        ON CONFLICT (codigo) DO NOTHING;
      `);
    }

    // 3. Ensure Default Program exists
    let programRes = await pool.query('SELECT id FROM programas ORDER BY id LIMIT 1');
    let programId;
    if (programRes.rows.length === 0) {
      const newProg = await pool.query(
        `INSERT INTO programas (nombre, descripcion, activo) VALUES ($1, $2, $3) RETURNING id`,
        ['Enfermería - Inglés Técnico', 'Programa de formación en inglés técnico para enfermería.', true]
      );
      programId = newProg.rows[0].id;
    } else {
      programId = programRes.rows[0].id;
    }

    // 4. Ensure Fases mapping IDs exist
    const fasesRes = await pool.query('SELECT id, orden FROM fases ORDER BY orden ASC');
    const faseIdMap = {};
    fasesRes.rows.forEach(f => { faseIdMap[f.orden] = f.id; });

    // 5. Ensure RAPs exist for Program
    const rapIdsByOrder = {};
    for (let index = 0; index < defaultRapTitles.length; index += 1) {
      const orden = index + 1;
      const existingRap = await pool.query(
        'SELECT id FROM raps WHERE programa_id = $1 AND orden = $2',
        [programId, orden]
      );

      if (existingRap.rows.length) {
        rapIdsByOrder[orden] = existingRap.rows[0].id;
      } else {
        const createdRap = await pool.query(
          'INSERT INTO raps (programa_id, titulo, orden) VALUES ($1, $2, $3) RETURNING id',
          [programId, defaultRapTitles[index], orden]
        );
        rapIdsByOrder[orden] = createdRap.rows[0].id;
      }
    }

    // 6. Ensure RAP_MOMENTOS exist for each RAP
    const momentosRes = await pool.query('SELECT id, orden FROM momentos ORDER BY orden ASC');
    for (const rapOrder in rapIdsByOrder) {
      const rapId = rapIdsByOrder[rapOrder];
      for (const m of momentosRes.rows) {
        await pool.query(
          `INSERT INTO rap_momentos (rap_id, momento_id, orden)
           VALUES ($1, $2, $3)
           ON CONFLICT (rap_id, momento_id) DO NOTHING`,
          [rapId, m.id, m.orden]
        );
      }
    }

    // 7. Ensure Modulos exist and link via modulo_rap
    for (const moduleDef of defaultModules) {
      const rapIds = moduleDef.rapOrders.map((order) => rapIdsByOrder[order]).filter(Boolean);
      if (!rapIds.length) continue;

      const faseId = faseIdMap[moduleDef.orden] || faseIdMap[1] || 1;

      const existingModule = await pool.query(
        `SELECT id FROM modulos WHERE programa_id = $1 AND orden = $2`,
        [programId, moduleDef.orden]
      );

      let moduleId;
      if (existingModule.rows.length) {
        moduleId = existingModule.rows[0].id;
        await pool.query(
          'UPDATE modulos SET titulo = $1, fase_id = $2 WHERE id = $3',
          [moduleDef.titulo, faseId, moduleId]
        );
      } else {
        const createdModule = await pool.query(
          'INSERT INTO modulos (programa_id, fase_id, titulo, orden) VALUES ($1, $2, $3, $4) RETURNING id',
          [programId, faseId, moduleDef.titulo, moduleDef.orden]
        );
        moduleId = createdModule.rows[0].id;
      }

      await replaceModuleRapLinks(pool, moduleId, rapIds);
    }

    // 8. Ensure Default Ficha exists
    let fichaRes = await pool.query('SELECT id FROM fichas WHERE programa_id = $1 LIMIT 1', [programId]);
    let fichaId;
    if (fichaRes.rows.length === 0) {
      const newFicha = await pool.query(
        `INSERT INTO fichas (programa_id, numero_ficha, nombre, fecha_inicio, fecha_fin, activo)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [programId, '2891234', 'Cohorte Enfermería 2026', '2026-01-01', '2026-12-31', true]
      );
      fichaId = newFicha.rows[0].id;
    } else {
      fichaId = fichaRes.rows[0].id;
    }

    // 9. Usuarios de demostración con contraseña conocida.
    // Solo se crean si SEED_DEMO_USERS=true. Nunca deben existir en producción.
    if (process.env.SEED_DEMO_USERS !== 'true') {
      console.log('ℹ️  Usuarios de demostración omitidos (SEED_DEMO_USERS no está en true).');
    } else {
    const adminUser = await pool.query("SELECT id FROM usuarios WHERE correo = 'admin@sena.edu.co'");
    if (adminUser.rows.length === 0) {
      const hash = await bcrypt.hash('1234', 10);
      await pool.query(
        `INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo) VALUES ($1, $2, $3, 'admin', true)`,
        ['Administrador Sistema', 'admin@sena.edu.co', hash]
      );
    }

    let instructorId;
    const instUser = await pool.query("SELECT id FROM usuarios WHERE correo = 'instructor@sena.edu.co'");
    if (instUser.rows.length === 0) {
      const hash = await bcrypt.hash('1234', 10);
      const newInst = await pool.query(
        `INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo) VALUES ($1, $2, $3, 'instructor', true) RETURNING id`,
        ['Instructor Enfermería', 'instructor@sena.edu.co', hash]
      );
      instructorId = newInst.rows[0].id;
    } else {
      instructorId = instUser.rows[0].id;
    }
    await pool.query(
      `INSERT INTO instructor_ficha (instructor_id, ficha_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [instructorId, fichaId]
    );

    // Aprendices demo para soportar pruebas con múltiples usuarios
    const aprendicesDemo = [
      { nombre: 'Carlos Gómez (Aprendiz 1)', correo: 'aprendiz@sena.edu.co' },
      { nombre: 'María Rodríguez (Aprendiz 2)', correo: 'aprendiz2@sena.edu.co' },
      { nombre: 'Juan Pérez (Aprendiz 3)', correo: 'aprendiz3@sena.edu.co' }
    ];

    for (const apr of aprendicesDemo) {
      let aprId;
      const aprUser = await pool.query('SELECT id FROM usuarios WHERE correo = $1', [apr.correo]);
      if (aprUser.rows.length === 0) {
        const hash = await bcrypt.hash('1234', 10);
        const newApr = await pool.query(
          `INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo) VALUES ($1, $2, $3, 'aprendiz', true) RETURNING id`,
          [apr.nombre, apr.correo, hash]
        );
        aprId = newApr.rows[0].id;
      } else {
        aprId = aprUser.rows[0].id;
      }
      await pool.query(
        `INSERT INTO aprendiz_ficha (aprendiz_id, ficha_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [aprId, fichaId]
      );
      await materializarProgreso(pool, aprId, fichaId);
    }
    }

    // 10. Seed specialized 4-moment activities for each RAP (1 to 6)
    await seedRapActivities(pool, fichaId);
    await publishInteractiveGames(pool);

    console.log('✅ Base académica por defecto lista (Programas, Fases, Módulos, RAPs, Momentos y Ficha).');
  } catch (err) {
    console.error('Error seeding academic content:', err);
  }
}

async function seedRapActivities(pool, fichaId) {
  try {
    // El autor de las actividades sembradas ya no es el usuario 1 fijo: se resuelve
    // contra un administrador o instructor real. Sin autor, no se siembra nada.
    const creadorRes = await pool.query(
      `SELECT id FROM usuarios
       WHERE rol::text IN ('admin', 'administrador', 'instructor')
       ORDER BY id ASC LIMIT 1`
    );
    if (creadorRes.rows.length === 0) {
      console.log('ℹ️  Sin administrador ni instructor en la base: no se siembran actividades de ejemplo.');
      return;
    }
    const creadorId = creadorRes.rows[0].id;

    // Solo los RAP del programa al que pertenece esta ficha. Sin este filtro, un
    // segundo programa recibia actividades creadas con el ficha_id del primero.
    const rapsRes = await pool.query(
      `SELECT r.id, r.orden, r.titulo
       FROM raps r
       JOIN fichas f ON f.programa_id = r.programa_id
       WHERE f.id = $1
       ORDER BY r.orden ASC`,
      [fichaId]
    );

    const rapPayloads = {
      1: {
        theory: {
          titulo: 'Moment 1 & 2: Preparation & Knowledge Absorption (RAP 1)',
          instrucciones: 'By the end of this module, you will be able to read and understand medical charts in English, greet patients, and exchange personal information.',
          datos_json: {
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            objectives: 'By the end of this module, you will be able to read and understand medical charts in English, greet patients, and exchange personal information.',
            warmupPairs: [
              { image: "Sun", label: "Morning Sun", text: "Good morning" },
              { image: "CloudSun", label: "Afternoon Sun", text: "Good afternoon" },
              { image: "Moon", label: "Night Moon", text: "Good evening" }
            ],
            grammarPill: {
              title: "Grammar Pill: Basic Structure & Greetings",
              explanation: "Use distinct color highlights to structure your sentences in healthcare environments.",
              examples: [
                { subject: "I", verb: "am", complement: "a registered nurse." },
                { subject: "You", verb: "are", complement: "in room 302." },
                { subject: "Dr. Smith", verb: "is", complement: "the attending physician." }
              ]
            },
            vocabTopics: "Alphabet, Numbers, Phone & Emails in Healthcare",
            vocabulary: [
              { word: "Patient", phonetic: "/ˈpeɪ.ʃənt/", translation: "Paciente" },
              { word: "Nurse", phonetic: "/nɜːrs/", translation: "Enfermero/a" },
              { word: "Medical ID", phonetic: "/ˈmed.ɪ.kəl aɪ-diː/", translation: "Identificación Médica" }
            ],
            dialogues: [
              { speaker: "Nurse Sarah", role: "Nurse", text: "Good morning! My name is Nurse Sarah. What is your name?", avatar: "Nurse" },
              { speaker: "Dr. Alex", role: "Doctor", text: "Hello Sarah! I am Dr. Alex. Nice to meet you.", avatar: "Doctor" }
            ]
          }
        },
        exercise: {
          titulo: 'Moment 3: Practice & Application',
          instrucciones: 'Greet an international patient, introduce yourself by name, spell your surname, and provide your phone number.',
          datos_json: {
            storybookTitle: 'Greetings & Introductions Between Colleagues',
            idCardInstructions: 'Fill out the clinical digital form with the correct personal data.',
            idCardFields: [
              { label: "Full Name", placeholder: "e.g. John Doe", expected: "John Doe" },
              { label: "Role", placeholder: "e.g. I am a nurse", expected: "I am a nurse" },
              { label: "Phone Number", placeholder: "e.g. 555-0192", expected: "555-0192" }
            ],
            listeningInstructions: 'Listen to the audio recording and type the exact name and email being spelled out.',
            listeningAudioUrl: '',
            expectedSpelling: 'J-O-H-N N-U-R-S-E@SENA.EDU.CO',
            challengeTitle: 'Clinical Challenge: Oral Presentation',
            roleplayScenario: 'Greet an international patient, introduce yourself, spell your surname, and give your phone number.',
            maxDurationSeconds: 60
          }
        },
        quiz: {
          titulo: 'Test Your Knowledge: RAP 1',
          datos_json: {
            questions: [
              {
                question: "Which represents Subject + Verb + Complement?",
                options: ["Nurse am I", "I am a registered nurse", "Am nurse I", "Registered nurse I am"],
                correctAnswer: 1
              },
              {
                question: "What is the appropriate greeting in the morning?",
                options: ["Good night", "Good afternoon", "Good morning", "Goodbye"],
                correctAnswer: 2
              }
            ]
          }
        }
      },

      2: {
        theory: {
          titulo: 'Moment 1 & 2: Physical Description & Patient Environment (RAP 2)',
          instrucciones: 'Learn to describe patient physical status, body parts, and room environments.',
          datos_json: {
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            objectives: 'Describe patient physical status, body parts, and detail room environments.',
            warmupPairs: [
              { image: "UserCheck", label: "Patient Physical Status", text: "Right leg immobilized & casted" },
              { image: "Stethoscope", label: "Vital Signs Monitoring", text: "Pulse 74 bpm • SpO2 98%" },
              { image: "FileText", label: "Nursing Audio Notes", text: "Clinical Audio Dictation" },
              { image: "ClipboardList", label: "Shift Handover", text: "Room 204 Status Report" }
            ],
            grammarPill: {
              title: "Grammar Pill: Descriptive Adjectives & Body Parts",
              explanation: "Describing physical characteristics and room conditions.",
              examples: [
                { subject: "Mr. Thomas", verb: "is", complement: "tall and pale today." },
                { subject: "Room 204", verb: "is", complement: "quiet and cold." }
              ]
            },
            vocabTopics: "Anatomy & Room Features",
            vocabulary: [
              { word: "Head", phonetic: "/hed/", translation: "Cabeza" },
              { word: "Arm", phonetic: "/ɑːrm/", translation: "Brazo" },
              { word: "Room 204", phonetic: "/ruːm/", translation: "Habitación 204" }
            ],
            dialogues: [
              { speaker: "Nurse A", role: "Nurse On Duty", text: "How does Mr. Thomas look today?", avatar: "Nurse" },
              { speaker: "Nurse B", role: "Relieving Nurse", text: "He looks pale and tired in room 204.", avatar: "Doctor" }
            ]
          }
        },
        exercise: {
          titulo: 'Moment 3: Practice (Patient Description)',
          instrucciones: 'Complete the physical status description form and record your observations.',
          datos_json: {
            storybookTitle: 'Patient Physical Description',
            idCardInstructions: 'Fill out physical status attributes for room 204.',
            idCardFields: [
              { label: "Patient Appearance", expected: "pale" },
              { label: "Room Temperature", expected: "cold" }
            ],
            challengeTitle: 'Clinical Challenge: Physical Status Report',
            roleplayScenario: 'Record a voice note describing Mr. Thomas physically and stating his room condition.',
            maxDurationSeconds: 60
          }
        },
        quiz: {
          titulo: 'Test Your Knowledge: RAP 2',
          datos_json: {
            questions: [
              {
                question: "Which adjective describes Mr. Thomas's appearance?",
                options: ["Pale", "Tall", "Both Pale and Tall", "Happy"],
                correctAnswer: 2
              },
              {
                question: "Where is Mr. Thomas located?",
                options: ["Room 101", "Room 204", "Waiting Room", "Cafeteria"],
                correctAnswer: 1
              }
            ]
          }
        }
      },

      3: {
        theory: {
          titulo: 'Moment 1 & 2: Clinical Handover & History Report (RAP 3)',
          instrucciones: 'Accompany Mr. Thomas during shift transfer. Learn Simple Past vs Present Tense for patient history.',
          datos_json: {
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            objectives: 'Learn Simple Past for patient history vs Present Tense for current clinical status during shift handovers.',
            warmupPairs: [
              { image: "Clock", label: "Yesterday Incident", text: "Simple Past" },
              { image: "Activity", label: "Current Status", text: "Present Tense" }
            ],
            grammarPill: {
              title: "Grammar Pill: Past Simple vs Present Status",
              explanation: "Patient History (Simple Past) vs Current Status (Present Tense).",
              examples: [
                { subject: "Patient History", verb: "fell down", complement: "at the hotel yesterday." },
                { subject: "Current Status", verb: "has", complement: "a bandage on his arm today." }
              ]
            },
            vocabTopics: "Clinical Handovers & Incidents",
            vocabulary: [
              { word: "Fracture", phonetic: "/ˈfræk.tʃər/", translation: "Fractura" },
              { word: "Bandage", phonetic: "/ˈbæn.dɪdʒ/", translation: "Vendaje" },
              { word: "Handover", phonetic: "/ˈhændˌoʊ.vɚ/", translation: "Entrega de Turno" }
            ],
            dialogues: [
              { speaker: "Nurse A", role: "Nurse On Duty", text: "What happened to Mr. Thomas yesterday?", avatar: "Nurse" },
              { speaker: "Nurse B", role: "Relieving Nurse", text: "He fell at the hotel yesterday and suffered an arm fracture.", avatar: "Doctor" }
            ]
          }
        },
        exercise: {
          titulo: 'Moment 3: Practice (Handover Report)',
          instrucciones: 'Record a 1-minute voice note conducting the shift handover report for Mr. Thomas.',
          datos_json: {
            storybookTitle: 'Shift Handover & Patient Transfer (Mr. Thomas)',
            idCardInstructions: 'Nursing Notes Form: Mr. Thomas',
            idCardFields: [
              { label: "Injury", expected: "fracture" },
              { label: "Time", expected: "yesterday" },
              { label: "Location", expected: "waiting room" }
            ],
            challengeTitle: 'Clinical Challenge: Handover Report',
            roleplayScenario: 'Record a voice note (max 1 min) describing Mr. Thomas, his room location, and what occurred yesterday in past simple.',
            maxDurationSeconds: 60
          }
        },
        quiz: {
          titulo: 'Test Your Knowledge: RAP 3',
          datos_json: {
            questions: [
              {
                question: "What happened to Mr. Thomas yesterday?",
                options: ["He fell at the hotel", "He went on vacation", "He started working", "He traveled abroad"],
                correctAnswer: 0
              },
              {
                question: "Which sentence correctly describes his current status?",
                options: ["He fell yesterday", "He is a tall, older man in room 204", "He had an accident", "He went to airport"],
                correctAnswer: 1
              }
            ]
          }
        }
      },

      4: {
        theory: {
          titulo: 'Moment 1 & 2: Clinical Routines & Communication (RAP 4)',
          instrucciones: 'Learn to communicate routine nursing procedures with medical colleagues, patients, and visitors.',
          datos_json: {
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            objectives: 'Communicate daily nursing routines (Present Simple) vs actions in progress (Present Continuous).',
            warmupPairs: [
              { image: "Stethoscope", label: "Check vital signs", text: "Daily Routine" },
              { image: "Pill", label: "Give medication", text: "Medical Action" }
            ],
            grammarPill: {
              title: "Grammar Pill: Present Simple vs Present Continuous",
              explanation: "Daily Routines (I give medication at 8 AM) vs Actions in Progress (I am checking blood pressure).",
              examples: [
                { subject: "Daily Routine", verb: "give", complement: "medication at 8 AM daily." },
                { subject: "In Progress", verb: "am checking", complement: "the blood pressure right now." }
              ]
            },
            vocabTopics: "Clinical Instruments & Equipment",
            vocabulary: [
              { word: "Thermometer", phonetic: "/θərˈmɑː.mə.t̬ɚ/", translation: "Termómetro" },
              { word: "Stethoscope", phonetic: "/ˈsteθ.ə.skoʊp/", translation: "Estetoscopio" },
              { word: "Blood Pressure Monitor", phonetic: "/blʌd ˈpreʃ.ɚ/", translation: "Tensiómetro" }
            ],
            dialogues: [
              { speaker: "Visitor", role: "Daughter", text: "Excuse me nurse, what are you doing with my father right now?", avatar: "Visitor" },
              { speaker: "Nurse", role: "Nurse On Duty", text: "We are checking his temperature and blood pressure right now.", avatar: "Nurse" }
            ]
          }
        },
        exercise: {
          titulo: 'Moment 3: Practice (Clinical Communication)',
          instrucciones: 'Complete the clinical routine checklist and explain your actions to the visitor.',
          datos_json: {
            challengeTitle: 'Clinical Challenge: Patient Interaction',
            roleplayScenario: 'Greet the visitor and explain what routine procedure you are executing right now in present continuous.',
            maxDurationSeconds: 60
          }
        },
        quiz: {
          titulo: 'Test Your Knowledge: RAP 4',
          datos_json: {
            questions: [
              {
                question: "Which sentence describes an action happening RIGHT NOW?",
                options: ["I give medication at 8 AM", "I am checking the blood pressure right now", "I checked vital signs yesterday", "Nurses check charts"],
                correctAnswer: 1
              },
              {
                question: "Which tool measures blood pressure?",
                options: ["Thermometer", "Blood Pressure Monitor", "Stethoscope", "Syringe"],
                correctAnswer: 1
              }
            ]
          }
        }
      },

      5: {
        theory: {
          titulo: 'Moment 1 & 2: Proposing Workplace Improvements (RAP 5)',
          instrucciones: 'Learn courtesy formulas and polite structures to suggest clinical workflow improvements.',
          datos_json: {
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            objectives: 'Propose workplace improvements and suggest updates to nursing checklists using polite formulas.',
            warmupPairs: [
              { image: "Sparkles", label: "Propose Improvement", text: "We should..." },
              { image: "ClipboardList", label: "Update Checklist", text: "Workflow Optimization" }
            ],
            grammarPill: {
              title: "Grammar Pill: Courtesy Formulas for Proposals",
              explanation: "Use 'We should...', 'I think we should...', and 'Let's...' to suggest improvements politely.",
              examples: [
                { subject: "Proposal", verb: "should update", complement: "the vital signs checklist format." },
                { subject: "Suggestion", verb: "should streamline", complement: "our shift handovers." }
              ]
            },
            vocabTopics: "Workplace & Quality Terms",
            vocabulary: [
              { word: "Improvement", phonetic: "/ɪmˈpruːv.mənt/", translation: "Mejora" },
              { word: "Checklist", phonetic: "/ˈtʃek.lɪst/", translation: "Lista de Chequeo" },
              { word: "Workflow", phonetic: "/ˈwɝːk.floʊ/", translation: "Flujo de Trabajo" }
            ],
            dialogues: [
              { speaker: "Nurse Manager", role: "Supervisor", text: "Good morning! How is the new checklist working?", avatar: "Supervisor" },
              { speaker: "Nurse", role: "Nurse On Duty", text: "Good morning! I think we should update the vital signs format to streamline handovers.", avatar: "Nurse" }
            ]
          }
        },
        exercise: {
          titulo: 'Moment 3: Practice (Workplace Proposals)',
          instrucciones: 'Formulate a polite workflow proposal to your nursing supervisor.',
          datos_json: {
            challengeTitle: 'Clinical Challenge: Propose Improvement',
            roleplayScenario: 'Record a voice note proposing a workflow improvement using "We should..." or "I think we should...".',
            maxDurationSeconds: 60
          }
        },
        quiz: {
          titulo: 'Test Your Knowledge: RAP 5',
          datos_json: {
            questions: [
              {
                question: "Which phrase is used to politely propose a clinical improvement?",
                options: ["You must stop working", "I think we should update the checklist format", "I don't care about handovers", "Do it without asking"],
                correctAnswer: 1
              },
              {
                question: "What modal verb is commonly used for suggestions?",
                options: ["Should", "Fell", "Was", "Am"],
                correctAnswer: 0
              }
            ]
          }
        }
      },

      6: {
        theory: {
          titulo: 'Moment 1 & 2: Hospital Discharge & Care Evaluation (RAP 6)',
          instrucciones: 'Learn to deliver medical discharge instructions, home care recommendations, and evaluate clinical checklist outcomes.',
          datos_json: {
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            objectives: 'Mr. Thomas is going home! Learn to deliver medical discharge instructions, home care recommendations, and evaluate completed checklists.',
            warmupPairs: [
              { image: "CheckSquare", label: "Vital signs stable", text: "Checklist Approved" },
              { image: "Pill", label: "Pain resolved", text: "Ready for Discharge" }
            ],
            grammarPill: {
              title: "Grammar Pill: Modal Verbs & Reporting Results",
              explanation: "Medical Advice (You should/must...) vs Reporting Results (The temperature is normal).",
              examples: [
                { subject: "Medical Advice", verb: "must take", complement: "this medication every 8 hours." },
                { subject: "Reporting Results", verb: "are", complement: "stable and checklist is complete." }
              ]
            },
            vocabTopics: "Discharge Terms & Care Summary",
            vocabulary: [
              { word: "Discharge", phonetic: "/ˈdɪs.tʃɑːrdʒ/", translation: "Alta Médica" },
              { word: "Prescription", phonetic: "/prɪˈskrɪp.ʃən/", translation: "Receta Médica" },
              { word: "Painkiller", phonetic: "/ˈpeɪnˌkɪl.ɚ/", translation: "Analgésico" }
            ],
            dialogues: [
              { speaker: "Nurse", role: "Nurse On Duty", text: "Mr. Thomas, you must take this medication every 8 hours at home.", avatar: "Nurse" },
              { speaker: "Head Nurse", role: "Supervisor", text: "The vital signs are stable and the checklist is complete. Ready for discharge!", avatar: "Supervisor" }
            ]
          }
        },
        exercise: {
          titulo: 'Moment 3: Discharge Practice (Care Evaluator)',
          instrucciones: 'Record your 2 final medical discharge recommendations for Mr. Thomas.',
          datos_json: {
            challengeTitle: 'Clinical Challenge: Hospital Discharge',
            roleplayScenario: '1. Deliver 2 discharge recommendations to Mr. Thomas using modal verbs (should/must). 2. Confirm that the checklist analysis is complete.',
            maxDurationSeconds: 60
          }
        },
        quiz: {
          titulo: 'Test Your Knowledge: RAP 6',
          datos_json: {
            questions: [
              {
                question: "Which modal verb expresses strong medical instruction?",
                options: ["You must take this medication", "You might look at it", "You could fall", "You were here"],
                correctAnswer: 0
              },
              {
                question: "What term refers to medical release from the clinic?",
                options: ["Admission", "Discharge", "Emergency", "Stretcher"],
                correctAnswer: 1
              }
            ]
          }
        }
      }
    };

    for (const r of rapsRes.rows) {
      const payload = rapPayloads[r.orden] || rapPayloads[1];

      // Fetch rap_momentos for this RAP
      const rmRes = await pool.query('SELECT id, momento_id FROM rap_momentos WHERE rap_id = $1 ORDER BY orden ASC', [r.id]);
      if (!rmRes.rows.length) continue;

      const rmMap = {};
      rmRes.rows.forEach(row => { rmMap[row.momento_id] = row.id; });

      // Qué momentos de este RAP ya tienen algo. El sembrado rellena SOLO los
      // huecos: nunca modifica ni borra lo existente, que es la fuente de verdad
      // del instructor. Así una base a la que le falte un momento —por ejemplo
      // porque el arranque destructivo antiguo se llevó el Momento 3— lo recupera
      // sin tocar el resto.
      const ocupadosRes = await pool.query(
        `SELECT rma.rap_momento_id AS id
           FROM rap_momento_actividades rma
           JOIN rap_momentos rm ON rm.id = rma.rap_momento_id
          WHERE rm.rap_id = $1
          UNION
         SELECT rmc.rap_momento_id AS id
           FROM rap_momento_contenidos rmc
           JOIN rap_momentos rm ON rm.id = rmc.rap_momento_id
          WHERE rm.rap_id = $1`,
        [r.id]
      );
      const ocupados = new Set(ocupadosRes.rows.map((x) => x.id));
      const libre = (momentoId) => rmMap[momentoId] && !ocupados.has(rmMap[momentoId]);

      if (!libre(1) && !libre(2) && !libre(3) && !libre(4)) {
        continue;
      } else {
        // El material de estudio es CONTENIDO, no actividad: se visualiza y no
        // genera progreso (capítulo 1.3 del análisis funcional).
        const contTeoria = libre(1) ? await pool.query(
          `INSERT INTO contenidos (ficha_id, titulo, cuerpo_texto, datos_json, creado_por)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [fichaId, payload.theory.titulo, payload.theory.instrucciones, JSON.stringify(payload.theory.datos_json), creadorId]
        ) : null;
        for (const momento of [1]) {
          if (contTeoria && libre(momento)) {
            await pool.query(
              `INSERT INTO rap_momento_contenidos (rap_momento_id, contenido_id, ficha_id, orden) VALUES ($1, $2, $3, 1) ON CONFLICT DO NOTHING`,
              [rmMap[momento], contTeoria.rows[0].id, fichaId]
            );
          }
        }

        // Ejercicio de práctica: va al Momento 2 (Absorción del conocimiento),
        // que es el que cumple la función de práctica de respuesta corta.
        const actEj = libre(2) ? await pool.query(
          `INSERT INTO actividades (ficha_id, tipo, titulo, instrucciones, obligatoria, datos_json, creado_por)
           VALUES ($1, 'formulario', $2, $3, true, $4, $5) RETURNING id`,
          [fichaId, payload.exercise.titulo, payload.exercise.instrucciones, JSON.stringify(payload.exercise.datos_json), creadorId]
        ) : null;
        if (actEj) {
          await pool.query(
            `INSERT INTO rap_momento_actividades (rap_momento_id, actividad_id, ficha_id, orden) VALUES ($1, $2, $3, 1) ON CONFLICT DO NOTHING`,
            [rmMap[2], actEj.rows[0].id, fichaId]
          );
        }

        // Insert Quiz Evaluation (Momento 4)
        const actQuiz = libre(4) ? await pool.query(
          `INSERT INTO actividades (ficha_id, tipo, titulo, instrucciones, obligatoria, datos_json, creado_por)
           VALUES ($1, 'quiz', $2, 'Cuestionario final de evaluación.', true, $3, $4) RETURNING id`,
          [fichaId, payload.quiz.titulo, JSON.stringify(payload.quiz.datos_json), creadorId]
        ) : null;
        if (actQuiz) {
          await pool.query(
            `INSERT INTO rap_momento_actividades (rap_momento_id, actividad_id, ficha_id, orden) VALUES ($1, $2, $3, 1) ON CONFLICT DO NOTHING`,
            [rmMap[4], actQuiz.rows[0].id, fichaId]
          );
        }
      }
    }
  } catch (err) {
    console.error('Error seeding rap activities:', err);
  }
}

export async function runFunctionalMigration() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS intentos_actividad (
        id SERIAL PRIMARY KEY,
        actividad_id INT NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
        aprendiz_id INT NOT NULL REFERENCES usuarios(id),
        numero_intento INT NOT NULL DEFAULT 1,
        estado VARCHAR(50) NOT NULL DEFAULT 'no_iniciada',
        respuestas_json JSONB,
        calificacion NUMERIC(5,2),
        fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
        fecha_fin TIMESTAMPTZ,
        duracion_segundos INT,
        url_archivo_entrega VARCHAR(500),
        retroalimentacion TEXT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS calificacion_oficial_actividad (
        actividad_id INT NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
        aprendiz_id INT NOT NULL REFERENCES usuarios(id),
        mejor_calificacion NUMERIC(5,2) NOT NULL DEFAULT 0,
        intento_id INT REFERENCES intentos_actividad(id),
        estado VARCHAR(50) NOT NULL DEFAULT 'no_iniciada',
        fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (actividad_id, aprendiz_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS progreso_rap_aprendiz (
        rap_id INT NOT NULL REFERENCES raps(id) ON DELETE CASCADE,
        aprendiz_id INT NOT NULL REFERENCES usuarios(id),
        estado VARCHAR(50) NOT NULL DEFAULT 'bloqueado',
        porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0,
        actividades_completadas INT NOT NULL DEFAULT 0,
        actividades_totales INT NOT NULL DEFAULT 0,
        fecha_inicio TIMESTAMPTZ,
        fecha_completado TIMESTAMPTZ,
        PRIMARY KEY (rap_id, aprendiz_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS progreso_modulo_aprendiz (
        modulo_id INT NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
        aprendiz_id INT NOT NULL REFERENCES usuarios(id),
        estado VARCHAR(50) NOT NULL DEFAULT 'bloqueado',
        porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0,
        raps_completados INT NOT NULL DEFAULT 0,
        raps_totales INT NOT NULL DEFAULT 0,
        fecha_inicio TIMESTAMPTZ,
        fecha_completado TIMESTAMPTZ,
        PRIMARY KEY (modulo_id, aprendiz_id)
      )
    `);

    // NO borrar datos aquí. El arranque solo crea estructuras que falten.
    // (Antes se eliminaban en cada arranque las actividades del Momento 3, lo que
    // arrastraba por cascada los intentos y las calificaciones oficiales de los aprendices.)

    console.log('✅ Migración funcional completada: jerarquía MÓDULO→RAP→ACTIVIDADES lista.');
  } catch (err) {
    console.error('❌ Error en migración funcional:', err.message);
  }
}
