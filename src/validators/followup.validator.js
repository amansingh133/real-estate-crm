import { body, param } from 'express-validator';
import { FOLLOWUP_TYPE_VALUES } from '../utils/constants.js';

export const createFollowUpValidator = [
  param('leadId').isMongoId().withMessage('Invalid lead id'),
  body('nextFollowUpDate').isISO8601().withMessage('nextFollowUpDate must be a valid ISO 8601 date'),
  body('numberOfClients').optional().isInt({ min: 1 }).withMessage('numberOfClients must be a positive integer'),
  body('type').isIn(FOLLOWUP_TYPE_VALUES).withMessage(`Type must be one of: ${FOLLOWUP_TYPE_VALUES.join(', ')}`),
  body('remarks').optional().trim(),
];

export const updateFollowUpValidator = [
  param('id').isMongoId().withMessage('Invalid follow-up id'),
  body('nextFollowUpDate').optional().isISO8601().withMessage('nextFollowUpDate must be a valid ISO 8601 date'),
  body('numberOfClients').optional().isInt({ min: 1 }).withMessage('numberOfClients must be a positive integer'),
  body('type').optional().isIn(FOLLOWUP_TYPE_VALUES).withMessage(`Type must be one of: ${FOLLOWUP_TYPE_VALUES.join(', ')}`),
  body('remarks').optional().trim(),
];

export const leadIdParamValidator = [param('leadId').isMongoId().withMessage('Invalid lead id')];
export const followUpIdParamValidator = [param('id').isMongoId().withMessage('Invalid follow-up id')];
