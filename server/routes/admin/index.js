import express from 'express';
import { verifyToken, requireRole } from '../../middleware/auth.middleware.js';
import dashboardRoutes from './dashboard.routes.js';
import usersRoutes     from './users.routes.js';
import programsRoutes  from './programs.routes.js';
import fichasRoutes    from './fichas.routes.js';

const router = express.Router();

// Aplicar autenticacion y rol admin a todos los sub-routers
router.use('/api/admin', verifyToken, requireRole('admin', 'administrador'));

router.use(dashboardRoutes);
router.use(usersRoutes);
router.use(programsRoutes);
router.use(fichasRoutes);

export default router;
