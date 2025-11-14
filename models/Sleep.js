const mongoose = require('mongoose');

const SleepSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  totalMinutes: { type: Number, default: 0 },
  totalHours: { type: Number, default: 0 },
  sessions: { type: Number, default: 0 },
}, { timestamps: true });

SleepSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Sleep', SleepSchema);