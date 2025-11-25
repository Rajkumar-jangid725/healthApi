const mongoose = require('mongoose');

const BPSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  systolic: { type: Number },
  diastolic: { type: Number },
}, { timestamps: true });

BPSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('BloodPressure', BPSchema);
