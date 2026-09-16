import pool from '../db.js';

/**
 * Obtiene la ficha activa de un aprendiz.
 * Si tiene varias fichas activas, retorna la mas reciente.
 * @param {number} aprendizId
 * @returns {{ ficha_id, programa_id, numero_ficha } | null}
 */
export async function getFichaDelAprendiz(aprendizId) {
  const res = await pool.query(
    `SELECT af.ficha_id, f.programa_id, f.numero_ficha
     FROM aprendiz_ficha af
     JOIN fichas f ON f.id = af.ficha_id
     WHERE af.aprendiz_id = $1 AND f.activo = true
     ORDER BY af.fecha_registro DESC
     LIMIT 1`,
    [aprendizId]
  );
  return res.rows[0] || null;
}

/**
 * Decide si quien hace la peticion puede ver los datos academicos de un aprendiz.
 * El aprendiz se ve a si mismo, el instructor ve a los de sus fichas, el admin a todos.
 * @param {{ id: number, rol: string }} user  usuario autenticado (req.user)
 * @param {number|string} aprendizId
 * @returns {Promise<boolean>}
 */
export async function puedeVerAlAprendiz(user, aprendizId) {
  const rol = (user?.rol || '').toLowerCase();
  if (rol === 'admin' || rol === 'administrador') return true;
  if (String(user?.id) === String(aprendizId)) return true;

  if (rol === 'instructor') {
    const res = await pool.query(
      `SELECT 1 FROM aprendiz_ficha af
       JOIN instructor_ficha ifi ON ifi.ficha_id = af.ficha_id
       WHERE af.aprendiz_id = $1 AND ifi.instructor_id = $2
       LIMIT 1`,
      [aprendizId, user.id]
    );
    return res.rows.length > 0;
  }

  return false;
}

/**
 * Calcula nivel y puntos a partir del total acumulado.
 */
export function calculateLevelInfo(totalPoints) {
  const basePointsPerLevel = 1000;
  const level = Math.floor(totalPoints / basePointsPerLevel) + 1;
  const pointsInCurrentLevel = totalPoints % basePointsPerLevel;
  const nextLevelPoints = level * basePointsPerLevel;
  return {
    level,
    points: totalPoints,
    totalPoints,                 // la pantalla lo lee con este nombre
    pointsInCurrentLevel,        // antes salía vacío: el nombre no coincidía
    nextLevelPoints,
    progressPercentage: Math.round((pointsInCurrentLevel / basePointsPerLevel) * 100)
  };
}
