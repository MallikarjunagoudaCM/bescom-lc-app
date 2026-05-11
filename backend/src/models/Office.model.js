const mongoose = require('mongoose');

const officeSchema = new mongoose.Schema({
  division: String,
  subdivision: String,
  section: String,
  feeder: String,
  kptclStation: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Office', officeSchema);
