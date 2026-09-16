import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import {
  initializeDatabaseSchema,
  seedDefaultAcademicContent
} from './services/seed.service.js';
import { runMigrations } from './services/migrator.js';

import authRoutes       from './routes/auth.routes.js';
import adminRoutes      from './routes/admin/index.js';
import instructorRoutes from './routes/instructor/index.js';
import studentRoutes    from './routes/student/index.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('❌ ERROR CRÍTICO: La variable de entorno JWT_SECRET no está definida en el archivo .env.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Mount Modular Routes
app.use(authRoutes);
app.use(adminRoutes);
app.use(instructorRoutes);
app.use(studentRoutes);

// Database Bootstrap & Initialization
// El sembrado solo corre bajo demanda. En producción está apagado salvo que se pida
// explícitamente: el arranque no debe tocar el contenido académico de una base viva.
const seedOnBoot = process.env.SEED_ON_BOOT
  ? process.env.SEED_ON_BOOT === 'true'
  : process.env.NODE_ENV !== 'production';

async function startServer() {
  try {
    await initializeDatabaseSchema();
    await runMigrations();
  } catch (err) {
    // Sin esquema válido no se atiende tráfico: es preferible no arrancar a
    // arrancar con la base a medio construir y fallar en silencio más tarde.
    console.error('❌ No se pudo preparar la base de datos:', err.message);
    process.exit(1);
  }

  if (seedOnBoot) {
    await seedDefaultAcademicContent();
  } else {
    console.log('ℹ️  Sembrado de contenido omitido (SEED_ON_BOOT=false).');
  }

  app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
  });
}

startServer();
