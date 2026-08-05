import mongoose from 'mongoose';
import { PROJECT_TYPE_VALUES } from '../utils/constants.js';

const projectSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: PROJECT_TYPE_VALUES, required: true },
    location: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

projectSchema.index({ organization: 1, name: 1, type: 1 });

export const Project = mongoose.model('Project', projectSchema);
