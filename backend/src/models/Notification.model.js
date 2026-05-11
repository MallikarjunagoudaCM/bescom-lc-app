const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lc: { type: mongoose.Schema.Types.ObjectId, ref: 'LC' },
  lcNumber: String,
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['INFO', 'ACTION_REQUIRED', 'ALERT', 'SUCCESS'], default: 'INFO' },
  channel: { type: String, enum: ['APP', 'EMAIL', 'SMS'], default: 'APP' },
  isRead: { type: Boolean, default: false },
  readAt: Date,
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
