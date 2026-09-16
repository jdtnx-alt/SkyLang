-- Backup omitido: diagnóstico previo confirmó 0 filas en tablas legacy. Para futuras migraciones con datos, backup es obligatorio y bloqueante antes de cualquier DROP.

BEGIN;

-- 1. Copiar datos remanentes (si los hubiera) de intentos_actividades a intentos_actividad
INSERT INTO intentos_actividad (actividad_id, aprendiz_id, numero_intento, estado, respuestas_json, calificacion, fecha_fin)
SELECT 
  actividad_id, 
  aprendiz_id, 
  numero_intento, 
  CASE WHEN calificacion >= 70 THEN 'aprobada' ELSE 'reprobada' END as estado,
  respuesta_json, 
  calificacion, 
  fecha_envio
FROM intentos_actividades
ON CONFLICT DO NOTHING;

-- 2. Eliminar la tabla duplicada legacy intentos_actividades
DROP TABLE IF EXISTS intentos_actividades CASCADE;

-- 3. Copiar datos remanentes de resultados_actividades a calificacion_oficial_actividad
INSERT INTO calificacion_oficial_actividad (actividad_id, aprendiz_id, mejor_calificacion, estado, fecha_actualizacion)
SELECT 
  actividad_id, 
  aprendiz_id, 
  COALESCE(mejor_calificacion, calificacion, 0), 
  CASE WHEN estado::text IN ('aprobada', 'revisada') THEN 'aprobada' ELSE 'reprobada' END,
  COALESCE(fecha_ultimo_envio, NOW())
FROM resultados_actividades
ON CONFLICT (actividad_id, aprendiz_id) DO NOTHING;

-- 4. Eliminar la tabla duplicada legacy resultados_actividades
DROP TABLE IF EXISTS resultados_actividades CASCADE;

-- 5. Crear el índice compuesto de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_intentos_aprendiz_actividad_estado 
ON intentos_actividad (aprendiz_id, actividad_id, estado);

COMMIT;
