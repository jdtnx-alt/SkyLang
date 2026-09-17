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
  'First Flight',
  'Successfully passed your first interactive activity in SkyLang. The journey begins here!',
  'PRIMER_PASO',
  'bronze'
),
(
  'Complete Record',
  'Completed all fields of your profile: name, ID, and phone number. Now we know you well!',
  'PERFIL_COMPLETO',
  'bronze'
),
(
  'First Learning Moment',
  'Completed all activities in a full learning moment (Preparation, Absorption, Practice, or Closure).',
  'PRIMER_MOMENTO',
  'bronze'
),

-- ──────────────────────────────────────────────────────
-- 2. Destrezas y Habilidades Clínicas
-- ──────────────────────────────────────────────────────
(
  'Medical Memory',
  'Passed 3 hospital vocabulary matching games in clinical English.',
  'MEMORY_MASTER',
  'silver'
),
(
  'Clinical Ear',
  'Passed 3 listening comprehension quizzes of nurse-patient dialogues with a score >= 80%.',
  'LISTENING_NURSE',
  'silver'
),
(
  'Hospital Glossary',
  'Completed 5 nursing technical vocabulary activities (equipment, supplies, vital signs).',
  'VOCABULARIO_PRO',
  'gold'
),
(
  'Flawless Score',
  'Achieved a perfect score of 100% on any evaluation or closing moment quiz.',
  'NOTA_PERFECTA',
  'gold'
),
(
  'Emergency Code',
  'Passed all activities of RAP 6: Emergency Procedures & Critical Care.',
  'EMERGENCY_READY',
  'diamond'
),

-- ──────────────────────────────────────────────────────
-- 3. Hábitos, Disciplina y Rachas
-- ──────────────────────────────────────────────────────
(
  'Study Spark',
  'Maintained an active study streak for 3 consecutive days. The habit is taking shape!',
  'RACHA_3_DIAS',
  'bronze'
),
(
  'Shift Streak',
  'Kept your streak active for 7 consecutive days. Nursing discipline!',
  'RACHA_7_DIAS',
  'silver'
),
(
  'Extended Shift',
  'Accumulated more than 2 hours (120 minutes) of active time completing activities on the platform.',
  'TIEMPO_ESTUDIO_2H',
  'gold'
),

-- ──────────────────────────────────────────────────────
-- 4. Avance Curricular y RAPs (SENA)
-- ──────────────────────────────────────────────────────
(
  'Nursing Initiation',
  'Completed RAP 1: Basic Nursing English at 100%. Fundamentals are rock solid!',
  'RAP_1_COMPLETO',
  'silver'
),
(
  'Clinical Communication',
  'Completed RAPs 2 and 3: Patient Interaction and Clinical Communication at 100%.',
  'RAP_2_3_COMPLETO',
  'gold'
),
(
  'Documentation & Reports',
  'Completed RAPs 4 and 5: Medical Documentation and Advanced Terminology at 100%.',
  'RAP_4_5_COMPLETO',
  'gold'
),
(
  'SkyLang Bilingual Nurse',
  'Completed all 6 RAPs of the Nursing Technical English program! You are a certified bilingual professional.',
  'PROGRAMA_COMPLETO',
  'diamond'
),

-- ──────────────────────────────────────────────────────
-- 5. Puntos de Miel y Rango (Honey XP)
-- ──────────────────────────────────────────────────────
(
  'Honey Collector',
  'Accumulated 500 Honey Points (XP). The hive is starting to fill up!',
  'XP_500',
  'bronze'
),
(
  'Golden Honeycomb',
  'Accumulated 1,500 Honey Points (XP). The queen bee is proud!',
  'XP_1500',
  'silver'
),
(
  'Hive Master',
  'Accumulated 3,000 Honey Points (XP). You are the guardian of the SkyLang hive!',
  'XP_3000',
  'gold'
)

ON CONFLICT (codigo_criterio) DO NOTHING;
