-- ============================================================
-- 001 · Tablas funcionales de intentos y progreso
--
-- Formaliza como migración lo que antes creaba runFunctionalMigration() en cada
-- arranque del servidor. En una base ya existente es un no-op, en una base nueva
-- crea las tablas después de database_schema.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS intentos_actividad (
  id                  SERIAL PRIMARY KEY,
  actividad_id        INT NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
  aprendiz_id         INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  numero_intento      INT NOT NULL DEFAULT 1,
  estado              VARCHAR(50) NOT NULL DEFAULT 'en_curso',
  respuestas_json     JSONB,
  calificacion        NUMERIC(5,2),
  fecha_inicio        TIMESTAMPTZ DEFAULT NOW(),
  fecha_fin           TIMESTAMPTZ,
  duracion_segundos   INT,
  url_archivo_entrega VARCHAR(500),
  retroalimentacion   TEXT,
  UNIQUE (actividad_id, aprendiz_id, numero_intento),
  CHECK (numero_intento > 0),
  CHECK (calificacion IS NULL OR calificacion BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS calificacion_oficial_actividad (
  actividad_id        INT NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
  aprendiz_id         INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  mejor_calificacion  NUMERIC(5,2) NOT NULL DEFAULT 0,
  intento_id          INT REFERENCES intentos_actividad(id),
  estado              VARCHAR(50) NOT NULL DEFAULT 'no_iniciada',
  fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (actividad_id, aprendiz_id)
);

CREATE TABLE IF NOT EXISTS progreso_rap_aprendiz (
  rap_id                  INT NOT NULL REFERENCES raps(id) ON DELETE CASCADE,
  aprendiz_id             INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  estado                  VARCHAR(50) NOT NULL DEFAULT 'bloqueado',
  porcentaje              NUMERIC(5,2) NOT NULL DEFAULT 0,
  actividades_completadas INT NOT NULL DEFAULT 0,
  actividades_totales     INT NOT NULL DEFAULT 0,
  fecha_inicio            TIMESTAMPTZ,
  fecha_completado        TIMESTAMPTZ,
  PRIMARY KEY (rap_id, aprendiz_id)
);

CREATE TABLE IF NOT EXISTS progreso_modulo_aprendiz (
  modulo_id        INT NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  aprendiz_id      INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  estado           VARCHAR(50) NOT NULL DEFAULT 'bloqueado',
  porcentaje       NUMERIC(5,2) NOT NULL DEFAULT 0,
  raps_completados INT NOT NULL DEFAULT 0,
  raps_totales     INT NOT NULL DEFAULT 0,
  fecha_inicio     TIMESTAMPTZ,
  fecha_completado TIMESTAMPTZ,
  PRIMARY KEY (modulo_id, aprendiz_id)
);
