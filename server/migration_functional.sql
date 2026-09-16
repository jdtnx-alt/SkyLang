-- ============================================================
-- MIGRACIÓN: Alineación con Análisis Funcional SkyLang
-- Fase 1: Nuevas tablas y columnas para estado, reintentos y progreso
-- ============================================================

-- 1. Nuevos tipos ENUM de estado
DO $$ BEGIN
  CREATE TYPE estado_intento AS ENUM (
    'no_iniciada', 'en_curso', 'guardada', 'enviada', 'calificada', 'aprobada', 'reprobada', 'reintento'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE estado_modulo AS ENUM ('bloqueado', 'disponible', 'en_progreso', 'completado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE estado_rap AS ENUM ('bloqueado', 'disponible', 'en_progreso', 'completado', 'excelencia');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Columna es_obligatoria en actividades
ALTER TABLE actividades ADD COLUMN IF NOT EXISTS es_obligatoria BOOLEAN NOT NULL DEFAULT true;

-- 3. Tabla de intentos ilimitados por actividad (reemplaza la unicidad de resultados_actividades)
CREATE TABLE IF NOT EXISTS intentos_actividad (
  id SERIAL PRIMARY KEY,
  actividad_id INT NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
  aprendiz_id INT NOT NULL REFERENCES usuarios(id),
  numero_intento INT NOT NULL DEFAULT 1,
  estado estado_intento NOT NULL DEFAULT 'no_iniciada',
  respuestas_json JSONB,
  calificacion NUMERIC(5,2),
  fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
  fecha_fin TIMESTAMPTZ,
  duracion_segundos INT,
  url_archivo_entrega VARCHAR(500),
  retroalimentacion TEXT
);

-- 4. Calificación oficial (mejor nota obtenida) por actividad y aprendiz
CREATE TABLE IF NOT EXISTS calificacion_oficial_actividad (
  actividad_id INT NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
  aprendiz_id INT NOT NULL REFERENCES usuarios(id),
  mejor_calificacion NUMERIC(5,2) NOT NULL DEFAULT 0,
  intento_id INT REFERENCES intentos_actividad(id),
  estado estado_intento NOT NULL DEFAULT 'no_iniciada',
  fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (actividad_id, aprendiz_id)
);

-- 5. Progreso del módulo por aprendiz
CREATE TABLE IF NOT EXISTS progreso_modulo_aprendiz (
  modulo_id INT NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  aprendiz_id INT NOT NULL REFERENCES usuarios(id),
  estado estado_modulo NOT NULL DEFAULT 'bloqueado',
  porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0,
  actividades_completadas INT NOT NULL DEFAULT 0,
  actividades_totales INT NOT NULL DEFAULT 0,
  fecha_inicio TIMESTAMPTZ,
  fecha_completado TIMESTAMPTZ,
  PRIMARY KEY (modulo_id, aprendiz_id)
);

-- 6. Progreso del RAP por aprendiz
CREATE TABLE IF NOT EXISTS progreso_rap_aprendiz (
  rap_id INT NOT NULL REFERENCES raps(id) ON DELETE CASCADE,
  aprendiz_id INT NOT NULL REFERENCES usuarios(id),
  estado estado_rap NOT NULL DEFAULT 'bloqueado',
  porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0,
  modulos_completados INT NOT NULL DEFAULT 0,
  modulos_totales INT NOT NULL DEFAULT 0,
  fecha_inicio TIMESTAMPTZ,
  fecha_completado TIMESTAMPTZ,
  PRIMARY KEY (rap_id, aprendiz_id)
);

-- 7. Configuración del programa (umbrales de aprobación y excelencia)
CREATE TABLE IF NOT EXISTS configuracion_programa (
  programa_id INT PRIMARY KEY REFERENCES programas(id) ON DELETE CASCADE,
  porcentaje_aprobacion NUMERIC(5,2) NOT NULL DEFAULT 70,
  porcentaje_excelencia NUMERIC(5,2) NOT NULL DEFAULT 90
);
