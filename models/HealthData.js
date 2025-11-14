const mongoose = require('mongoose');

const HealthDataSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  steps: { type: Number, default: 0 },
  heartRate: { type: Number },
  calories: { type: Number, default: 0 },
  distance: { type: Number, default: 0 },
  oxygenSaturation: { type: Number },
  sleepMinutes: { type: Number, default: 0 },
}, { timestamps: true });

HealthDataSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('HealthData', HealthDataSchema);