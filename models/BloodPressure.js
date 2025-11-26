const mongoose = require('mongoose');

const BPSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthData', index: true },
  timestamp: { type: Date, required: true},
  systolic: { type: Number },
  diastolic: { type: Number },
}, { timestamps: true, strict: false });

BPSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('BloodPressure', BPSchema);
