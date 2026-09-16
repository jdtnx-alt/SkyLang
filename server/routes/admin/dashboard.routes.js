import express from 'express';
import pool from '../../db.js';

const router = express.Router();

router.get('/api/db-status', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, status: 'Connected (PostgreSQL)' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/api/admin/roles', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(CASE WHEN rol::text = 'aprendiz' THEN 1 END) as student_count,
        COUNT(CASE WHEN rol::text = 'instructor' THEN 1 END) as instructor_count,
        COUNT(CASE WHEN rol::text IN ('admin', 'administrador') THEN 1 END) as admin_count
      FROM usuarios
    `);
    const r = result.rows[0];
    res.json({
      studentCount: parseInt(r.student_count) || 0,
      instructorCount: parseInt(r.instructor_count) || 0,
      adminCount: parseInt(r.admin_count) || 0
    });
  } catch (error) {
    console.error('Error fetching admin roles count:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/api/admin/dashboard', async (req, res) => {
  try {
    const usersRes = await pool.query(`
      SELECT COUNT(*) as total_users,
             COUNT(CASE WHEN rol::text = 'aprendiz' THEN 1 END) as students,
             COUNT(CASE WHEN rol::text = 'instructor' THEN 1 END) as instructors,
             COUNT(CASE WHEN rol::text IN ('admin', 'administrador') THEN 1 END) as admins,
             COUNT(CASE WHEN rol::text = 'aprendiz' AND activo = true THEN 1 END) as active_students
      FROM usuarios
    `);
    const rapsRes    = await pool.query(`SELECT COUNT(*) as total_raps FROM raps`);
    const modulesRes = await pool.query(`SELECT COUNT(*) as total_modules FROM modulos`);

    const totalUsers     = parseInt(usersRes.rows[0].total_users) || 0;
    const students       = parseInt(usersRes.rows[0].students) || 0;
    const instructors    = parseInt(usersRes.rows[0].instructors) || 0;
    const admins         = parseInt(usersRes.rows[0].admins) || 0;
    const activeStudents = parseInt(usersRes.rows[0].active_students) || 0;
    const activeRate     = students > 0 ? Math.round((activeStudents / students) * 100) : 100;

    const monthsRes = await pool.query(`
      SELECT TO_CHAR(fecha_creacion, 'Mon') as month, COUNT(*) as users
      FROM usuarios
      GROUP BY TO_CHAR(fecha_creacion, 'Mon'), DATE_TRUNC('month', fecha_creacion)
      ORDER BY DATE_TRUNC('month', fecha_creacion) ASC LIMIT 6
    `);

    const userGrowthData = monthsRes.rows.length > 0
      ? monthsRes.rows.map(r => ({ month: r.month, users: parseInt(r.users) || 0 }))
      : [
          { month: 'Ene', users: Math.max(1, Math.round(totalUsers * 0.4)) },
          { month: 'Feb', users: Math.max(1, Math.round(totalUsers * 0.7)) },
          { month: 'Mar', users: totalUsers }
        ];

    const recentUsersRes = await pool.query(`SELECT nombre, fecha_creacion FROM usuarios ORDER BY fecha_creacion DESC LIMIT 5`);

    res.json({
      totalUsers, activeStudents, activeRate,
      totalRaps: parseInt(rapsRes.rows[0].total_raps) || 0,
      totalModules: parseInt(modulesRes.rows[0].total_modules) || 0,
      dailyActive: Math.round(activeStudents * 0.7),
      usersByRole: { students, instructors, admins },
      userGrowthData,
      activityData: [
        { day: 'Lun', logins: Math.round(activeStudents * 0.8) },
        { day: 'Mar', logins: Math.round(activeStudents * 0.9) },
        { day: 'Mie', logins: Math.round(activeStudents * 0.85) },
        { day: 'Jue', logins: Math.round(activeStudents * 0.95) },
        { day: 'Vie', logins: Math.round(activeStudents * 0.75) },
        { day: 'Sab', logins: Math.round(activeStudents * 0.4) },
        { day: 'Dom', logins: Math.round(activeStudents * 0.3) }
      ],
      recentActivity: recentUsersRes.rows.map(u => ({
        text: `Usuario registrado: ${u.nombre}`,
        time: new Date(u.fecha_creacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      }))
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard de admin:', error);
    res.status(500).json({ error: 'Server error al obtener estadísticas del dashboard' });
  }
});

router.get('/api/admin/content', async (req, res) => {
  try {
    const rapsRes      = await pool.query('SELECT COUNT(*) FROM raps');
    const modulesRes   = await pool.query('SELECT COUNT(*) FROM modulos');
    const resourcesRes = await pool.query('SELECT tipo_mime, COUNT(*) FROM recursos GROUP BY tipo_mime');

    let videoCount = 0, audioCount = 0, imageCount = 0;
    resourcesRes.rows.forEach(r => {
      if (r.tipo_mime?.startsWith('video/')) videoCount += parseInt(r.count);
      if (r.tipo_mime?.startsWith('audio/')) audioCount += parseInt(r.count);
      if (r.tipo_mime?.startsWith('image/')) imageCount += parseInt(r.count);
    });

    const programsOverviewRes = await pool.query(`
      SELECT p.id, p.nombre as name,
             (SELECT COUNT(*) FROM raps r WHERE r.programa_id = p.id) as raps,
             (SELECT COUNT(*) FROM modulos m WHERE m.programa_id = p.id) as modules
      FROM programas p ORDER BY p.id DESC LIMIT 10
    `);

    const recentRes = await pool.query(`
      SELECT titulo as title, tipo_mime as type, 'Admin' as author, fecha_creacion as date, 'Published' as status
      FROM recursos ORDER BY fecha_creacion DESC LIMIT 5
    `);

    res.json({
      contentStats: [
        { type: 'RAPS',    count: parseInt(rapsRes.rows[0].count) },
        { type: 'Modules', count: parseInt(modulesRes.rows[0].count) },
        { type: 'Videos',  count: videoCount },
        { type: 'Audio',   count: audioCount },
        { type: 'Images',  count: imageCount }
      ],
      rapsOverview: programsOverviewRes.rows.map(r => ({
        name: r.name, modules: parseInt(r.modules), status: 'Published'
      })),
      storageUsage: { totalUsed: 0, totalLimit: 10, percentage: 0, videos: '0 MB', audio: '0 MB', images: '0 MB', documents: '0 MB' },
      recentContent: recentRes.rows.map(r => ({
        title: r.title, type: r.type ? r.type.split('/')[0] : 'Document',
        author: r.author, date: new Date(r.date).toLocaleDateString(), status: r.status
      }))
    });
  } catch (error) {
    console.error('Error fetching admin content:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
