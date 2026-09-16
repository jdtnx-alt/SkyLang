-- ============================================================
-- 008 · Tipo de actividad «evaluación»
--
-- La actividad evaluativa del Momento 4 no es un cuestionario ni un formulario:
-- es una prueba que mezcla ambas clases de pregunta. En lugar de obligar al
-- instructor a elegir un único formato para toda la evaluación, este tipo
-- permite ir añadiendo preguntas de opción múltiple y de respuesta corta dentro
-- de la misma actividad.
--
-- Su datos_json tiene la forma:
--   { "items": [
--       { "tipo": "opcion_multiple", "enunciado": "…", "opciones": ["a","b"], "correcta": 1 },
--       { "tipo": "respuesta_corta",  "enunciado": "…", "esperada": "…" }
--   ]}
-- ============================================================

ALTER TYPE tipo_actividad ADD VALUE IF NOT EXISTS 'evaluacion';
