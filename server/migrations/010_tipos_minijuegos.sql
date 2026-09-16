-- ============================================================
-- 010 · Ampliar enum tipo_actividad con los tipos de minijuego
--      y los tipos del editor del instructor
-- ============================================================

-- Nuevos tipos de minijuego creados por el instructor
ALTER TYPE tipo_actividad ADD VALUE IF NOT EXISTS 'memory';
ALTER TYPE tipo_actividad ADD VALUE IF NOT EXISTS 'matching';
ALTER TYPE tipo_actividad ADD VALUE IF NOT EXISTS 'clinical_case';
ALTER TYPE tipo_actividad ADD VALUE IF NOT EXISTS 'evaluacion';
