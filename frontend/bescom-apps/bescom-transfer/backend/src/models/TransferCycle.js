const mongoose = require('mongoose');

const transferCycleSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  financialYear: { type: String, required: true },
  status: {
    type: String,
    enum: ['vacancy_collection','application_open','application_closed','merit_generated','approval_in_progress','completed'],
    default: 'vacancy_collection'
  },
  vacancyDeadline:     { type: Date, required: true },
  applicationStartDate:{ type: Date, required: true },
  applicationEndDate:  { type: Date, required: true },
  meritGeneratedAt:    { type: Date },
  completedAt:         { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('TransferCycle', transferCycleSchema);
