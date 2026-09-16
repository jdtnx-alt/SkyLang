-- ============================================================
-- 006 · Un aprendiz pertenece a una sola ficha
--
-- Regla de negocio: el aprendiz está matriculado en una única ficha.
--
-- aprendiz_ficha era muchos-a-muchos (PK compuesta), así que nada impedía
-- acumular matrículas. Eso hacía ambiguo todo lo que depende de "la ficha del
-- aprendiz": el universo de actividades que cuentan para su progreso, el
-- instructor que puede verlo, y el listado de administración —que devolvía la
-- misma fila de usuario repetida, una por ficha, con claves duplicadas en la
-- tabla de la interfaz.
-- ============================================================

-- Salvaguarda: si algún aprendiz tuviera varias fichas, la migración se detiene
-- en lugar de elegir por su cuenta cuál conservar.
DO $$
DECLARE conflictivos INT;
BEGIN
  SELECT COUNT(*) INTO conflictivos
    FROM (SELECT aprendiz_id FROM aprendiz_ficha GROUP BY aprendiz_id HAVING COUNT(*) > 1) x;

  IF conflictivos > 0 THEN
    RAISE EXCEPTION 'Hay % aprendiz(ces) matriculados en más de una ficha. Resuélvelos antes de aplicar esta migración.', conflictivos;
  END IF;
END $$;

ALTER TABLE aprendiz_ficha
  ADD CONSTRAINT uq_aprendiz_una_ficha UNIQUE (aprendiz_id);
