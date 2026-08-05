import { Router } from 'express';
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  updateLeadStatus,
  deleteLead,
} from '../controllers/lead.controller.js';
import { addFollowUp, getFollowUpsForLead } from '../controllers/followup.controller.js';
import {
  createLeadValidator,
  updateLeadValidator,
  updateLeadStatusValidator,
  leadIdParamValidator,
} from '../validators/lead.validator.js';
import { createFollowUpValidator, leadIdParamValidator as followUpLeadIdValidator } from '../validators/followup.validator.js';
import { validate } from '../middlewares/validate.middleware.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect);

router.post('/', createLeadValidator, validate, createLead);
router.get('/', getLeads);
router.get('/:id', leadIdParamValidator, validate, getLeadById);
router.put('/:id', updateLeadValidator, validate, updateLead);
router.patch('/:id/status', updateLeadStatusValidator, validate, updateLeadStatus);
router.delete('/:id', leadIdParamValidator, validate, deleteLead);

// Nested follow-up routes for a specific lead
router.post('/:leadId/followups', createFollowUpValidator, validate, addFollowUp);
router.get('/:leadId/followups', followUpLeadIdValidator, validate, getFollowUpsForLead);

export default router;
