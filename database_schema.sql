-- ============================================================
-- SKYLANG — BASE DE DATOS DDL ESQUEMA BASE (PostgreSQL)
-- NOTE: Este archivo contiene las definiciones DDL base consolidadas.
-- El arranque runtime del servidor (bootstrap) carga e inicializa la BD
-- mediante initializeDatabaseSchema() y seedDefaultAcademicContent() en server/services/seed.service.js.
-- ============================================================
--
-- ESTRUCTURA:
-- PROGRAMA
--   └── FASE
--        └── MODULO
--             ├── MODULO_RAP
--             │    └── RAP
--             │         └── RAP_MOMENTO
--             │              ├── CONTENIDOS
--             │              └── ACTIVIDADES
--             └── EVALUACION
--
-- FICHA:
--   ├── INSTRUCTORES
--   └── APRENDICES
--
-- CONTENIDOS Y ACTIVIDADES pertenecen a una FICHA.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TIPOS ENUM
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'rol_usuario'
    ) THEN
        CREATE TYPE rol_usuario AS ENUM (
            'admin',
            'instructor',
            'aprendiz'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'estado_actividad'
    ) THEN
        CREATE TYPE estado_actividad AS ENUM (
            'pendiente',
            'en_progreso',
            'revisada',
            'aprobada',
            'reprobada'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'tipo_actividad'
    ) THEN
        CREATE TYPE tipo_actividad AS ENUM (
            'warm_up',
            'grammar_pill',
            'vocabulario',
            'storybook',
            'formulario',
            'listening',
            'spelling',
            'caso_clinico',
            'grabacion_audio',
            'grabacion_video',
            'quiz',
            'drag_drop',
            'h5p',
            'otro'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'tipo_notificacion'
    ) THEN
        CREATE TYPE tipo_notificacion AS ENUM (
            'sistema',
            'actividad',
            'evaluacion',
            'insignia',
            'recordatorio',
            'otro'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'origen_puntos'
    ) THEN
        CREATE TYPE origen_puntos AS ENUM (
            'actividad',
            'evaluacion',
            'insignia',
            'bonificacion',
            'otro'
        );
    END IF;

END $$;


-- ============================================================
-- 2. USUARIOS
-- ============================================================

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,

    nombre VARCHAR(150) NOT NULL,

    correo VARCHAR(150) NOT NULL UNIQUE,

    contrasena_hash VARCHAR(255) NOT NULL,

    rol rol_usuario NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    intentos_fallidos INTEGER NOT NULL DEFAULT 0,

    bloqueado_hasta TIMESTAMPTZ,

    ultimo_acceso TIMESTAMPTZ,

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    identificacion VARCHAR(50),

    documento_identidad VARCHAR(50),

    telefono VARCHAR(50)
);


-- ============================================================
-- 3. PROGRAMAS
-- ============================================================

CREATE TABLE programas (
    id SERIAL PRIMARY KEY,

    nombre VARCHAR(200) NOT NULL UNIQUE,

    descripcion TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 4. FASES
--
-- 1. Análisis
-- 2. Planeación
-- 3. Ejecución
-- 4. Evaluación
-- ============================================================

CREATE TABLE fases (
    id SERIAL PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL UNIQUE,

    descripcion TEXT,

    orden INTEGER NOT NULL UNIQUE,

    CHECK (orden > 0)
);


-- ============================================================
-- 5. MODULOS
-- ============================================================

CREATE TABLE modulos (
    id SERIAL PRIMARY KEY,

    programa_id INTEGER NOT NULL
        REFERENCES programas(id)
        ON DELETE CASCADE,

    fase_id INTEGER NOT NULL
        REFERENCES fases(id)
        ON DELETE RESTRICT,

    titulo VARCHAR(200) NOT NULL,

    descripcion TEXT,

    orden INTEGER NOT NULL,

    UNIQUE (programa_id, orden),

    CHECK (orden > 0)
);


-- ============================================================
-- 6. RAPS
-- ============================================================

CREATE TABLE raps (
    id SERIAL PRIMARY KEY,

    programa_id INTEGER NOT NULL
        REFERENCES programas(id)
        ON DELETE CASCADE,

    titulo VARCHAR(200) NOT NULL,

    descripcion TEXT,

    orden INTEGER NOT NULL,

    UNIQUE (programa_id, orden),

    CHECK (orden > 0)
);


-- ============================================================
-- 7. MODULO_RAP
--
-- Relación:
--
-- MODULO 1 → RAP 1
-- MODULO 2 → RAP 2 + RAP 3
-- MODULO 3 → RAP 4 + RAP 5
-- MODULO 4 → RAP 6
--
-- Esta es la UNICA fuente de verdad de la relación.
-- ============================================================

CREATE TABLE modulo_rap (
    id SERIAL PRIMARY KEY,

    modulo_id INTEGER NOT NULL
        REFERENCES modulos(id)
        ON DELETE CASCADE,

    rap_id INTEGER NOT NULL
        REFERENCES raps(id)
        ON DELETE CASCADE,

    orden INTEGER NOT NULL,

    UNIQUE (modulo_id, rap_id),

    UNIQUE (rap_id, orden),

    CHECK (orden > 0)
);


-- ============================================================
-- 8. MOMENTOS
--
-- Son los mismos para TODOS los RAP.
-- ============================================================

CREATE TABLE momentos (
    id SERIAL PRIMARY KEY,

    codigo VARCHAR(50) NOT NULL UNIQUE,

    nombre VARCHAR(150) NOT NULL UNIQUE,

    descripcion TEXT,

    orden INTEGER NOT NULL UNIQUE,

    CHECK (orden BETWEEN 1 AND 4)
);


-- ============================================================
-- 9. RAP_MOMENTOS
--
-- Cada RAP tiene:
--
-- 1. Preparación
-- 2. Absorción
-- 3. Práctica y aplicación
-- 4. Cierre
--
-- El contenido cambia dependiendo del RAP.
-- ============================================================

CREATE TABLE rap_momentos (
    id SERIAL PRIMARY KEY,

    rap_id INTEGER NOT NULL
        REFERENCES raps(id)
        ON DELETE CASCADE,

    momento_id INTEGER NOT NULL
        REFERENCES momentos(id)
        ON DELETE RESTRICT,

    orden INTEGER NOT NULL,

    UNIQUE (rap_id, momento_id),

    UNIQUE (rap_id, orden),

    CHECK (orden BETWEEN 1 AND 4)
);


-- ============================================================
-- 10. FICHAS
--
-- Una ficha representa una cohorte/grupo concreto.
--
-- IMPORTANTE:
-- Los contenidos y actividades pertenecen a una ficha.
-- ============================================================

CREATE TABLE fichas (
    id SERIAL PRIMARY KEY,

    programa_id INTEGER NOT NULL
        REFERENCES programas(id)
        ON DELETE CASCADE,

    numero_ficha VARCHAR(50) NOT NULL UNIQUE,

    nombre VARCHAR(200),

    fecha_inicio DATE NOT NULL,

    fecha_fin DATE NOT NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    descripcion TEXT,

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (fecha_fin >= fecha_inicio)
);


-- ============================================================
-- 11. INSTRUCTOR_FICHA
--
-- Un instructor puede tener varias fichas.
-- Una ficha puede tener uno o varios instructores.
-- ============================================================

CREATE TABLE instructor_ficha (
    instructor_id INTEGER NOT NULL
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    ficha_id INTEGER NOT NULL
        REFERENCES fichas(id)
        ON DELETE CASCADE,

    fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (instructor_id, ficha_id)
);


-- ============================================================
-- 12. APRENDIZ_FICHA
--
-- Un aprendiz puede estar en una o varias fichas.
-- ============================================================

CREATE TABLE aprendiz_ficha (
    aprendiz_id INTEGER NOT NULL
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    ficha_id INTEGER NOT NULL
        REFERENCES fichas(id)
        ON DELETE CASCADE,

    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    estado VARCHAR(30) NOT NULL DEFAULT 'activo',

    PRIMARY KEY (aprendiz_id, ficha_id)
);


-- ============================================================
-- 13. RECURSOS
-- ============================================================

CREATE TABLE recursos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    titulo VARCHAR(255),

    ruta_archivo VARCHAR(500) NOT NULL,

    tipo_mime VARCHAR(100),

    subido_por INTEGER
        REFERENCES usuarios(id)
        ON DELETE SET NULL,

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 14. CONTENIDOS
--
-- IMPORTANTE:
-- El contenido pertenece a UNA FICHA.
--
-- NO es global para todas las fichas del programa.
-- ============================================================

CREATE TABLE contenidos (
    id SERIAL PRIMARY KEY,

    ficha_id INTEGER NOT NULL
        REFERENCES fichas(id)
        ON DELETE CASCADE,

    titulo VARCHAR(200) NOT NULL,

    cuerpo_texto TEXT,

    recurso_id UUID
        REFERENCES recursos(id)
        ON DELETE SET NULL,

    creado_por INTEGER NOT NULL
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 15. RAP_MOMENTO_CONTENIDOS
--
-- Define en qué RAP/MOMENTO aparece un contenido.
-- ============================================================

CREATE TABLE rap_momento_contenidos (
    id SERIAL PRIMARY KEY,

    rap_momento_id INTEGER NOT NULL
        REFERENCES rap_momentos(id)
        ON DELETE CASCADE,

    contenido_id INTEGER NOT NULL
        REFERENCES contenidos(id)
        ON DELETE CASCADE,

    orden INTEGER NOT NULL,

    UNIQUE (rap_momento_id, contenido_id),

    UNIQUE (rap_momento_id, orden),

    CHECK (orden > 0)
);


-- ============================================================
-- 16. ACTIVIDADES
--
-- IMPORTANTE:
-- Las actividades pertenecen a UNA FICHA.
--
-- Esto evita que una actividad creada para una ficha
-- aparezca automáticamente en todas las fichas del programa.
-- ============================================================

CREATE TABLE actividades (
    id SERIAL PRIMARY KEY,

    ficha_id INTEGER NOT NULL
        REFERENCES fichas(id)
        ON DELETE CASCADE,

    tipo tipo_actividad NOT NULL,

    titulo VARCHAR(200) NOT NULL,

    instrucciones TEXT,

    datos_json JSONB,

    h5p_recurso_id UUID
        REFERENCES recursos(id)
        ON DELETE SET NULL,

    obligatoria BOOLEAN NOT NULL DEFAULT TRUE,

    creado_por INTEGER NOT NULL
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 17. RAP_MOMENTO_ACTIVIDADES
--
-- Una actividad puede reutilizarse en varios RAP/MOMENTOS.
--
-- Ejemplo:
--
-- Actividad X
--     ↓
-- RAP 2 / Momento 2
-- RAP 3 / Momento 2
--
-- Sin duplicar la actividad.
-- ============================================================

CREATE TABLE rap_momento_actividades (
    id SERIAL PRIMARY KEY,

    rap_momento_id INTEGER NOT NULL
        REFERENCES rap_momentos(id)
        ON DELETE CASCADE,

    actividad_id INTEGER NOT NULL
        REFERENCES actividades(id)
        ON DELETE CASCADE,

    orden INTEGER NOT NULL,

    UNIQUE (rap_momento_id, actividad_id),

    UNIQUE (rap_momento_id, orden),

    CHECK (orden > 0)
);


-- ============================================================
-- 18. RESULTADOS DE ACTIVIDADES
--
-- Resumen/resultado oficial del aprendiz.
-- ============================================================

CREATE TABLE resultados_actividades (
    id SERIAL PRIMARY KEY,

    actividad_id INTEGER NOT NULL
        REFERENCES actividades(id)
        ON DELETE CASCADE,

    aprendiz_id INTEGER NOT NULL
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    url_archivo_entrega VARCHAR(500),

    calificacion NUMERIC(5,2),

    estado estado_actividad NOT NULL DEFAULT 'pendiente',

    primer_intento_en TIMESTAMPTZ,

    numero_intentos INTEGER NOT NULL DEFAULT 0,

    mejor_calificacion NUMERIC(5,2),

    fecha_ultimo_envio TIMESTAMPTZ,

    UNIQUE (actividad_id, aprendiz_id),

    CHECK (
        calificacion IS NULL
        OR
        calificacion BETWEEN 0 AND 100
    ),

    CHECK (
        mejor_calificacion IS NULL
        OR
        mejor_calificacion BETWEEN 0 AND 100
    ),

    CHECK (numero_intentos >= 0)
);


-- ============================================================
-- 19. INTENTOS DE ACTIVIDAD
-- ============================================================

CREATE TABLE intentos_actividad (
    id SERIAL PRIMARY KEY,

    actividad_id INTEGER NOT NULL
        REFERENCES actividades(id)
        ON DELETE CASCADE,

    aprendiz_id INTEGER NOT NULL
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    numero_intento INTEGER NOT NULL DEFAULT 1,

    estado VARCHAR(50) NOT NULL DEFAULT 'no_iniciada',

    respuestas_json JSONB,

    calificacion NUMERIC(5,2),

    fecha_inicio TIMESTAMPTZ DEFAULT NOW(),

    fecha_fin TIMESTAMPTZ,

    duracion_segundos INT,

    url_archivo_entrega VARCHAR(500),

    retroalimentacion TEXT,

    UNIQUE (
        actividad_id,
        aprendiz_id,
        numero_intento
    ),

    CHECK (numero_intento > 0),

    CHECK (
        calificacion IS NULL
        OR
        calificacion BETWEEN 0 AND 100
    )
);


-- ============================================================
-- 20. EVALUACIONES
--
-- UNA EVALUACION POR MODULO.
--
-- Se mantiene a nivel de MODULO.
-- ============================================================

CREATE TABLE evaluaciones (
    id SERIAL PRIMARY KEY,

    modulo_id INTEGER NOT NULL
        REFERENCES modulos(id)
        ON DELETE CASCADE,

    titulo VARCHAR(200) NOT NULL,

    descripcion TEXT,

    preguntas_json JSONB NOT NULL,

    intentos_maximos INTEGER NOT NULL DEFAULT 1,

    porcentaje_aprobacion NUMERIC(5,2) NOT NULL DEFAULT 70,

    UNIQUE (modulo_id),

    CHECK (intentos_maximos > 0),

    CHECK (
        porcentaje_aprobacion BETWEEN 0 AND 100
    )
);


-- ============================================================
-- 21. RESULTADOS DE EVALUACIONES
-- ============================================================

CREATE TABLE resultados_evaluaciones (
    id SERIAL PRIMARY KEY,

    evaluacion_id INTEGER NOT NULL
        REFERENCES evaluaciones(id)
        ON DELETE CASCADE,

    aprendiz_id INTEGER NOT NULL
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    numero_intento INTEGER NOT NULL,

    puntaje NUMERIC(5,2) NOT NULL,

    puntos_ganados INTEGER NOT NULL DEFAULT 0,

    aprobada BOOLEAN NOT NULL DEFAULT FALSE,

    respuestas_json JSONB,

    fecha_envio TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (
        evaluacion_id,
        aprendiz_id,
        numero_intento
    ),

    CHECK (numero_intento > 0),

    CHECK (
        puntaje BETWEEN 0 AND 100
    )
);


-- ============================================================
-- 22. PUNTOS
-- ============================================================

CREATE TABLE registro_puntos (
    id SERIAL PRIMARY KEY,

    aprendiz_id INTEGER NOT NULL
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    ficha_id INTEGER NOT NULL
        REFERENCES fichas(id)
        ON DELETE RESTRICT,

    actividad_id INTEGER
        REFERENCES actividades(id)
        ON DELETE RESTRICT,

    evaluacion_id INTEGER
        REFERENCES evaluaciones(id)
        ON DELETE RESTRICT,

    origen origen_puntos NOT NULL,

    cantidad_puntos INTEGER NOT NULL,

    fecha_obtencion TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (cantidad_puntos <> 0),

    CHECK (
        (
            actividad_id IS NOT NULL
            AND evaluacion_id IS NULL
        )
        OR
        (
            actividad_id IS NULL
            AND evaluacion_id IS NOT NULL
        )
        OR
        (
            actividad_id IS NULL
            AND evaluacion_id IS NULL
        )
    )
);


-- ============================================================
-- 23. INSIGNIAS
-- ============================================================

CREATE TABLE insignias (
    id SERIAL PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL,

    descripcion TEXT,

    codigo_criterio VARCHAR(100) UNIQUE,

    tipo_badge VARCHAR(50) DEFAULT 'gold'
);


-- ============================================================
-- 24. INSIGNIAS_APRENDIZ
-- ============================================================

CREATE TABLE insignias_aprendiz (
    aprendiz_id INTEGER NOT NULL
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    insignia_id INTEGER NOT NULL
        REFERENCES insignias(id)
        ON DELETE CASCADE,

    fecha_otorgada TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (
        aprendiz_id,
        insignia_id
    )
);


-- ============================================================
-- 25. RETROALIMENTACION
-- ============================================================

CREATE TABLE retroalimentacion_instructor (
    id SERIAL PRIMARY KEY,

    resultado_actividad_id INTEGER NOT NULL
        REFERENCES resultados_actividades(id)
        ON DELETE CASCADE,

    instructor_id INTEGER NOT NULL
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    comentario TEXT NOT NULL,

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 26. NOTIFICACIONES
-- ============================================================

CREATE TABLE notificaciones (
    id SERIAL PRIMARY KEY,

    usuario_id INTEGER NOT NULL
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    tipo tipo_notificacion NOT NULL,

    titulo VARCHAR(200),

    mensaje TEXT,

    leido BOOLEAN NOT NULL DEFAULT FALSE,

    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    fecha_lectura TIMESTAMPTZ
);


-- ============================================================
-- 27. INTENTOS DE LOGIN
-- ============================================================

CREATE TABLE intentos_login (
    id SERIAL PRIMARY KEY,

    correo VARCHAR(150) NOT NULL,

    direccion_ip VARCHAR(45),

    exitoso BOOLEAN NOT NULL DEFAULT FALSE,

    fecha_intento TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 28. SESIONES DE ESTUDIO
-- ============================================================

CREATE TABLE sesiones_estudio (
    id SERIAL PRIMARY KEY,

    aprendiz_id INTEGER NOT NULL
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    ficha_id INTEGER
        REFERENCES fichas(id)
        ON DELETE SET NULL,

    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    fecha_fin TIMESTAMPTZ,

    minutos_totales INTEGER,

    CHECK (
        minutos_totales IS NULL
        OR
        minutos_totales >= 0
    )
);


-- ============================================================
-- 29. REPORTES
-- ============================================================

CREATE TABLE reportes_generados (
    id SERIAL PRIMARY KEY,

    instructor_id INTEGER
        REFERENCES usuarios(id)
        ON DELETE SET NULL,

    ficha_id INTEGER
        REFERENCES fichas(id)
        ON DELETE SET NULL,

    nombre VARCHAR(255) NOT NULL,

    descripcion TEXT,

    tipo VARCHAR(50),

    filtros JSONB,

    recurso_id UUID
        REFERENCES recursos(id)
        ON DELETE SET NULL,

    fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 30. INDICES
-- ============================================================

CREATE INDEX idx_modulos_programa
ON modulos(programa_id);

CREATE INDEX idx_modulos_fase
ON modulos(fase_id);

CREATE INDEX idx_raps_programa
ON raps(programa_id);

CREATE INDEX idx_modulo_rap_modulo
ON modulo_rap(modulo_id);

CREATE INDEX idx_modulo_rap_rap
ON modulo_rap(rap_id);

CREATE INDEX idx_rap_momentos_rap
ON rap_momentos(rap_id);

CREATE INDEX idx_rap_momentos_momento
ON rap_momentos(momento_id);

CREATE INDEX idx_fichas_programa
ON fichas(programa_id);

CREATE INDEX idx_instructor_ficha_ficha
ON instructor_ficha(ficha_id);

CREATE INDEX idx_aprendiz_ficha_ficha
ON aprendiz_ficha(ficha_id);

CREATE INDEX idx_contenidos_ficha
ON contenidos(ficha_id);

CREATE INDEX idx_actividades_ficha
ON actividades(ficha_id);

CREATE INDEX idx_rap_momento_contenidos
ON rap_momento_contenidos(rap_momento_id);

CREATE INDEX idx_rap_momento_actividades
ON rap_momento_actividades(rap_momento_id);

CREATE INDEX idx_rap_momento_actividades_actividad
ON rap_momento_actividades(actividad_id);

CREATE INDEX idx_resultados_actividad_aprendiz
ON resultados_actividades(aprendiz_id);

CREATE INDEX idx_intentos_actividad_aprendiz
ON intentos_actividad(
    actividad_id,
    aprendiz_id
);

CREATE INDEX idx_resultados_evaluacion_aprendiz
ON resultados_evaluaciones(aprendiz_id);

CREATE INDEX idx_puntos_aprendiz
ON registro_puntos(aprendiz_id);

CREATE INDEX idx_notificaciones_usuario
ON notificaciones(usuario_id);

CREATE INDEX idx_sesiones_aprendiz
ON sesiones_estudio(aprendiz_id);


-- ============================================================
-- 31. INDICES PARA EVITAR DUPLICACION DE PUNTOS
-- ============================================================

CREATE UNIQUE INDEX uq_puntos_actividad
ON registro_puntos(
    aprendiz_id,
    actividad_id
)
WHERE actividad_id IS NOT NULL;


CREATE UNIQUE INDEX uq_puntos_evaluacion
ON registro_puntos(
    aprendiz_id,
    evaluacion_id
)
WHERE evaluacion_id IS NOT NULL;


-- ============================================================
-- 32. DATOS BASE - FASES
-- ============================================================

INSERT INTO fases (
    nombre,
    descripcion,
    orden
)
VALUES
(
    'Análisis',
    'Fase de análisis del programa de formación.',
    1
),
(
    'Planeación',
    'Fase de planeación del programa de formación.',
    2
),
(
    'Ejecución',
    'Fase de ejecución del programa de formación.',
    3
),
(
    'Evaluación',
    'Fase de evaluación del programa de formación.',
    4
);


-- ============================================================
-- 33. DATOS BASE - MOMENTOS
-- ============================================================

INSERT INTO momentos (
    codigo,
    nombre,
    descripcion,
    orden
)
VALUES
(
    'PREPARACION',
    'Preparación',
    'Introducción, objetivos y activación de conocimientos previos.',
    1
),
(
    'ABSORCION',
    'Absorción del conocimiento',
    'Presentación y explicación de nuevos conocimientos.',
    2
),
(
    'PRACTICA',
    'Práctica y aplicación',
    'Aplicación práctica de los conocimientos adquiridos.',
    3
),
(
    'CIERRE',
    'Cierre',
    'Evaluación, consolidación y cierre del aprendizaje.',
    4
);


COMMIT;
