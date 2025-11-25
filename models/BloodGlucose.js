const mongoose = require('mongoose');

const GlucoseSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  mmolPerL: { type: Number },
}, { timestamps: true });

GlucoseSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('BloodGlucose', GlucoseSchema);
