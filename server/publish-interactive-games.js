import pool from './db.js';
import { materializarProgreso } from './services/access.service.js';
import { recalcularRaps } from './services/progress.service.js';
import { pathToFileURL } from 'url';

const rapGames = {
  1: [
    {
      momento: 2,
      tipo: 'quiz',
      titulo: 'Nurse Introduction Challenge',
      instrucciones: 'Choose the best professional introduction for an international patient.',
      datos: {
        gameType: 'quiz',
        title: 'Nurse Introduction Challenge',
        questions: [
          {
            question: 'Which phrase is the best professional self-introduction?',
            options: ['Hey, I am busy.', 'Good morning, I am Nurse Sarah.', 'What do you want?', 'I doctor Sarah.'],
            correctAnswer: 1
          },
          {
            question: 'What information should a nurse share first?',
            options: ['Name and role', 'Home address', 'Salary', 'Personal password'],
            correctAnswer: 0
          },
          {
            question: 'Which sentence follows Subject + Verb + Complement?',
            options: ['Nurse I am', 'I am your nurse', 'Your nurse am I', 'Am I nurse your'],
            correctAnswer: 1
          }
        ]
      }
    },
    {
      momento: 3,
      tipo: 'otro',
      titulo: 'Nursing Memory Game',
      instrucciones: 'Flip the cards and match each English nursing word with its Spanish equivalent.',
      datos: {
        gameType: 'memory',
        pairs: [
          { label: 'Nurse', text: 'Enfermera' },
          { label: 'Patient', text: 'Paciente' },
          { label: 'Doctor', text: 'Medico' },
          { label: 'Hospital', text: 'Hospital' },
          { label: 'Medicine', text: 'Medicina' }
        ]
      }
    },
    {
      momento: 4,
      tipo: 'quiz',
      titulo: 'Test Your Knowledge: RAP 1',
      instrucciones: 'Final check about greetings and basic sentence structure.',
      datos: {
        gameType: 'quiz',
        questions: [
          {
            question: 'Which sentence is correct?',
            options: ['I am a registered nurse.', 'Nurse registered I am.', 'Am registered nurse I.', 'A nurse I registered am.'],
            correctAnswer: 0
          },
          {
            question: 'What greeting is used in the morning?',
            options: ['Good night', 'Good morning', 'Goodbye', 'See you'],
            correctAnswer: 1
          }
        ]
      }
    }
  ],
  2: [
    {
      momento: 2,
      tipo: 'quiz',
      titulo: 'Patient Physical Status Quiz',
      instrucciones: 'Analyze Mr. Thomas and identify physical status and room details.',
      datos: {
        gameType: 'quiz',
        questions: [
          {
            question: 'Mr. Thomas looks pale. What does pale describe?',
            options: ['Skin color or appearance', 'Room number', 'Medication name', 'Shift schedule'],
            correctAnswer: 0
          },
          {
            question: 'Which sentence describes location?',
            options: ['He has a fever.', 'He is in room 204.', 'He looks tired.', 'He is pale.'],
            correctAnswer: 1
          }
        ]
      }
    },
    {
      momento: 3,
      tipo: 'otro',
      titulo: 'Patient Physical Status Match',
      instrucciones: 'Match each clinical symptom with its meaning.',
      datos: {
        gameType: 'matching',
        pairs: [
          { label: 'Pale Skin', text: 'Skin appears lighter than usual' },
          { label: 'High Fever', text: 'Body temperature is above normal' },
          { label: 'Shortness of Breath', text: 'Difficulty breathing' },
          { label: 'Cold Extremities', text: 'Hands or feet feel unusually cold' }
        ]
      }
    },
    {
      momento: 4,
      tipo: 'quiz',
      titulo: 'Test Your Knowledge: RAP 2',
      instrucciones: 'Final check about patient description and location.',
      datos: {
        gameType: 'quiz',
        questions: [
          {
            question: 'Which phrase describes a patient?',
            options: ['Room 204 is cold.', 'Mr. Thomas is pale and tired.', 'The chair is blue.', 'The chart is on the desk.'],
            correctAnswer: 1
          },
          {
            question: 'Which preposition is correct?',
            options: ['Mr. Thomas is at room 204.', 'Mr. Thomas is in room 204.', 'Mr. Thomas is on room 204.', 'Mr. Thomas is to room 204.'],
            correctAnswer: 1
          }
        ]
      }
    }
  ],
  3: [
    {
      momento: 2,
      tipo: 'quiz',
      titulo: 'Shift Handover & Patient Transfer Quiz',
      instrucciones: 'Review verbal shift handover information.',
      datos: {
        gameType: 'quiz',
        questions: [
          {
            question: 'What is a shift handover?',
            options: ['A meal plan', 'A verbal transfer of patient information', 'A discharge bill', 'A visitor record'],
            correctAnswer: 1
          },
          {
            question: 'Which information belongs in a handover?',
            options: ['Patient status and recent events', 'Nurse favorite music', 'Cafeteria menu', 'Parking rules'],
            correctAnswer: 0
          }
        ]
      }
    },
    {
      momento: 3,
      tipo: 'drag_drop',
      titulo: 'Shift Handover Drag & Drop',
      instrucciones: 'Place each handover component in its clinical category.',
      datos: {
        gameType: 'drag_drop',
        pairs: [
          { draggable: 'Patient identity', dropzone: 'Name, age, and room' },
          { draggable: 'Current status', dropzone: 'Vital signs and symptoms now' },
          { draggable: 'Past event', dropzone: 'What happened before this shift' },
          { draggable: 'Pending task', dropzone: 'What the next nurse must do' }
        ]
      }
    },
    {
      momento: 4,
      tipo: 'quiz',
      titulo: 'Test Your Knowledge: RAP 3',
      instrucciones: 'Final check about transfer reports and past events.',
      datos: {
        gameType: 'quiz',
        questions: [
          {
            question: 'Which sentence uses past simple?',
            options: ['He falls yesterday.', 'He fell yesterday.', 'He is falling yesterday.', 'He fall yesterday.'],
            correctAnswer: 1
          },
          {
            question: 'What should be transferred during handover?',
            options: ['Relevant patient information', 'Only the nurse name', 'Only the room color', 'No information'],
            correctAnswer: 0
          }
        ]
      }
    }
  ],
  4: [
    {
      momento: 2,
      tipo: 'quiz',
      titulo: 'Clinical Routine & Communication Quiz',
      instrucciones: 'Identify actions happening now in clinical routines.',
      datos: {
        gameType: 'quiz',
        questions: [
          {
            question: 'Which sentence is present continuous?',
            options: ['I check vital signs every morning.', 'I am checking blood pressure now.', 'I checked blood pressure yesterday.', 'I will check later.'],
            correctAnswer: 1
          },
          {
            question: 'What is the nurse doing?',
            options: ['She is taking blood pressure.', 'She took blood pressure yesterday.', 'She takes it every week.', 'She will take it tomorrow.'],
            correctAnswer: 0
          }
        ]
      }
    },
    {
      momento: 3,
      tipo: 'listening',
      titulo: 'Clinical Listening Challenge',
      instrucciones: 'Listen to the blood pressure procedure and answer the questions.',
      datos: {
        gameType: 'listening',
        audioText: 'Good morning. I am checking your blood pressure now. Please relax your arm and breathe normally.',
        questions: [
          {
            question: 'What is the nurse checking?',
            options: ['Blood pressure', 'Temperature', 'Weight', 'Vision'],
            audioText: 'I am checking your blood pressure now.',
            correctAnswer: 0
          },
          {
            question: 'What should the patient relax?',
            options: ['The arm', 'The foot', 'The back', 'The neck'],
            audioText: 'Please relax your arm and breathe normally.',
            correctAnswer: 0
          }
        ]
      }
    },
    {
      momento: 4,
      tipo: 'quiz',
      titulo: 'Test Your Knowledge: RAP 4',
      instrucciones: 'Final check about vital signs and medical instruments.',
      datos: {
        gameType: 'quiz',
        questions: [
          {
            question: 'Which instrument measures temperature?',
            options: ['Thermometer', 'Stethoscope', 'Syringe', 'Bandage'],
            correctAnswer: 0
          },
          {
            question: 'Which instrument listens to heart and lung sounds?',
            options: ['Thermometer', 'Stethoscope', 'Gloves', 'Mask'],
            correctAnswer: 1
          }
        ]
      }
    }
  ],
  5: [
    {
      momento: 2,
      tipo: 'quiz',
      titulo: 'Workplace Improvement Proposals Quiz',
      instrucciones: 'Practice modal verbs for clinical improvement proposals.',
      datos: {
        gameType: 'quiz',
        questions: [
          {
            question: 'Which phrase is a polite suggestion?',
            options: ['We should update the checklist.', 'You are wrong.', 'Stop working.', 'Never report changes.'],
            correctAnswer: 0
          },
          {
            question: 'Which modal expresses obligation?',
            options: ['Must', 'Was', 'Fell', 'Did'],
            correctAnswer: 0
          }
        ]
      }
    },
    {
      momento: 3,
      tipo: 'spelling',
      titulo: 'Medical Terminology Spelling',
      instrucciones: 'Listen and spell medical terms correctly.',
      datos: {
        gameType: 'spelling',
        terms: [
          { term: 'Stethoscope', hint: 'Instrument used to listen to heart and lung sounds' },
          { term: 'Thermometer', hint: 'Instrument used to measure body temperature' },
          { term: 'Syringe', hint: 'Device used to inject fluids or withdraw blood' },
          { term: 'Prescription', hint: 'Written medical order for medication' }
        ]
      }
    },
    {
      momento: 4,
      tipo: 'quiz',
      titulo: 'Test Your Knowledge: RAP 5',
      instrucciones: 'Final check about advanced vocabulary and suggestions.',
      datos: {
        gameType: 'quiz',
        questions: [
          {
            question: 'Which term means a list used to verify tasks?',
            options: ['Checklist', 'Painkiller', 'Discharge', 'Fracture'],
            correctAnswer: 0
          },
          {
            question: 'Which sentence proposes an improvement?',
            options: ['We should streamline handovers.', 'He fell yesterday.', 'The room is cold.', 'I am checking blood pressure.'],
            correctAnswer: 0
          }
        ]
      }
    }
  ],
  6: [
    {
      momento: 2,
      tipo: 'quiz',
      titulo: 'Hospital Discharge Instructions Quiz',
      instrucciones: 'Review patient discharge instructions.',
      datos: {
        gameType: 'quiz',
        questions: [
          {
            question: 'Which sentence gives discharge advice?',
            options: ['You must take this medication every 8 hours.', 'You fell yesterday.', 'The room is cold.', 'I am Nurse Sarah.'],
            correctAnswer: 0
          },
          {
            question: 'What does discharge mean?',
            options: ['Medical release from care', 'New admission', 'Emergency alarm', 'Blood pressure'],
            correctAnswer: 0
          }
        ]
      }
    },
    {
      momento: 3,
      tipo: 'otro',
      titulo: 'Emergency Room Simulator',
      instrucciones: 'Make sequential nursing decisions for Thomas Miller in the emergency room.',
      datos: {
        gameType: 'emergency_simulator',
        patient: {
          name: 'Thomas Miller',
          age: 45,
          symptoms: ['High fever', 'Confusion', 'Shortness of breath'],
          vitalSigns: { BP: '140/90 mmHg', HR: '110 bpm', RR: '24 bpm', Temp: '39.1 C' },
          context: 'Critical patient admitted to emergency triage with acute symptoms.'
        },
        actions: [
          {
            id: 'vitals',
            label: 'Check vital signs and assess consciousness level',
            consequence: 'Vitals recorded. Patient is alert but disoriented.',
            impact: { stability: 12, urgency: -6 }
          },
          {
            id: 'history',
            label: 'Ask about symptoms and allergy history',
            consequence: 'Patient confirms severe headache for 6 hours. No drug allergies reported.',
            impact: { stability: 8, urgency: -4 }
          },
          {
            id: 'doctor',
            label: 'Notify the attending physician immediately',
            consequence: 'Physician notified. Emergency protocol initiated.',
            impact: { stability: 14, urgency: -10 }
          },
          {
            id: 'chart',
            label: 'Record all information in the nursing chart',
            consequence: 'Clinical documentation updated in real time.',
            impact: { stability: 6, urgency: -3 }
          }
        ]
      }
    },
    {
      momento: 4,
      tipo: 'quiz',
      titulo: 'Test Your Knowledge: RAP 6',
      instrucciones: 'Final check about emergency procedures and discharge.',
      datos: {
        gameType: 'quiz',
        questions: [
          {
            question: 'What should a nurse do first in an emergency?',
            options: ['Assess the patient and vital signs', 'Ignore symptoms', 'Send the patient home', 'Erase the chart'],
            correctAnswer: 0
          },
          {
            question: 'Which sentence is a strong medical instruction?',
            options: ['You must take this medication.', 'You maybe maybe rest.', 'You was take medicine.', 'You fell yesterday.'],
            correctAnswer: 0
          }
        ]
      }
    }
  ]
};

async function getCreatorId(db) {
  const existing = await db.query(
    `SELECT id FROM usuarios
     WHERE rol::text IN ('admin', 'administrador', 'instructor')
     ORDER BY id ASC LIMIT 1`
  );
  if (existing.rows.length) return existing.rows[0].id;

  const created = await db.query(
    `INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo)
     VALUES ('Instructor Demo', 'instructor.demo@skylang.local', '$2a$10$abcdefghijklmnopqrstuu', 'instructor', true)
     RETURNING id`
  );
  return created.rows[0].id;
}

async function publishGame(db, { fichaId, rapId, game, creatorId }) {
  const rm = await db.query(
    `SELECT id FROM rap_momentos WHERE rap_id = $1 AND orden = $2 LIMIT 1`,
    [rapId, game.momento]
  );
  if (!rm.rows.length) return null;
  const rapMomentoId = rm.rows[0].id;

  await db.query(
    `DELETE FROM rap_momento_actividades rma
      USING actividades a
      WHERE rma.actividad_id = a.id
        AND rma.rap_momento_id = $1
        AND a.ficha_id = $2`,
    [rapMomentoId, fichaId]
  );

  const existing = await db.query(
    `SELECT id FROM actividades WHERE ficha_id = $1 AND titulo = $2 LIMIT 1`,
    [fichaId, game.titulo]
  );

  let activityId;
  if (existing.rows.length) {
    activityId = existing.rows[0].id;
    await db.query(
      `UPDATE actividades
       SET tipo = $1, instrucciones = $2, obligatoria = true, datos_json = $3::jsonb
       WHERE id = $4`,
      [game.tipo, game.instrucciones, JSON.stringify(game.datos), activityId]
    );
  } else {
    const created = await db.query(
      `INSERT INTO actividades (ficha_id, tipo, titulo, instrucciones, obligatoria, datos_json, creado_por)
       VALUES ($1, $2, $3, $4, true, $5::jsonb, $6)
       RETURNING id`,
      [fichaId, game.tipo, game.titulo, game.instrucciones, JSON.stringify(game.datos), creatorId]
    );
    activityId = created.rows[0].id;
  }

  await db.query(
    `INSERT INTO rap_momento_actividades (rap_momento_id, actividad_id, ficha_id, orden)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (rap_momento_id, actividad_id) DO NOTHING`,
    [rapMomentoId, activityId, fichaId]
  );

  return activityId;
}

async function ensureRapMomentos(db, rapId) {
  const momentos = await db.query(`SELECT id, orden FROM momentos ORDER BY orden ASC`);
  for (const momento of momentos.rows) {
    await db.query(
      `INSERT INTO rap_momentos (rap_id, momento_id, orden)
       VALUES ($1, $2, $3)
       ON CONFLICT (rap_id, momento_id) DO NOTHING`,
      [rapId, momento.id, momento.orden]
    );
  }
}

export async function publishInteractiveGames(db = pool) {
  const creatorId = await getCreatorId(db);
  const fichas = await db.query(`SELECT id, programa_id FROM fichas WHERE COALESCE(activo, true) = true ORDER BY id`);
  let published = 0;

  for (const ficha of fichas.rows) {
    const raps = await db.query(
      `SELECT id, orden FROM raps WHERE programa_id = $1 ORDER BY orden`,
      [ficha.programa_id]
    );

    const touchedRapIds = [];
    for (const rap of raps.rows) {
      const games = rapGames[rap.orden] || [];
      if (games.length) await ensureRapMomentos(db, rap.id);
      for (const game of games) {
        const activityId = await publishGame(db, {
          fichaId: ficha.id,
          rapId: rap.id,
          game,
          creatorId
        });
        if (activityId) published += 1;
      }
      if (games.length) touchedRapIds.push(rap.id);
    }

    const learners = await db.query(
      `SELECT aprendiz_id FROM aprendiz_ficha WHERE ficha_id = $1`,
      [ficha.id]
    );

    for (const learner of learners.rows) {
      await materializarProgreso(db, learner.aprendiz_id, ficha.id);
      if (touchedRapIds.length) await recalcularRaps(db, learner.aprendiz_id, touchedRapIds);
    }
  }

  console.log(`Published or updated ${published} interactive activities.`);
  return published;
}

const isCliRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCliRun) {
  publishInteractiveGames()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}
