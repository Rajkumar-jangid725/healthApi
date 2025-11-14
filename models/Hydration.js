const mongoose = require('mongoose');

const HydrationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  totalLiters: { type: Number, default: 0 },
}, { timestamps: true });

HydrationSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Hydration', HydrationSchema);