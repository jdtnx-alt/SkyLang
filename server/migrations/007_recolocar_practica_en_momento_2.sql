-- ============================================================
-- 007 · Los ejercicios de práctica pasan al Momento 2
--
-- Función de cada momento (decisión del 21/08/2026). Los nombres de la tabla
-- `momentos` se mantienen; lo que sigue describe qué admite cada uno:
--
--   1. Preparación                → solo material de estudio
--   2. Absorción del conocimiento → ejercicios de práctica de respuesta corta
--   3. Práctica y aplicación      → cuestionarios de opción múltiple
--   4. Cierre                     → la actividad evaluativa del RAP
--
-- El contenido sembrado colocaba los ejercicios de respuesta corta en el
-- Momento 3. Se mueven al 2 para que la estructura existente cumpla la misma
-- regla que el servidor impone a partir de ahora.
--
-- Solo se mueven las actividades SIN historial académico: una actividad con
-- intentos o notas se queda donde está (RN-28).
-- ============================================================

DO $$
DECLARE
  actividad RECORD;
  destino INT;
  siguiente_orden INT;
  movidas INT := 0;
BEGIN
  FOR actividad IN
    SELECT a.id, a.ficha_id, rma.id AS vinculo_id, rm.rap_id
      FROM actividades a
      JOIN rap_momento_actividades rma ON rma.actividad_id = a.id
      JOIN rap_momentos rm             ON rm.id = rma.rap_momento_id
      JOIN momentos mo                 ON mo.id = rm.momento_id
     WHERE a.tipo::text = 'formulario'
       AND mo.orden = 3
       AND NOT EXISTS (SELECT 1 FROM intentos_actividad i WHERE i.actividad_id = a.id)
       AND NOT EXISTS (SELECT 1 FROM calificacion_oficial_actividad c WHERE c.actividad_id = a.id)
  LOOP
    -- Momento 2 del mismo RAP
    SELECT rm.id INTO destino
      FROM rap_momentos rm
      JOIN momentos mo ON mo.id = rm.momento_id
     WHERE rm.rap_id = actividad.rap_id AND mo.orden = 2;

    CONTINUE WHEN destino IS NULL;

    SELECT COALESCE(MAX(orden), 0) + 1 INTO siguiente_orden
      FROM rap_momento_actividades
     WHERE rap_momento_id = destino AND ficha_id = actividad.ficha_id;

    UPDATE rap_momento_actividades
       SET rap_momento_id = destino, orden = siguiente_orden
     WHERE id = actividad.vinculo_id;

    movidas := movidas + 1;
  END LOOP;

  RAISE NOTICE 'Ejercicios de práctica movidos del Momento 3 al Momento 2: %', movidas;
END $$;
