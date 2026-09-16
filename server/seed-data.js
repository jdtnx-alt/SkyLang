import bcrypt from 'bcryptjs';
import pool from './db.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedData() {
  try {
    console.log('Iniciando semillero de datos (seeding)...');

    // 1. Encriptar contraseña por defecto ('1234')
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('1234', salt);

    // 2. Insertar usuarios
    console.log('Insertando usuarios de prueba...');
    const users = [
      { nombre: 'Dr. Sarah Johnson', correo: 'sarah.johnson@skylang.com', rol: 'instructor' },
      { nombre: 'Dr. Michael Brown', correo: 'michael.brown@skylang.com', rol: 'instructor' },
      { nombre: 'Maria Garcia', correo: 'maria.garcia@gmail.com', rol: 'aprendiz' },
      { nombre: 'John Smith', correo: 'john.smith@gmail.com', rol: 'aprendiz' },
      { nombre: 'Ana Lopez', correo: 'ana.lopez@gmail.com', rol: 'aprendiz', activo: false }
    ];

    const insertedUsers = {};
    for (const u of users) {
      const exists = await pool.query('SELECT id FROM usuarios WHERE correo = $1', [u.correo]);
      if (exists.rows.length === 0) {
        const active = u.activo !== undefined ? u.activo : true;
        const res = await pool.query(
          'INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo, ultimo_acceso) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id',
          [u.nombre, u.correo, passwordHash, u.rol, active]
        );
        insertedUsers[u.correo] = res.rows[0].id;
        console.log(`Usuario creado: ${u.nombre} (${u.rol})`);
      } else {
        insertedUsers[u.correo] = exists.rows[0].id;
        console.log(`Usuario ya existe: ${u.nombre}`);
      }
    }

    // Obtener ID del admin skyland@gmail.com para relaciones
    const adminRes = await pool.query('SELECT id FROM usuarios WHERE correo = $1', ['skyland@gmail.com']);
    const adminId = adminRes.rows.length > 0 ? adminRes.rows[0].id : null;

    // 3. Insertar programas
    console.log('Insertando programas...');
    const programas = [
      { nombre: 'Análisis y Desarrollo de Software', descripcion: 'Formación en desarrollo de software y aplicaciones web.' },
      { nombre: 'Gestión de Redes de Datos', descripcion: 'Formación en administración y diseño de infraestructuras de red.' }
    ];

    const insertedProgs = {};
    for (const p of programas) {
      const exists = await pool.query('SELECT id FROM programas WHERE nombre = $1', [p.nombre]);
      if (exists.rows.length === 0) {
        const res = await pool.query(
          'INSERT INTO programas (nombre, descripcion) VALUES ($1, $2) RETURNING id',
          [p.nombre, p.descripcion]
        );
        insertedProgs[p.nombre] = res.rows[0].id;
        console.log(`Programa creado: ${p.nombre}`);
      } else {
        insertedProgs[p.nombre] = exists.rows[0].id;
        console.log(`Programa ya existe: ${p.nombre}`);
      }
    }

    // 4. Insertar fichas
    console.log('Insertando fichas...');
    const fichas = [
      { programa: 'Análisis y Desarrollo de Software', numero: '2502842', inicio: '2025-01-15', fin: '2027-01-15' },
      { programa: 'Análisis y Desarrollo de Software', numero: '2617382', inicio: '2025-06-01', fin: '2027-06-01' },
      { programa: 'Gestión de Redes de Datos', numero: '2712948', inicio: '2025-03-10', fin: '2027-03-10' }
    ];

    const insertedFichas = {};
    for (const f of fichas) {
      const exists = await pool.query('SELECT id FROM fichas WHERE numero_ficha = $1', [f.numero]);
      if (exists.rows.length === 0) {
        const progId = insertedProgs[f.programa];
        if (progId) {
          const res = await pool.query(
            'INSERT INTO fichas (programa_id, numero_ficha, fecha_inicio, fecha_fin) VALUES ($1, $2, $3, $4) RETURNING id',
            [progId, f.numero, f.inicio, f.fin]
          );
          insertedFichas[f.numero] = res.rows[0].id;
          console.log(`Ficha creada: ${f.numero}`);
        }
      } else {
        insertedFichas[f.numero] = exists.rows[0].id;
        console.log(`Ficha ya existe: ${f.numero}`);
      }
    }

    // Vinculación aprendiz a fichas
    console.log('Vinculando aprendices a fichas...');
    const vinculaciones = [
      { correo: 'maria.garcia@gmail.com', ficha: '2502842' },
      { correo: 'john.smith@gmail.com', ficha: '2502842' },
      { correo: 'ana.lopez@gmail.com', ficha: '2617382' }
    ];

    for (const v of vinculaciones) {
      const uId = insertedUsers[v.correo];
      const fId = insertedFichas[v.ficha];
      if (uId && fId) {
        const exists = await pool.query(
          'SELECT 1 FROM aprendiz_ficha WHERE aprendiz_id = $1 AND ficha_id = $2',
          [uId, fId]
        );
        if (exists.rows.length === 0) {
          await pool.query(
            'INSERT INTO aprendiz_ficha (aprendiz_id, ficha_id) VALUES ($1, $2)',
            [uId, fId]
          );
          console.log(`Vinculado ${v.correo} a ficha ${v.ficha}`);
        }
      }
    }

    // 5. Insertar RAPs (6) y crear la tabla de relación módulo‑rap
    const adsoId = insertedProgs['Análisis y Desarrollo de Software'];
    const rapsData = [
      { programa_id: adsoId, titulo: 'RAP 1 – Basic Nursing English', orden: 1 },
      { programa_id: adsoId, titulo: 'RAP 2 – Patient Interaction', orden: 2 },
      { programa_id: adsoId, titulo: 'RAP 3 – Clinical Communication', orden: 3 },
      { programa_id: adsoId, titulo: 'RAP 4 – Medical Documentation', orden: 4 },
      { programa_id: adsoId, titulo: 'RAP 5 – Advanced Terminology', orden: 5 },
      { programa_id: adsoId, titulo: 'RAP 6 – Emergency Procedures', orden: 6 }
    ];

    const insertedRaps = [];
    for (const r of rapsData) {
      const exists = await pool.query('SELECT id FROM raps WHERE programa_id = $1 AND orden = $2', [r.programa_id, r.orden]);
      if (exists.rows.length === 0) {
        const res = await pool.query('INSERT INTO raps (programa_id, titulo, orden) VALUES ($1, $2, $3) RETURNING id', [r.programa_id, r.titulo, r.orden]);
        insertedRaps.push(res.rows[0].id);
        console.log(`RAP creado: ${r.titulo}`);
      } else {
        insertedRaps.push(exists.rows[0].id);
        console.log(`RAP ya existe: ${r.titulo}`);
      }
    }

    // 6. Insertar Módulos (4)
    // CORREGIDO: modulos requiere programa_id y fase_id (NOT NULL en el schema actual)
    const faseRes = await pool.query("SELECT id FROM fases WHERE nombre = 'Ejecución'");
    const faseId = faseRes.rows[0].id;

    const modulosData = [
      { titulo: 'Módulo 1 – Introducción', orden: 1 },
      { titulo: 'Módulo 2 – Comunicación Clínica', orden: 2 },
      { titulo: 'Módulo 3 – Documentación Médica', orden: 3 },
      { titulo: 'Módulo 4 – Procedimientos Avanzados', orden: 4 }
    ];

    const insertedModules = [];
    for (const m of modulosData) {
      const exists = await pool.query('SELECT id FROM modulos WHERE titulo = $1 AND orden = $2', [m.titulo, m.orden]);
      if (exists.rows.length === 0) {
        const res = await pool.query(
          'INSERT INTO modulos (programa_id, fase_id, titulo, orden) VALUES ($1, $2, $3, $4) RETURNING id',
          [adsoId, faseId, m.titulo, m.orden]
        );
        insertedModules.push(res.rows[0].id);
        console.log(`Módulo creado: ${m.titulo}`);
      } else {
        insertedModules.push(exists.rows[0].id);
        console.log(`Módulo ya existe: ${m.titulo}`);
      }
    }

    // 7. Crear tabla de relación módulo‑rap si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS modulo_rap (
        id SERIAL PRIMARY KEY,
        modulo_id INTEGER REFERENCES modulos(id) ON DELETE RESTRICT,
        rap_id INTEGER REFERENCES raps(id) ON DELETE RESTRICT,
        UNIQUE (modulo_id, rap_id)
      )`);

    // 8. Vincular RAPs a Módulos según la distribución solicitada
    const moduleRapLinks = [
      // Módulo 1 → RAP 1
      { moduloIdx: 0, rapIdxs: [0] },
      // Módulo 2 → RAP 2 y RAP 3
      { moduloIdx: 1, rapIdxs: [1, 2] },
      // Módulo 3 → RAP 4 y RAP 5
      { moduloIdx: 2, rapIdxs: [3, 4] },
      // Módulo 4 → RAP 6
      { moduloIdx: 3, rapIdxs: [5] }
    ];

    for (const link of moduleRapLinks) {
      const moduloId = insertedModules[link.moduloIdx];
      let ordenRap = 1;
      for (const rapIdx of link.rapIdxs) {
        const rapId = insertedRaps[rapIdx];
        const exists = await pool.query('SELECT id FROM modulo_rap WHERE modulo_id = $1 AND rap_id = $2', [moduloId, rapId]);
        if (exists.rows.length === 0) {
          await pool.query('INSERT INTO modulo_rap (modulo_id, rap_id, orden) VALUES ($1, $2, $3)', [moduloId, rapId, ordenRap]);
          console.log(`Vinculado Módulo ${moduloId} con RAP ${rapId}`);
        }
        ordenRap++;
      }
    }

    // 7. Insertar Recursos (para estadísticas de contenido)
    console.log('Insertando Recursos...');
    const resources = [
      { titulo: 'Emergency Procedures Video Guide', ruta_archivo: '/uploads/videos/emergency.mp4', tipo_mime: 'video/mp4', subido_por: insertedUsers['sarah.johnson@skylang.com'] },
      { titulo: 'Patient Communication Interview', ruta_archivo: '/uploads/videos/patient_comm.mp4', tipo_mime: 'video/mp4', subido_por: insertedUsers['sarah.johnson@skylang.com'] },
      { titulo: 'Medical Terms Pronunciation Audio', ruta_archivo: '/uploads/audio/pronunciation.mp3', tipo_mime: 'audio/mpeg', subido_por: insertedUsers['sarah.johnson@skylang.com'] },
      { titulo: 'Basic Anatomy Diagram', ruta_archivo: '/uploads/images/anatomy.png', tipo_mime: 'image/png', subido_por: insertedUsers['michael.brown@skylang.com'] },
      { titulo: 'Clinical Handover Template', ruta_archivo: '/uploads/docs/clinical_handover.pdf', tipo_mime: 'application/pdf', subido_por: adminId }
    ];

    for (const r of resources) {
      if (r.subido_por) {
        const exists = await pool.query('SELECT id FROM recursos WHERE ruta_archivo = $1', [r.ruta_archivo]);
        if (exists.rows.length === 0) {
          await pool.query(
            'INSERT INTO recursos (titulo, ruta_archivo, tipo_mime, subido_por) VALUES ($1, $2, $3, $4)',
            [r.titulo, r.ruta_archivo, r.tipo_mime, r.subido_por]
          );
          console.log(`Recurso creado: ${r.titulo}`);
        }
      }
    }

    // 8. Insertar Actividades
    // CORREGIDO: actividades pertenece a una FICHA (ficha_id), no a un modulo_id.
    // CORREGIDO: 'tipo' debe ser un valor válido del enum tipo_actividad ('dialogo' no existe).
    console.log('Insertando Actividades...');
    const fichaIdParaActividades = insertedFichas['2502842'];
    const activities = [
      { tipo: 'vocabulario', titulo: 'Emergency Vocabulary Quiz', instrucciones: 'Learn basic terms for emergency care', creado_por: insertedUsers['sarah.johnson@skylang.com'] },
      { tipo: 'quiz', titulo: 'Roleplay: Checking Patient Status', instrucciones: 'Practice dialogue with patient', creado_por: insertedUsers['sarah.johnson@skylang.com'] }
    ];

    for (const a of activities) {
      if (fichaIdParaActividades && a.creado_por) {
        const exists = await pool.query(
          'SELECT id FROM actividades WHERE ficha_id = $1 AND titulo = $2',
          [fichaIdParaActividades, a.titulo]
        );
        if (exists.rows.length === 0) {
          await pool.query(
            'INSERT INTO actividades (ficha_id, tipo, titulo, instrucciones, creado_por) VALUES ($1, $2, $3, $4, $5)',
            [fichaIdParaActividades, a.tipo, a.titulo, a.instrucciones, a.creado_por]
          );
          console.log(`Actividad creada: ${a.titulo}`);
        }
      }
    }

    // 9. Insertar intentos de login (para gráficos)
    console.log('Insertando Intentos de Login para gráficos...');
    const loginAttempts = [
      { correo: 'skyland@gmail.com', exitoso: true, dias_atras: 0 },
      { correo: 'maria.garcia@gmail.com', exitoso: true, dias_atras: 0 },
      { correo: 'john.smith@gmail.com', exitoso: true, dias_atras: 1 },
      { correo: 'sarah.johnson@skylang.com', exitoso: true, dias_atras: 1 },
      { correo: 'maria.garcia@gmail.com', exitoso: true, dias_atras: 2 },
      { correo: 'michael.brown@skylang.com', exitoso: true, dias_atras: 2 },
      { correo: 'john.smith@gmail.com', exitoso: true, dias_atras: 3 },
      { correo: 'skyland@gmail.com', exitoso: true, dias_atras: 4 },
      { correo: 'maria.garcia@gmail.com', exitoso: true, dias_atras: 4 }
    ];

    const attemptsCountRes = await pool.query('SELECT COUNT(*) FROM intentos_login');
    if (parseInt(attemptsCountRes.rows[0].count) === 0) {
      for (const a of loginAttempts) {
        await pool.query(
          "INSERT INTO intentos_login (correo, exitoso, fecha_intento) VALUES ($1, $2, NOW() - ($3 * INTERVAL '1 day'))",
          [a.correo, a.exitoso, a.dias_atras]
        );
      }
      console.log('Intentos de login creados.');
    }

    // 10. Insertar sesiones de estudio
    console.log('Insertando Sesiones de Estudio...');
    const estudioCountRes = await pool.query('SELECT COUNT(*) FROM sesiones_estudio');
    if (parseInt(estudioCountRes.rows[0].count) === 0) {
      const mariaId = insertedUsers['maria.garcia@gmail.com'];
      const johnId = insertedUsers['john.smith@gmail.com'];
      if (mariaId && johnId) {
        await pool.query('INSERT INTO sesiones_estudio (aprendiz_id, fecha_inicio, fecha_fin, minutos_totales) VALUES ($1, NOW() - INTERVAL \'3 hours\', NOW() - INTERVAL \'2 hours\', 60)', [mariaId]);
        await pool.query('INSERT INTO sesiones_estudio (aprendiz_id, fecha_inicio, fecha_fin, minutos_totales) VALUES ($1, NOW() - INTERVAL \'5 hours\', NOW() - INTERVAL \'4 hours\', 60)', [johnId]);
        console.log('Sesiones de estudio creadas.');
      }
    }

    console.log('Semillero de datos ejecutado con éxito!');
    process.exit(0);
  } catch (error) {
    console.error('Error durante el seeding:', error);
    process.exit(1);
  }
}

seedData();