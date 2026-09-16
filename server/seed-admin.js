import bcrypt from 'bcryptjs';
import pool from './db.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedAdmin() {
  try {
    const email = 'skyland@gmail.com';
    const password = '1234';
    const nombre = 'Administrador SkyLand';

    // Verificar si ya existe
    const exists = await pool.query('SELECT id FROM usuarios WHERE correo = $1', [email]);
    if (exists.rows.length > 0) {
      console.log('El administrador ya existe en la base de datos.');
      process.exit(0);
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insertar administrador
    await pool.query(
      'INSERT INTO usuarios (nombre, correo, contrasena_hash, rol) VALUES ($1, $2, $3, $4)',
      [nombre, email, hashedPassword, 'admin']
    );

    console.log('Administrador creado exitosamente!');
    console.log('  Correo: skyland@gmail.com');
    console.log('  Contraseña: 1234');
    process.exit(0);
  } catch (error) {
    console.error('Error al crear administrador:', error);
    process.exit(1);
  }
}

seedAdmin();
