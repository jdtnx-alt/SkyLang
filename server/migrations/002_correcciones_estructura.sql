-- ============================================================
-- 002 · Correcciones estructurales
--
-- Decisión de arquitectura aplicada: el progreso se mide por RAP.
-- progreso_rap_aprendiz es la tabla canónica de avance; progreso_modulo_aprendiz
-- es una agregación de sus RAP.
-- ============================================================

-- ------------------------------------------------------------
-- A. Umbrales institucionales configurables
--    El 70 y el 90 dejan de estar cableados en cinco sitios del código.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion_programa (
  programa_id           INT PRIMARY KEY REFERENCES programas(id) ON DELETE CASCADE,
  porcentaje_aprobacion NUMERIC(5,2) NOT NULL DEFAULT 70,
  porcentaje_excelencia NUMERIC(5,2) NOT NULL DEFAULT 90,
  CHECK (porcentaje_aprobacion BETWEEN 1 AND 100),
  CHECK (porcentaje_excelencia BETWEEN porcentaje_aprobacion AND 100)
);

INSERT INTO configuracion_programa (programa_id)
SELECT id FROM programas
ON CONFLICT (programa_id) DO NOTHING;


-- ------------------------------------------------------------
-- B. Ciclo de vida del intento
--    Antes el intento nacía ya cerrado ('aprobada'/'reprobada') en el mismo
--    INSERT, de modo que EN_CURSO y GUARDADA eran inalcanzables y la duración
--    siempre nula. Ahora el estado es un dominio cerrado con transiciones.
-- ------------------------------------------------------------
ALTER TABLE intentos_actividad
  ADD COLUMN IF NOT EXISTS umbral_aplicado      NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS registrado_por       INT REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS detalle_calificacion JSONB,
  ADD COLUMN IF NOT EXISTS fecha_actualizacion  TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE intentos_actividad
  ALTER COLUMN estado SET DEFAULT 'en_curso',
  ALTER COLUMN fecha_inicio SET NOT NULL;

ALTER TABLE intentos_actividad
  ADD CONSTRAINT intentos_estado_dominio
  CHECK (estado IN ('en_curso', 'guardada', 'enviada', 'calificada', 'aprobada', 'reprobada'));

-- Un intento abierto no tiene nota; un intento cerrado la tiene junto con su cierre.
ALTER TABLE intentos_actividad
  ADD CONSTRAINT intentos_coherencia_estado
  CHECK (
    (estado IN ('en_curso', 'guardada') AND calificacion IS NULL AND fecha_fin IS NULL)
    OR (estado IN ('enviada', 'calificada'))
    OR (estado IN ('aprobada', 'reprobada') AND calificacion IS NOT NULL AND fecha_fin IS NOT NULL)
  );

ALTER TABLE intentos_actividad
  ADD CONSTRAINT intentos_duracion_check
  CHECK (duracion_segundos IS NULL OR duracion_segundos >= 0);

-- Regla 7.2 del análisis funcional: solo puede existir un intento activo.
-- Se garantiza en la base, no en el código.
CREATE UNIQUE INDEX IF NOT EXISTS uq_intento_abierto
  ON intentos_actividad (actividad_id, aprendiz_id)
  WHERE estado IN ('en_curso', 'guardada');

CREATE INDEX IF NOT EXISTS idx_intentos_por_aprendiz
  ON intentos_actividad (aprendiz_id, actividad_id, numero_intento DESC);


-- ------------------------------------------------------------
-- C. Calificación oficial
--    'estado' duplicaba lo que ya expresa la nota frente al umbral. Se sustituye
--    por un booleano decidido en el momento del envío, que no se reinterpreta si
--    la institución cambia el umbral más adelante.
-- ------------------------------------------------------------
ALTER TABLE calificacion_oficial_actividad
  ADD COLUMN IF NOT EXISTS aprobada        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS numero_intentos INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS primer_intento_en TIMESTAMPTZ;

UPDATE calificacion_oficial_actividad SET aprobada = TRUE WHERE estado = 'aprobada';

ALTER TABLE calificacion_oficial_actividad DROP COLUMN IF EXISTS estado;

ALTER TABLE calificacion_oficial_actividad
  ADD CONSTRAINT coa_mejor_calificacion_check CHECK (mejor_calificacion BETWEEN 0 AND 100),
  ADD CONSTRAINT coa_numero_intentos_check    CHECK (numero_intentos >= 0);

-- La PK (actividad_id, aprendiz_id) no sirve para "todo lo de este aprendiz",
-- que es la consulta que el sistema hace constantemente.
CREATE INDEX IF NOT EXISTS idx_coa_aprendiz ON calificacion_oficial_actividad (aprendiz_id);


-- ------------------------------------------------------------
-- D. Progreso: monotonía, dominio de estados e índices
--    porcentaje       = avance sobre el temario vigente (puede bajar si el
--                       instructor añade actividades)
--    porcentaje_maximo= avance oficial alcanzado (nunca baja) → RN-08, RN-22
-- ------------------------------------------------------------
ALTER TABLE progreso_rap_aprendiz
  ADD COLUMN IF NOT EXISTS porcentaje_maximo NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nota_promedio     NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS desbloqueado_en   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE progreso_rap_aprendiz SET porcentaje_maximo = porcentaje WHERE porcentaje_maximo < porcentaje;

ALTER TABLE progreso_rap_aprendiz
  ADD CONSTRAINT prap_porcentaje_check   CHECK (porcentaje BETWEEN 0 AND 100),
  ADD CONSTRAINT prap_maximo_check       CHECK (porcentaje_maximo BETWEEN 0 AND 100),
  ADD CONSTRAINT prap_estado_dominio     CHECK (estado IN ('bloqueado', 'disponible', 'en_progreso', 'completado', 'excelencia')),
  ADD CONSTRAINT prap_conteo_check       CHECK (actividades_completadas <= actividades_totales);

CREATE INDEX IF NOT EXISTS idx_prap_aprendiz ON progreso_rap_aprendiz (aprendiz_id);

ALTER TABLE progreso_modulo_aprendiz
  ADD COLUMN IF NOT EXISTS porcentaje_maximo NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE progreso_modulo_aprendiz SET porcentaje_maximo = porcentaje WHERE porcentaje_maximo < porcentaje;

ALTER TABLE progreso_modulo_aprendiz
  ADD CONSTRAINT pmod_porcentaje_check CHECK (porcentaje BETWEEN 0 AND 100),
  ADD CONSTRAINT pmod_maximo_check     CHECK (porcentaje_maximo BETWEEN 0 AND 100),
  ADD CONSTRAINT pmod_estado_dominio   CHECK (estado IN ('bloqueado', 'disponible', 'en_progreso', 'completado')),
  ADD CONSTRAINT pmod_conteo_check     CHECK (raps_completados <= raps_totales);

CREATE INDEX IF NOT EXISTS idx_pmod_aprendiz ON progreso_modulo_aprendiz (aprendiz_id);


-- ------------------------------------------------------------
-- E. Dimensión ficha en las vinculaciones
--    Las actividades pertenecen a una ficha, pero el orden dentro del momento
--    era único de forma global: dos fichas del mismo programa no podían colocar,
--    ambas, una actividad en la posición 1. La segunda cohorte matriculada
--    rompía la creación de actividades con un 500.
-- ------------------------------------------------------------
ALTER TABLE actividades ADD CONSTRAINT uq_actividades_id_ficha UNIQUE (id, ficha_id);
ALTER TABLE contenidos  ADD CONSTRAINT uq_contenidos_id_ficha  UNIQUE (id, ficha_id);

ALTER TABLE rap_momento_actividades ADD COLUMN IF NOT EXISTS ficha_id INT;
UPDATE rap_momento_actividades rma
   SET ficha_id = a.ficha_id
  FROM actividades a
 WHERE a.id = rma.actividad_id AND rma.ficha_id IS NULL;
ALTER TABLE rap_momento_actividades ALTER COLUMN ficha_id SET NOT NULL;

ALTER TABLE rap_momento_actividades
  DROP CONSTRAINT IF EXISTS rap_momento_actividades_rap_momento_id_orden_key;
ALTER TABLE rap_momento_actividades
  ADD CONSTRAINT uq_rma_ficha_momento_orden UNIQUE (ficha_id, rap_momento_id, orden);
-- La FK compuesta impide que la vinculación apunte a una ficha distinta de la
-- actividad: la denormalización queda garantizada por la base, no por el código.
ALTER TABLE rap_momento_actividades
  ADD CONSTRAINT fk_rma_actividad_ficha
  FOREIGN KEY (actividad_id, ficha_id) REFERENCES actividades (id, ficha_id) ON DELETE CASCADE;

ALTER TABLE rap_momento_contenidos ADD COLUMN IF NOT EXISTS ficha_id INT;
UPDATE rap_momento_contenidos rmc
   SET ficha_id = c.ficha_id
  FROM contenidos c
 WHERE c.id = rmc.contenido_id AND rmc.ficha_id IS NULL;
ALTER TABLE rap_momento_contenidos ALTER COLUMN ficha_id SET NOT NULL;

ALTER TABLE rap_momento_contenidos
  DROP CONSTRAINT IF EXISTS rap_momento_contenidos_rap_momento_id_orden_key;
ALTER TABLE rap_momento_contenidos
  ADD CONSTRAINT uq_rmc_ficha_momento_orden UNIQUE (ficha_id, rap_momento_id, orden);
ALTER TABLE rap_momento_contenidos
  ADD CONSTRAINT fk_rmc_contenido_ficha
  FOREIGN KEY (contenido_id, ficha_id) REFERENCES contenidos (id, ficha_id) ON DELETE CASCADE;


-- ------------------------------------------------------------
-- F. modulo_rap: el orden estaba en el eje equivocado
--    UNIQUE (rap_id, orden) impedía que un mismo RAP ocupara la posición 1 en
--    dos módulos distintos, que es justo lo que RN-39 y RF-07 permiten.
--    El orden describe la posición del RAP DENTRO del módulo.
-- ------------------------------------------------------------
ALTER TABLE modulo_rap DROP CONSTRAINT IF EXISTS modulo_rap_rap_id_orden_key;
ALTER TABLE modulo_rap ADD CONSTRAINT uq_modulo_rap_modulo_orden UNIQUE (modulo_id, orden);


-- ------------------------------------------------------------
-- G. Usuarios: identificación única y columna duplicada
--    CU-01 flujo alterno A2 exige rechazar un documento ya registrado; la base
--    no lo impedía. documento_identidad duplicaba identificacion y estaba 100%
--    nula en toda la tabla.
-- ------------------------------------------------------------
ALTER TABLE usuarios DROP COLUMN IF EXISTS documento_identidad;

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_identificacion
  ON usuarios (identificacion)
  WHERE identificacion IS NOT NULL;


-- ------------------------------------------------------------
-- H. Trazabilidad mínima del contenido académico
--    Editar una actividad no dejaba ninguna huella (RN-27).
-- ------------------------------------------------------------
ALTER TABLE actividades
  ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS actualizado_por     INT REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE contenidos
  ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS actualizado_por     INT REFERENCES usuarios(id) ON DELETE SET NULL;


-- ------------------------------------------------------------
-- I. Retirada de la entidad duplicada
--    resultados_actividades y calificacion_oficial_actividad son la misma cosa.
--    La primera quedó vacía y huérfana, pero seguía creándose en cada base nueva
--    y retroalimentacion_instructor todavía apuntaba a ella, lo que rompía tres
--    endpoints de borrado.
-- ------------------------------------------------------------
ALTER TABLE retroalimentacion_instructor
  DROP CONSTRAINT IF EXISTS retroalimentacion_instructor_resultado_actividad_id_fkey;
ALTER TABLE retroalimentacion_instructor DROP COLUMN IF EXISTS resultado_actividad_id;

ALTER TABLE retroalimentacion_instructor
  ADD COLUMN IF NOT EXISTS actividad_id INT NOT NULL,
  ADD COLUMN IF NOT EXISTS aprendiz_id  INT NOT NULL;

ALTER TABLE retroalimentacion_instructor
  ADD CONSTRAINT fk_retro_calificacion
  FOREIGN KEY (actividad_id, aprendiz_id)
  REFERENCES calificacion_oficial_actividad (actividad_id, aprendiz_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_retro_calificacion
  ON retroalimentacion_instructor (actividad_id, aprendiz_id);

DROP TABLE IF EXISTS resultados_actividades CASCADE;
