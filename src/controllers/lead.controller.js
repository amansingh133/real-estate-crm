import { Lead } from '../models/lead.model.js';
import { FollowUp } from '../models/followup.model.js';
import { Project } from '../models/project.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { User } from '../models/user.model.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, LEAD_STATUS, ROLE } from '../utils/constants.js';

// POST /leads
export const createLead = asyncHandler(async (req, res) => {
  const {
    name,
    mobileNumber,
    alternateNumber,
    project,
    status,
    type,
    budget,
    source,
    location,
    remarks,
    nextFollowUpDate,
    assignedTo,
  } = req.body;

  const projectDoc = await Project.findOne({ _id: project, organization: req.user.organization });
  if (!projectDoc) throw ApiError.notFound('Selected project does not exist.', 'PROJECT_NOT_FOUND');

  const duplicate = await Lead.findOne({ mobileNumber, project });
  if (duplicate) {
    throw ApiError.conflict(
      'A lead with this mobile number already exists for the selected project.',
      'DUPLICATE_LEAD'
    );
  }

  // Employees can only ever create leads assigned to themselves. Only an
  // Admin can assign a lead to a different employee in the organization.
  let finalAssignedTo = req.user._id;
  if (req.user.role === ROLE.ADMIN && assignedTo) {
    const assignee = await User.findOne({ _id: assignedTo, organization: req.user.organization });
    if (!assignee) throw ApiError.notFound('assignedTo user not found in your organization.', 'ASSIGNEE_NOT_FOUND');
    finalAssignedTo = assignee._id;
  }

  const lead = await Lead.create({
    organization: req.user.organization,
    name,
    mobileNumber,
    alternateNumber,
    project,
    status: status || LEAD_STATUS.NEW,
    type,
    budget,
    source,
    location,
    remarks,
    // Per spec: added date is the 1st follow-up date by default.
    nextFollowUpDate: nextFollowUpDate || new Date(),
    assignedTo: finalAssignedTo,
    createdBy: req.user._id,
  });

  return sendSuccess(res, 201, 'Lead created successfully.', lead);
});

// GET /leads
export const getLeads = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const { search, status, project, type, assignedTo, sortBy, sortOrder } = req.query;

  const filter = { organization: req.user.organization };
  if (status) filter.status = status;
  if (project) filter.project = project;
  if (type) filter.type = type;

  // Employees only ever see their own leads. Admins may optionally filter
  // by a specific employee via ?assignedTo=, or omit it to see all.
  if (req.user.role === ROLE.EMPLOYEE) {
    filter.assignedTo = req.user._id;
  } else if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { mobileNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const sort = { [sortBy || 'createdAt']: sortOrder === 'asc' ? 1 : -1 };

  const [items, total] = await Promise.all([
    Lead.find(filter)
      .populate('project', 'name type')
      .populate('assignedTo', 'name email')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Lead.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, 'Leads fetched successfully.', items, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

// Employees may only access leads assigned to them; Admins may access any
// lead within their own organization. Always scope by organization first.
const assertLeadAccess = (lead, req) => {
  if (!lead || lead.organization.toString() !== req.user.organization.toString()) {
    throw ApiError.notFound('Lead not found.', 'LEAD_NOT_FOUND');
  }
  const assignedId = lead.assignedTo?._id ? lead.assignedTo._id.toString() : lead.assignedTo.toString();
  if (req.user.role === ROLE.EMPLOYEE && assignedId !== req.user._id.toString()) {
    throw ApiError.forbidden('You do not have access to this lead.', 'LEAD_ACCESS_DENIED');
  }
};

// GET /leads/:id  (includes full follow-up history, per "expand lead" spec)
export const getLeadById = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id)
    .populate('project', 'name type')
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');

  assertLeadAccess(lead, req);

  const followUps = await FollowUp.find({ lead: lead._id }).sort({ createdAt: -1 });

  return sendSuccess(res, 200, 'Lead fetched successfully.', {
    lead,
    followUpHistory: followUps,
  });
});

// PUT /leads/:id
export const updateLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  assertLeadAccess(lead, req);

  // Name and mobile number are intentionally NOT in this list: per the
  // prototype, they stay read-only once a lead is created to preserve the
  // duplicate-check guarantee. Use a new lead if these must change.
  const allowedFields = [
    'alternateNumber',
    'project',
    'status',
    'type',
    'budget',
    'source',
    'location',
    'remarks',
    'nextFollowUpDate',
  ];
  // Only an Admin may reassign a lead to a different employee.
  if (req.user.role === ROLE.ADMIN) allowedFields.push('assignedTo');

  if (req.body.project && req.body.project !== lead.project.toString()) {
    const projectDoc = await Project.findOne({ _id: req.body.project, organization: req.user.organization });
    if (!projectDoc) throw ApiError.notFound('Selected project does not exist.', 'PROJECT_NOT_FOUND');
  }

  if (req.body.assignedTo && req.user.role === ROLE.ADMIN) {
    const assignee = await User.findOne({ _id: req.body.assignedTo, organization: req.user.organization });
    if (!assignee) throw ApiError.notFound('assignedTo user not found in your organization.', 'ASSIGNEE_NOT_FOUND');
  }

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) lead[field] = req.body[field];
  });

  await lead.save();
  return sendSuccess(res, 200, 'Lead updated successfully.', lead);
});

// PATCH /leads/:id/status
export const updateLeadStatus = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  assertLeadAccess(lead, req);

  lead.status = req.body.status;
  await lead.save();

  return sendSuccess(res, 200, 'Lead status updated successfully.', lead);
});

// DELETE /leads/:id
export const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  assertLeadAccess(lead, req);

  await FollowUp.deleteMany({ lead: lead._id });
  await lead.deleteOne();

  return sendSuccess(res, 200, 'Lead deleted successfully.');
});
