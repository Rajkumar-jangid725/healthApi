const mongoose = require('mongoose');

const WeightSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthData' },
  timestamp: { type: Date, required: true },
  kilograms: { type: Number },
}, { timestamps: true, strict: false });

WeightSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Weight', WeightSchema);
