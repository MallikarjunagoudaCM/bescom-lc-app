const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // ── Common fields (all account types) ──────────────────────
  username:  { type: String, required: true, unique: true, trim: true, lowercase: true },
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:     { type: String, required: true, trim: true },
  password:  { type: String, required: true, minlength: 6 },
  role:      { type: String, enum: ['employee','hr_corporate','office_admin'], default: 'employee' },
  isActive:  { type: Boolean, default: true },
  isVerified:{ type: Boolean, default: false },
  lastLogin: { type: Date },

  // ── Employee-only fields (optional for office accounts) ────
  employeeId:  { type: String, sparse: true, trim: true },   // sparse = unique only when present
  dateOfBirth: { type: Date },
  joiningDate: { type: Date },
  designation: { type: String, trim: true },
  group:       { type: String, enum: ['C','D',null] },
  currentPosting: {
    zone:        { type: String, trim: true },
    circle:      { type: String, trim: true },
    division:    { type: String, trim: true },
    subDivision: { type: String, trim: true },
    section:     { type: String, trim: true },
    postingSince:{ type: Date }
  },

  // ── Office/HR account fields ────────────────────────────────
  accountType: {
    type: String,
    enum: ['employee_account', 'office_account'],
    default: 'employee_account'
  },
  officeName:  { type: String, trim: true },   // e.g. "Jayanagar Division Office"
  managedUnit: {
    unitType: { type: String, enum: ['section','subdivision','division','circle','zone','corporate'] },
    zone: String, circle: String, division: String, subDivision: String, section: String
  }
}, { timestamps: true });

// Unique index on employeeId only when it exists
userSchema.index({ employeeId: 1 }, { unique: true, sparse: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
