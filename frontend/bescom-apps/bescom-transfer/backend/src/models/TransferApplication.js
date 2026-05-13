const mongoose = require('mongoose');

const preferenceSchema = new mongoose.Schema({
  priority:    { type: Number, required: true, min: 1, max: 3 },
  zone:        { type: String, trim: true },
  circle:      { type: String, trim: true },
  division:    { type: String, required: true, trim: true },
  subDivision: { type: String, trim: true },
  section:     { type: String, trim: true }
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  status:    { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note:      { type: String }
}, { _id: false });

const transferApplicationSchema = new mongoose.Schema({
  applicationNumber: { type: String, unique: true },
  employee:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cycle:     { type: mongoose.Schema.Types.ObjectId, ref: 'TransferCycle', required: true },
  preferences: [preferenceSchema],

  status: {
    type: String,
    enum: ['submitted','under_review','merit_generated','approved','waitlisted','rejected'],
    default: 'submitted'
  },
  approvedPreference: { type: Number },
  approvedPosting: {
    zone: String, circle: String, division: String, subDivision: String, section: String
  },

  meritScore:      { type: Number, default: 0 },
  meritRank:       { type: Number },
  meritBreakdown: {
    serviceYearsScore: { type: Number, default: 0 },
    joiningDateScore:  { type: Number, default: 0 },
    dobScore:          { type: Number, default: 0 },
    bonusScore:        { type: Number, default: 0 }
  },

  // Snapshot of employee data at time of application (for audit)
  snapshot: {
    name: String, employeeId: String, group: String, designation: String,
    joiningDate: Date, dateOfBirth: Date,
    currentPosting: Object, postingSince: Date, serviceYears: Number
  },

  hrNote:       { type: String },
  approvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt:   { type: Date },
  statusHistory: [statusHistorySchema]
}, { timestamps: true });

// Auto-generate application number
transferApplicationSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  const year  = new Date().getFullYear();
  const count = await this.constructor.countDocuments();
  this.applicationNumber = `TRF-${year}-${String(count + 1).padStart(5, '0')}`;
  this.statusHistory.push({ status: 'submitted', note: 'Application submitted by employee' });
  next();
});

module.exports = mongoose.model('TransferApplication', transferApplicationSchema);
