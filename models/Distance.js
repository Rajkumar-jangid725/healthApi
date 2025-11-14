const mongoose = require('mongoose');

const DistanceSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  totalMeters: { type: Number, default: 0 },
  totalKilometers: { type: Number, default: 0 },
}, { timestamps: true });

DistanceSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Distance', DistanceSchema);
