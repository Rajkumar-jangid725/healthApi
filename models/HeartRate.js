const mongoose = require('mongoose');

const HeartRateSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthData', index: true },
  timestamp: { type: Date, required: true, index: true },
  bpm: { type: Number, required: true },
}, { timestamps: true, strict: false });

HeartRateSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('HeartRate', HeartRateSchema);
