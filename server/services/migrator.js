import fs from 'fs';
import path from 'path';
import pool from '../db.js';

const MIGRATIONS_DIR = path.join(process.cwd(), 'server', 'migrations');

/**
 * PostgreSQL no permite ejecutar ALTER TYPE ADD VALUE dentro de una
 * transacción explícita. Esta función separa esas sentencias del resto
 * para ejecutarlas directamente (sin BEGIN/COMMIT).
 */
function separarSentencias(sql) {
  const fueraTx = [];
  // Extraer sentencias ALTER TYPE ... ADD VALUE que PostgreSQL no permite dentro de transacciones explícitas
  const regexAlterType = /ALTER\s+TYPE\s+[^\n;]+ADD\s+VALUE[^\n;]*;/gi;
  let match;
  while ((match = regexAlterType.exec(sql)) !== null) {
    fueraTx.push(match[0].trim());
  }

  // El resto del SQL se ejecuta completo dentro de la transacción, preservando bloques DO $$ y comentarios
  const dentroDeTx = sql.replace(regexAlterType, '').trim();
  return { fueraTx, dentroDeTx };
}

/**
 * Ejecuta las migraciones pendientes en orden de nombre de archivo.
 *
 * Cada migración corre dentro de su propia transacción y se registra en
 * schema_migrations. Una migración ya aplicada nunca vuelve a ejecutarse, y si
 * una falla el proceso se detiene: es preferible no arrancar a arrancar con el
 * esquema a medias.
 *
 * Excepción: las sentencias ALTER TYPE ADD VALUE se ejecutan fuera de
 * transacción porque PostgreSQL lo exige.
 */
export async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version      VARCHAR(255) PRIMARY KEY,
      aplicada_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      duracion_ms  INTEGER
    )
  `);

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.warn('⚠️  No existe el directorio de migraciones:', MIGRATIONS_DIR);
    return;
  }

  const archivos = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const aplicadasRes = await pool.query('SELECT version FROM schema_migrations');
  const aplicadas = new Set(aplicadasRes.rows.map((r) => r.version));

  const pendientes = archivos.filter((f) => !aplicadas.has(f));
  if (pendientes.length === 0) {
    console.log(`✅ Esquema al día (${aplicadas.size} migraciones aplicadas).`);
    return;
  }

  for (const archivo of pendientes) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, archivo), 'utf8');
    const inicio = Date.now();
    const { fueraTx, dentroDeTx } = separarSentencias(sql);

    try {
      // 1. Sentencias que no pueden ir dentro de una transacción (ALTER TYPE ADD VALUE)
      for (const stmt of fueraTx) {
        await pool.query(stmt);
      }

      // 2. Resto de la migración + registro en schema_migrations, en una transacción
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        if (dentroDeTx) {
          await client.query(dentroDeTx);
        }
        await client.query(
          'INSERT INTO schema_migrations (version, duracion_ms) VALUES ($1, $2)',
          [archivo, Date.now() - inicio]
        );
        await client.query('COMMIT');
        console.log(`✅ Migración aplicada: ${archivo} (${Date.now() - inicio} ms)`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(`❌ Falló la migración ${archivo}: ${err.message}`);
      throw err;
    }
  }
}
