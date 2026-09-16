import pkg from 'pg';
const { Pool, Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const dbName = process.env.DB_NAME || 'skyland';

// Connect to default 'postgres' database to ensure the target database exists
async function ensureDatabaseExists() {
  const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres'
  });

  try {
    await client.connect();
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (res.rows.length === 0) {
      console.log(`⚡ La base de datos "${dbName}" no existe. Creándola automáticamente...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Base de datos "${dbName}" creada exitosamente.`);
    }
  } catch (err) {
    console.error('Advertencia al verificar/crear la base de datos:', err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

await ensureDatabaseExists();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: dbName,
});

pool.on('error', (err) => {
  console.error('Error inesperado del cliente inactivo', err);
});

export default pool;
