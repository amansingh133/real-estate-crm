export const LEAD_STATUS = Object.freeze({
  NEW: 'New',
  ASSIGNED: 'Assigned',
  IN_PROCESS: 'In Process',
  CONTACTED: 'Contacted',
  VISIT_PLANNED: 'Visit Planned',
  VISIT_DONE: 'Visit Done',
  NEGOTIATION: 'Negotiation',
  CONVERTED: 'Converted',
  DROPPED: 'Dropped',
});

export const LEAD_STATUS_VALUES = Object.values(LEAD_STATUS);

export const LEAD_TYPE = Object.freeze({
  BROKER: 'Broker',
  CLIENT: 'Client',
});
export const LEAD_TYPE_VALUES = Object.values(LEAD_TYPE);

export const PROJECT_TYPE = Object.freeze({
  FLATS: 'Flats',
  VILLAS: 'Villas',
  PLOTS: 'Plots',
  COMMERCIAL: 'Commercial',
});
export const PROJECT_TYPE_VALUES = Object.values(PROJECT_TYPE);

export const FOLLOWUP_TYPE = Object.freeze({
  WHATSAPP: 'WhatsApp',
  CALL: 'Call',
  PHYSICAL: 'Physical Interaction',
});
export const FOLLOWUP_TYPE_VALUES = Object.values(FOLLOWUP_TYPE);

export const OTP_PURPOSE = Object.freeze({
  REGISTER: 'REGISTER',
  FORGOT_PASSWORD: 'FORGOT_PASSWORD',
});

export const GENDER_VALUES = ['Male', 'Female', 'Other'];

export const ROLE = Object.freeze({
  ADMIN: 'Admin',
  EMPLOYEE: 'Employee',
});
export const ROLE_VALUES = Object.values(ROLE);

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
