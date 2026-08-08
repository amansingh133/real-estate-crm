import mongoose from "mongoose";
import {
  LEAD_STATUS,
  LEAD_STATUS_VALUES,
  LEAD_TYPE_VALUES,
} from "../utils/constants.js";

const leadSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    alternateNumber: { type: String, trim: true, default: "" },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    status: {
      type: String,
      enum: LEAD_STATUS_VALUES,
      default: LEAD_STATUS.NEW,
    },
    type: { type: String, enum: LEAD_TYPE_VALUES, required: true },
    budget: { type: Number, min: 0, default: null },
    source: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    remarks: { type: String, trim: true, default: "" },

    // Set once on creation, never changed afterwards.
    addedDate: { type: Date, default: Date.now, immutable: true },

    // Drives dashboard "today/tomorrow/pending follow-ups" and reminders.
    // Defaults to addedDate on creation, then updated every time a new
    // follow-up is logged.
    nextFollowUpDate: { type: Date, required: true },

    // Set (and overwritten) only when a follow-up is logged with status
    // Visit Planned / Visit Done / Revisit — the date the visit/revisit is
    // scheduled for, or the date it happened. Drives the dashboard's
    // "today's/tomorrow's visits" buckets and visit reminders.
    visitDate: { type: Date, default: null },

    // Used by the reminder cron job to avoid re-notifying too frequently.
    lastReminderSentAt: { type: Date, default: null },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Prevent the same mobile number being added twice under the same project.
leadSchema.index({ mobileNumber: 1, project: 1 }, { unique: true });
leadSchema.index({ organization: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ nextFollowUpDate: 1 });
leadSchema.index({ visitDate: 1 });
leadSchema.index({ assignedTo: 1 });

export const Lead = mongoose.model("Lead", leadSchema);
