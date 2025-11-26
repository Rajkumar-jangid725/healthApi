const mongoose = require('mongoose');

const HydrationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthData' },
  timestamp: { type: Date, required: true },
  liters: { type: Number, default: 0 },
}, { timestamps: true, strict: false });

HydrationSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Hydration', HydrationSchema);
