const mongoose = require('mongoose');

const OxygenSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  percentage: { type: Number, required: true },
}, { timestamps: true });

OxygenSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('OxygenSaturation', OxygenSchema);
