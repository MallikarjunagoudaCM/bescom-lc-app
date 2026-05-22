const mongoose = require('mongoose');

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const photoSchema = new mongoose.Schema({
  url: String,
  publicId: String,
  caption: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const logEntrySchema = new mongoose.Schema({
  action: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedByName: String,
  remarks: String,
  secretCode: String,
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

// ─── Main LC Schema ───────────────────────────────────────────────────────────

const LC_STATUSES = [
  'INITIATED',
  'APPROVED',
  'JE_REVIEWED',
  'DELEGATED',
  'IN_PROGRESS',
  'CLOSE_REQUESTED',
  'RELEASED',
  'ENERGIZED',
  'REJECTED',
];

const WORK_TYPES = ['UNPLANNED', 'PLANNED'];

const lcSchema = new mongoose.Schema({
  lcNumber: { type: String, unique: true },          // e.g. LC-2024-001234
  workType: { type: String, enum: WORK_TYPES, required: true, default: 'UNPLANNED' },
  status: { type: String, enum: LC_STATUSES, default: 'INITIATED' },

  // ─ Request details
  feeder: { type: String, required: true },
  division: { type: String },
  subdivision: { type: String },
  section: { type: String },
  substation: { type: String },
  natureOfWork: { type: String, required: true },
  description: { type: String },
  estimatedDuration: { type: Number, required: true }, // hours
  plannedStartAt: { type: Date },                      // for planned work

  // ─ People
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  aeeApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  eeApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  jeReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedLineman: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  releasedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  energizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  approvalPin: { type: String },
  // ─ Secret code (hashed in DB)
  secretCodeHash: { type: String, select: false },

  // ─ Timestamps
  aeeApprovedAt: Date,
  eeApprovedAt: Date,
  approvedAt: Date,
  jeReviewedAt: Date,
  delegatedAt: Date,
  workStartedAt: Date,
  workCompletedAt: Date,
  closeRequestedAt: Date,
  releasedAt: Date,
  energizedAt: Date,
  actualDuration: Number,

  // ─ Photos per stage
  photos: {
    cbIsolation:    [photoSchema],   // JE uploads: CB open, discharge rod, earth
    earthRod:       [photoSchema],   // JE uploads: Earth rod
    fieldPreWork:   [photoSchema],   // Lineman uploads before work
    fieldPostWork:  [photoSchema],   // Lineman uploads after work
    earthRemoved:   [photoSchema],   // JE uploads: earth removed
    cbRestored:     [photoSchema],   // JE uploads: CB closed
  },

  // ─ Notification config (set at JE review stage)
  notifyUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // ─ Remarks per stage
  approvalRemarks: String,
  jeRemarks: String,
  fieldNotes: String,
  clearanceNote: String,
  releaseRemarks: String,
  energizeRemarks: String,
  rejectionReason: String,

  // ─ Activity log
  log: [logEntrySchema],
}, { timestamps: true });

// ─── Auto-generate LC number ──────────────────────────────────────────────────

lcSchema.pre('save', async function (next) {
  if (this.isNew && !this.lcNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    this.lcNumber = `LC-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// ─── Indexes ──────────────────────────────────────────────────────────────────

lcSchema.index({ status: 1 });
lcSchema.index({ initiatedBy: 1 });
lcSchema.index({ feeder: 1 });
lcSchema.index({ createdAt: -1 });
lcSchema.index({ workType: 1 });

module.exports = mongoose.model('LC', lcSchema);
module.exports.LC_STATUSES = LC_STATUSES;
module.exports.WORK_TYPES = WORK_TYPES;
