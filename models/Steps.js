const mongoose = require('mongoose');

const StepsSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  count: { type: Number, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
}, { timestamps: true });

StepsSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Steps', StepsSchema);