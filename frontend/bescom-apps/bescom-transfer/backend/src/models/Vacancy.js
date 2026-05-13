const mongoose = require('mongoose');

const vacancySchema = new mongoose.Schema({
  cycle:       { type: mongoose.Schema.Types.ObjectId, ref: 'TransferCycle', required: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  unitType:    { type: String, enum: ['section','subdivision','division','circle','zone','corporate'], required: true },
  zone:        { type: String, trim: true },
  circle:      { type: String, trim: true },
  division:    { type: String, trim: true },
  subDivision: { type: String, trim: true },
  section:     { type: String, trim: true },
  postDesignation: { type: String, required: true, trim: true },
  group:       { type: String, enum: ['C', 'D'], required: true },
  totalVacancies:  { type: Number, required: true, min: 0 },
  filledVacancies: { type: Number, default: 0 },
  status: { type: String, enum: ['draft','submitted','verified'], default: 'draft' },
  submittedAt: { type: Date }
}, { timestamps: true });

vacancySchema.virtual('availableVacancies').get(function() {
  return this.totalVacancies - this.filledVacancies;
});

vacancySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Vacancy', vacancySchema);
