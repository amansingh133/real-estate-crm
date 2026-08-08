import { FollowUp } from "../models/followup.model.js";
import { Lead } from "../models/lead.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { sendSuccess } from "../utils/ApiResponse.js";
import { ROLE } from "../utils/constants.js";

const assertLeadAccess = (lead, req) => {
  if (
    !lead ||
    lead.organization.toString() !== req.user.organization.toString()
  ) {
    throw ApiError.notFound("Lead not found.", "LEAD_NOT_FOUND");
  }
  if (
    req.user.role === ROLE.EMPLOYEE &&
    lead.assignedTo.toString() !== req.user._id.toString()
  ) {
    throw ApiError.forbidden(
      "You do not have access to this lead.",
      "LEAD_ACCESS_DENIED",
    );
  }
};

// POST /leads/:leadId/followups
// Single entry point for logging a follow-up. Can ALSO advance the lead's
// status and (when relevant) its visit date in the same call — no separate
// status-update API needed.
export const addFollowUp = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const {
    nextFollowUpDate,
    numberOfClients,
    type,
    remarks,
    status,
    visitDate,
  } = req.body;

  const lead = await Lead.findById(leadId);
  assertLeadAccess(lead, req);

  const followUp = await FollowUp.create({
    lead: lead._id,
    prevFollowUpDate: lead.nextFollowUpDate,
    nextFollowUpDate,
    numberOfClients,
    type,
    remarks,
    visitDate: visitDate || null,
    createdBy: req.user._id,
  });

  lead.nextFollowUpDate = nextFollowUpDate;
  lead.lastReminderSentAt = null;

  if (status) lead.status = status;
  if (visitDate) lead.visitDate = visitDate;

  await lead.save();

  return sendSuccess(res, 201, "Follow-up added successfully.", {
    followUp,
    lead,
  });
});

// GET /leads/:leadId/followups
export const getFollowUpsForLead = asyncHandler(async (req, res) => {
  const { leadId } = req.params;

  const lead = await Lead.findById(leadId);
  assertLeadAccess(lead, req);

  const followUps = await FollowUp.find({ lead: leadId }).sort({
    createdAt: -1,
  });
  return sendSuccess(
    res,
    200,
    "Follow-up history fetched successfully.",
    followUps,
  );
});

// PUT /followups/:id — correction only (fix a typo, wrong type, etc.).
// Does NOT change lead status/visitDate; use POST .../followups for that.
export const updateFollowUp = asyncHandler(async (req, res) => {
  const followUp = await FollowUp.findById(req.params.id);
  if (!followUp)
    throw ApiError.notFound("Follow-up not found.", "FOLLOWUP_NOT_FOUND");

  const lead = await Lead.findById(followUp.lead);
  assertLeadAccess(lead, req);

  const allowedFields = [
    "nextFollowUpDate",
    "numberOfClients",
    "type",
    "remarks",
    "visitDate",
  ];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) followUp[field] = req.body[field];
  });

  await followUp.save();
  return sendSuccess(res, 200, "Follow-up updated successfully.", followUp);
});

// DELETE /followups/:id
export const deleteFollowUp = asyncHandler(async (req, res) => {
  const followUp = await FollowUp.findById(req.params.id);
  if (!followUp)
    throw ApiError.notFound("Follow-up not found.", "FOLLOWUP_NOT_FOUND");

  const lead = await Lead.findById(followUp.lead);
  assertLeadAccess(lead, req);

  await followUp.deleteOne();
  return sendSuccess(res, 200, "Follow-up deleted successfully.");
});
