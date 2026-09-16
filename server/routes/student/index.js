import express from 'express';
import dashboardRoutes  from './dashboard.routes.js';
import modulesRoutes    from './modules.routes.js';
import rapsRoutes       from './raps.routes.js';
import activitiesRoutes from './activities.routes.js';
import progressRoutes   from './progress.routes.js';
import badgesRoutes     from './badges.routes.js';

const router = express.Router();

router.use(dashboardRoutes);
router.use(modulesRoutes);
router.use(rapsRoutes);
router.use(activitiesRoutes);
router.use(progressRoutes);
router.use(badgesRoutes);

export default router;
