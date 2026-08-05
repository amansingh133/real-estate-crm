import { body, param } from 'express-validator';
import { GENDER_VALUES } from '../utils/constants.js';

export const createEmployeeValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('mobileNumber')
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must be a valid 10-digit number'),
  body('gender').isIn(GENDER_VALUES).withMessage(`Gender must be one of: ${GENDER_VALUES.join(', ')}`),
  body('address').optional().trim(),
];

export const updateEmployeeValidator = [
  param('id').isMongoId().withMessage('Invalid employee id'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('mobileNumber')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must be a valid 10-digit number'),
  body('gender').optional().isIn(GENDER_VALUES).withMessage(`Gender must be one of: ${GENDER_VALUES.join(', ')}`),
  body('address').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const employeeIdParamValidator = [param('id').isMongoId().withMessage('Invalid employee id')];
