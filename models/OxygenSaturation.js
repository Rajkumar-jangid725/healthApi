const mongoose = require('mongoose');

const OxygenSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthData' },
  timestamp: { type: Date, required: true },
  percentage: { type: Number, required: false },
}, { timestamps: true, strict: false });

OxygenSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('OxygenSaturation', OxygenSchema);
