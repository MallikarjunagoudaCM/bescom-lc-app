const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['EE', 'AEE', 'AE_BESCOM', 'JE_BESCOM', 'AE_KPTCL', 'SHIFT_JE_KPTCL', 'LINEMAN', 'ADMIN'];

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ROLES, required: true },
  division: { type: String, trim: true },
  subdivision: { type: String, trim: true },
  section: { type: String, trim: true },
  substation: { type: String, trim: true },
  substations: [{ type: String, trim: true }],
  feeders: [{ type: String, trim: true }],
  station: { type: String, trim: true },
  shiftPattern: { type: String, enum: ['', 'WEEKLY', 'MONTHLY'], default: '' },
  maxShiftJEs: { type: Number, default: 0 },
  assignedToAEKPTCL: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByAdmin: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  notifyEmail: { type: Boolean, default: true },
  notifySMS: { type: Boolean, default: false },
  refreshToken: { type: String, select: false },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
