const mongoose = require('mongoose');

const WeightSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  kilograms: { type: Number },
}, { timestamps: true });

WeightSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Weight', WeightSchema);
