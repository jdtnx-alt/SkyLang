-- ============================================================
-- 003 · Materializar el progreso de las matrículas existentes
--
-- Hasta ahora no existía ninguna fila de progreso hasta el primer intento, y las
-- consultas resolvían la ausencia con COALESCE(estado, 'disponible'): "sin
-- datos", "bloqueado" y "disponible" eran indistinguibles y el sistema los
-- colapsaba en el más permisivo. Con las filas materializadas, el bloqueo del
-- RAP pasa a ser un estado real con fecha de desbloqueo, auditable y notificable.
-- ============================================================

-- Un RAP por aprendiz y programa. Solo el primero nace disponible.
INSERT INTO progreso_rap_aprendiz
  (rap_id, aprendiz_id, estado, porcentaje, porcentaje_maximo,
   actividades_completadas, actividades_totales, desbloqueado_en)
SELECT r.id,
       af.aprendiz_id,
       CASE WHEN r.orden = 1 THEN 'disponible' ELSE 'bloqueado' END,
       0, 0, 0, 0,
       CASE WHEN r.orden = 1 THEN NOW() ELSE NULL END
  FROM aprendiz_ficha af
  JOIN fichas f  ON f.id = af.ficha_id
  JOIN raps r    ON r.programa_id = f.programa_id
ON CONFLICT (rap_id, aprendiz_id) DO NOTHING;

-- El módulo no tiene bloqueo propio: su accesibilidad se deriva de sus RAP.
INSERT INTO progreso_modulo_aprendiz
  (modulo_id, aprendiz_id, estado, porcentaje, porcentaje_maximo, raps_completados, raps_totales)
SELECT m.id,
       af.aprendiz_id,
       'disponible',
       0, 0, 0,
       (SELECT COUNT(*) FROM modulo_rap mr WHERE mr.modulo_id = m.id)
  FROM aprendiz_ficha af
  JOIN fichas f   ON f.id = af.ficha_id
  JOIN modulos m  ON m.programa_id = f.programa_id
ON CONFLICT (modulo_id, aprendiz_id) DO NOTHING;

-- Coherencia con quien ya tuviera avance registrado antes de esta migración.
UPDATE progreso_rap_aprendiz
   SET estado = 'disponible', desbloqueado_en = COALESCE(desbloqueado_en, NOW())
 WHERE estado = 'bloqueado' AND porcentaje_maximo > 0;
