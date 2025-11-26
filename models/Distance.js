const mongoose = require('mongoose');

const DistanceSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthData', index: true },
  timestamp: { type: Date, required: true },
  meters: { type: Number, default: 0 },
  startTime: { type: Date },
  endTime: { type: Date },
}, { timestamps: true, strict: false });

DistanceSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Distance', DistanceSchema);
