# SkyLang

Plataforma de ingles tecnico para enfermeria con modulos, RAPs, momentos y juegos interactivos.

## Requisitos

- Node.js 20 o superior
- PostgreSQL local
- npm

## Configuracion inicial

1. Instala dependencias:

```bash
npm install
```

2. Crea tu archivo de entorno:

```bash
cp .env.example .env
```

En Windows tambien puedes crear `.env` manualmente copiando el contenido de `.env.example`.

3. Ajusta las variables de PostgreSQL en `.env`.

4. Inicia el backend:

```bash
npm run server
```

Con `SEED_ON_BOOT=true`, el backend crea el esquema base, usuarios demo, fichas, modulos, RAPs y publica los juegos interactivos.

5. Inicia el frontend en otra terminal:

```bash
npm run dev
```

La app queda disponible en `http://127.0.0.1:5173/`.

## Usuarios demo

Si `SEED_DEMO_USERS=true`, se crean usuarios de demostracion con contrasena `1234`.

- `admin@sena.edu.co` (Administrador)
- `instructor@sena.edu.co` (Instructor)
- `aprendiz@sena.edu.co` (Aprendiz 1)
- `aprendiz2@sena.edu.co` (Aprendiz 2)
- `aprendiz3@sena.edu.co` (Aprendiz 3)

## Juegos interactivos

Los juegos se publican automaticamente durante el sembrado. Si necesitas regenerarlos en una base existente:

```bash
npm run seed:games
```

Este comando crea o actualiza los juegos de los 6 RAPs para las fichas activas.

## Comandos utiles

```bash
npm run build
npm test
npm run server
npm run dev
```

No se versionan `node_modules`, `dist`, `.env` ni archivos subidos por usuarios. Cada desarrollador debe instalar dependencias y configurar su entorno local.
