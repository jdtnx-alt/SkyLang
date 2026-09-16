-- ============================================================
-- 009 · Catálogo inicial de insignias (Logros del Aprendiz)
--
-- Siembra las 16 insignias base del programa de formación en Inglés
-- Técnico para Enfermería (SkyLang / SENA). Cada insignia tiene un
-- código_criterio único que el motor de gamificación usa para evaluar
-- si el aprendiz cumplió la condición.
--
-- Categorías:
--   1. Iniciación y Primeros Pasos  (3 insignias · bronce)
--   2. Destrezas y Habilidades      (5 insignias · plata/oro)
--   3. Hábitos y Rachas             (3 insignias · bronce/plata/oro)
--   4. Avance Curricular (RAPs)     (4 insignias · plata/oro/diamante)
--   5. Puntos de Miel (XP)          (3 insignias · bronce/plata/oro)
-- ============================================================

INSERT INTO insignias (nombre, descripcion, codigo_criterio, tipo_badge)
VALUES

-- ──────────────────────────────────────────────────────
-- 1. Iniciación y Primeros Pasos
-- ──────────────────────────────────────────────────────
(
  'Primer Vuelo',
  'Aprobaste exitosamente tu primera actividad interactiva en SkyLang. ¡El viaje comienza aquí!',
  'PRIMER_PASO',
  'bronze'
),
(
  'Expediente Completo',
  'Completaste todos los campos de tu perfil: nombre, identificación y teléfono. ¡Ya te conocemos bien!',
  'PERFIL_COMPLETO',
  'bronze'
),
(
  'Primer Momento',
  'Completaste todas las actividades de un momento pedagógico completo (Preparación, Absorción, Práctica o Cierre).',
  'PRIMER_MOMENTO',
  'bronze'
),

-- ──────────────────────────────────────────────────────
-- 2. Destrezas y Habilidades Clínicas
-- ──────────────────────────────────────────────────────
(
  'Memoria Médica',
  'Superaste 3 juegos de emparejamiento de vocabulario de terminología hospitalaria en inglés.',
  'MEMORY_MASTER',
  'silver'
),
(
  'Oído Clínico',
  'Aprobaste 3 cuestionarios de comprensión auditiva de diálogos enfermero-paciente con nota ≥ 80%.',
  'LISTENING_NURSE',
  'silver'
),
(
  'Glosario Hospitalario',
  'Completaste 5 actividades de vocabulario técnico de enfermería (equipos, suministros, signos vitales).',
  'VOCABULARIO_PRO',
  'gold'
),
(
  'Puntería Impecable',
  'Obtuviste una calificación perfecta de 100% en cualquier evaluación o quiz de momento de cierre.',
  'NOTA_PERFECTA',
  'gold'
),
(
  'Código de Emergencias',
  'Aprobaste todas las actividades del RAP 6: Emergency Procedures & Critical Care.',
  'EMERGENCY_READY',
  'diamond'
),

-- ──────────────────────────────────────────────────────
-- 3. Hábitos, Disciplina y Rachas
-- ──────────────────────────────────────────────────────
(
  'Chispa de Estudio',
  'Mantuviste una racha de estudio activo durante 3 días consecutivos. ¡El hábito está tomando forma!',
  'RACHA_3_DIAS',
  'bronze'
),
(
  'Racha de Guardia',
  'Mantuviste la racha activa durante 7 días continuos. ¡Disciplina de enfermería!',
  'RACHA_7_DIAS',
  'silver'
),
(
  'Guardia Extensa',
  'Acumulaste más de 2 horas (120 minutos) de tiempo efectivo resolviendo actividades en la plataforma.',
  'TIEMPO_ESTUDIO_2H',
  'gold'
),

-- ──────────────────────────────────────────────────────
-- 4. Avance Curricular y RAPs (SENA)
-- ──────────────────────────────────────────────────────
(
  'Iniciación de Enfermería',
  'Completaste al 100% el RAP 1: Basic Nursing English. ¡Los fundamentos están sólidos!',
  'RAP_1_COMPLETO',
  'silver'
),
(
  'Comunicación Asistencial',
  'Completaste al 100% los RAPs 2 y 3: Patient Interaction y Clinical Communication.',
  'RAP_2_3_COMPLETO',
  'gold'
),
(
  'Documentación y Reportes',
  'Completaste al 100% los RAPs 4 y 5: Medical Documentation y Advanced Terminology.',
  'RAP_4_5_COMPLETO',
  'gold'
),
(
  'Enfermero Bilingüe SkyLang',
  '¡Completaste los 6 RAPs del programa de Inglés Técnico para Enfermería! Eres un profesional bilingüe.',
  'PROGRAMA_COMPLETO',
  'diamond'
),

-- ──────────────────────────────────────────────────────
-- 5. Puntos de Miel y Rango (Honey XP)
-- ──────────────────────────────────────────────────────
(
  'Recolector de Miel',
  'Acumulaste 500 Puntos de Miel (XP). ¡La colmena empieza a llenarse!',
  'XP_500',
  'bronze'
),
(
  'Panal Dorado',
  'Acumulaste 1.500 Puntos de Miel (XP). ¡La reina abeja está orgullosa!',
  'XP_1500',
  'silver'
),
(
  'Maestro de la Colmena',
  'Acumulaste 3.000 Puntos de Miel (XP). ¡Eres el guardián de la colmena SkyLang!',
  'XP_3000',
  'gold'
)

ON CONFLICT (codigo_criterio) DO NOTHING;
