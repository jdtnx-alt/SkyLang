-- ============================================================
-- 004 · La teoría pasa a ser contenido, y la evaluación deja de ser una entidad
--
-- Dos decisiones académicas del 21/08/2026:
--
--   1. El material de estudio (vídeo, píldora gramatical, vocabulario, diálogos)
--      es CONTENIDO, no actividad: se visualiza y no genera progreso, como dice
--      el capítulo 1.3 del análisis funcional. Hasta ahora estaba modelado como
--      actividad obligatoria, así que inflaba el denominador del RAP.
--
--   2. La evaluación final del módulo no es una entidad propia: es una actividad
--      obligatoria más, colgada de un RAP, que entra en su porcentaje. Las tablas
--      evaluaciones y resultados_evaluaciones quedan fuera del modelo.
-- ============================================================

-- ------------------------------------------------------------
-- A. El contenido necesita guardar material estructurado
--    (cuerpo_texto TEXT no da para vídeo + gramática + vocabulario + diálogos)
-- ------------------------------------------------------------
ALTER TABLE contenidos ADD COLUMN IF NOT EXISTS datos_json JSONB;


-- ------------------------------------------------------------
-- B. Conversión de las actividades teóricas en contenidos
--
--    Solo se convierten las que NO tienen historial académico. Una actividad con
--    intentos o notas no se toca: el historial del aprendiz sobrevive a los
--    cambios de contenido (RN-28). Las que queden sin convertir hay que migrarlas
--    a mano decidiendo qué hacer con sus intentos.
-- ------------------------------------------------------------
DO $$
DECLARE
  actividad RECORD;
  nuevo_contenido_id INT;
  convertidas INT := 0;
  omitidas INT := 0;
BEGIN
  FOR actividad IN
    SELECT a.id, a.ficha_id, a.titulo, a.instrucciones, a.datos_json, a.creado_por
      FROM actividades a
     WHERE a.tipo::text IN ('grammar_pill', 'teoria')
       AND NOT EXISTS (SELECT 1 FROM intentos_actividad i WHERE i.actividad_id = a.id)
       AND NOT EXISTS (SELECT 1 FROM calificacion_oficial_actividad c WHERE c.actividad_id = a.id)
     ORDER BY a.id
  LOOP
    INSERT INTO contenidos (ficha_id, titulo, cuerpo_texto, datos_json, creado_por)
    VALUES (actividad.ficha_id, actividad.titulo, actividad.instrucciones,
            actividad.datos_json, actividad.creado_por)
    RETURNING id INTO nuevo_contenido_id;

    -- Se conserva la ubicación: mismo RAP, mismos momentos.
    INSERT INTO rap_momento_contenidos (rap_momento_id, contenido_id, ficha_id, orden)
    SELECT rma.rap_momento_id,
           nuevo_contenido_id,
           rma.ficha_id,
           COALESCE((SELECT MAX(x.orden) FROM rap_momento_contenidos x
                      WHERE x.rap_momento_id = rma.rap_momento_id
                        AND x.ficha_id = rma.ficha_id), 0) + 1
      FROM rap_momento_actividades rma
     WHERE rma.actividad_id = actividad.id;

    DELETE FROM rap_momento_actividades WHERE actividad_id = actividad.id;
    DELETE FROM actividades WHERE id = actividad.id;

    convertidas := convertidas + 1;
  END LOOP;

  SELECT COUNT(*) INTO omitidas
    FROM actividades a
   WHERE a.tipo::text IN ('grammar_pill', 'teoria');

  RAISE NOTICE 'Teoría convertida en contenido: % actividades. Sin convertir por tener historial: %',
    convertidas, omitidas;
END $$;


-- ------------------------------------------------------------
-- C. Retirada de la entidad "evaluación"
--
--    Nunca se usó: cero filas y ningún endpoint. Con la evaluación modelada como
--    actividad, mantenerla sería una segunda forma de hacer lo mismo — el patrón
--    que ya causó el problema de resultados_actividades.
-- ------------------------------------------------------------
ALTER TABLE registro_puntos DROP COLUMN IF EXISTS evaluacion_id CASCADE;

DROP TABLE IF EXISTS resultados_evaluaciones;
DROP TABLE IF EXISTS evaluaciones;
