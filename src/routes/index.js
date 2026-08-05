import { Router } from 'express';
import authRoutes from './auth.routes.js';
import projectRoutes from './project.routes.js';
import leadRoutes from './lead.routes.js';
import followupRoutes from './followup.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import attendanceRoutes from './attendance.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'API is healthy' }));

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/leads', leadRoutes);
router.use('/followups', followupRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/admin', adminRoutes);

export default router;
