-- ============================================================
-- 005 · Un solo instructor por ficha
--
-- Regla de negocio: un instructor de inglés tiene muchas fichas, pero cada ficha
-- tiene un único instructor de inglés.
--
-- La tabla instructor_ficha era muchos-a-muchos (PK compuesta), de modo que nada
-- impedía asignar dos instructores a la misma ficha. La cardinalidad real es
-- 1:N — un instructor, muchas fichas — y ahora la garantiza la base.
--
-- NOTA: si algún día la plataforma cubre varias áreas y una ficha necesita un
-- instructor por área, esta restricción hay que sustituirla por
-- UNIQUE (ficha_id, area_id); hoy no existe la noción de área.
-- ============================================================

-- Salvaguarda: si hubiera fichas con más de un instructor, la migración se
-- detiene en lugar de elegir por su cuenta a cuál conservar.
DO $$
DECLARE conflictivas INT;
BEGIN
  SELECT COUNT(*) INTO conflictivas
    FROM (SELECT ficha_id FROM instructor_ficha GROUP BY ficha_id HAVING COUNT(*) > 1) x;

  IF conflictivas > 0 THEN
    RAISE EXCEPTION 'Hay % ficha(s) con más de un instructor asignado. Resuélvelas antes de aplicar esta migración.', conflictivas;
  END IF;
END $$;

ALTER TABLE instructor_ficha
  ADD CONSTRAINT uq_instructor_ficha_una_por_ficha UNIQUE (ficha_id);
