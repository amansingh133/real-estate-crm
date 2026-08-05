import bcrypt from 'bcryptjs';
import { User } from '../models/user.model.js';
import { Lead } from '../models/lead.model.js';
import { Attendance } from '../models/attendance.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { generateTempPassword } from '../services/token.service.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, ROLE } from '../utils/constants.js';
import { getMonthlyAttendance } from '../services/attendance.service.js';

// POST /admin/employees
export const createEmployee = asyncHandler(async (req, res) => {
  const { name, email, mobileNumber, gender, address } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists.', 'EMAIL_ALREADY_EXISTS');
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const employee = await User.create({
    name,
    email,
    username: email,
    mobileNumber,
    gender,
    address,
    passwordHash,
    role: ROLE.EMPLOYEE,
    organization: req.user.organization,
    // Admin has already verified this person's identity internally, so no
    // OTP round-trip is needed before they can log in.
    isVerified: true,
  });

  return sendSuccess(res, 201, 'Employee created successfully. Share the temporary password securely — it will not be shown again.', {
    employee: employee.toSafeObject(),
    temporaryPassword: tempPassword,
  });
});

// GET /admin/employees
export const getEmployees = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const { search, isActive } = req.query;

  const filter = { organization: req.user.organization, role: ROLE.EMPLOYEE };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const [items, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash -otp -fcmTokens')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, 'Employees fetched successfully.', items, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /admin/employees/:id
export const getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await User.findOne({
    _id: req.params.id,
    organization: req.user.organization,
    role: ROLE.EMPLOYEE,
  }).select('-passwordHash -otp -fcmTokens');

  if (!employee) throw ApiError.notFound('Employee not found in your organization.', 'EMPLOYEE_NOT_FOUND');
  return sendSuccess(res, 200, 'Employee fetched successfully.', employee);
});

// PUT /admin/employees/:id
export const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await User.findOne({
    _id: req.params.id,
    organization: req.user.organization,
    role: ROLE.EMPLOYEE,
  });
  if (!employee) throw ApiError.notFound('Employee not found in your organization.', 'EMPLOYEE_NOT_FOUND');

  const allowedFields = ['name', 'mobileNumber', 'gender', 'address', 'isActive'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) employee[field] = req.body[field];
  });

  await employee.save();
  return sendSuccess(res, 200, 'Employee updated successfully.', employee.toSafeObject());
});

// DELETE /admin/employees/:id
export const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await User.findOne({
    _id: req.params.id,
    organization: req.user.organization,
    role: ROLE.EMPLOYEE,
  });
  if (!employee) throw ApiError.notFound('Employee not found in your organization.', 'EMPLOYEE_NOT_FOUND');

  const [leadCount, attendanceCount] = await Promise.all([
    Lead.countDocuments({ assignedTo: employee._id }),
    Attendance.countDocuments({ user: employee._id }),
  ]);

  if (leadCount > 0 || attendanceCount > 0) {
    throw ApiError.conflict(
      'This employee has linked leads or attendance history and cannot be permanently deleted. Deactivate the account instead (PUT with isActive: false).',
      'EMPLOYEE_HAS_HISTORY'
    );
  }

  await employee.deleteOne();
  return sendSuccess(res, 200, 'Employee deleted successfully.');
});

// GET /admin/employees/:employeeId/attendance/monthly?month=&year=
export const getEmployeeMonthlyAttendance = asyncHandler(async (req, res) => {
  const employee = await User.findOne({
    _id: req.params.employeeId,
    organization: req.user.organization,
  }).select('-passwordHash -otp -fcmTokens');

  if (!employee) throw ApiError.notFound('Employee not found in your organization.', 'EMPLOYEE_NOT_FOUND');

  const report = await getMonthlyAttendance({
    userId: employee._id,
    month: req.query.month,
    year: req.query.year,
  });

  return sendSuccess(res, 200, 'Monthly attendance fetched successfully.', {
    employee: { _id: employee._id, name: employee.name, email: employee.email },
    ...report,
  });
});
