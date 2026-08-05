import { Router } from 'express';
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  getEmployeeMonthlyAttendance,
} from '../controllers/admin.controller.js';
import {
  createEmployeeValidator,
  updateEmployeeValidator,
  employeeIdParamValidator,
} from '../validators/admin.validator.js';
import { employeeIdParamValidator as attendanceEmployeeIdValidator, monthlyReportQueryValidator } from '../validators/attendance.validator.js';
import { validate } from '../middlewares/validate.middleware.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/rbac.middleware.js';
import { ROLE } from '../utils/constants.js';

const router = Router();

router.use(protect, authorize(ROLE.ADMIN));

router.post('/employees', createEmployeeValidator, validate, createEmployee);
router.get('/employees', getEmployees);
router.get('/employees/:id', employeeIdParamValidator, validate, getEmployeeById);
router.put('/employees/:id', updateEmployeeValidator, validate, updateEmployee);
router.delete('/employees/:id', employeeIdParamValidator, validate, deleteEmployee);

router.get(
  '/employees/:employeeId/attendance/monthly',
  attendanceEmployeeIdValidator,
  monthlyReportQueryValidator,
  validate,
  getEmployeeMonthlyAttendance
);

export default router;
