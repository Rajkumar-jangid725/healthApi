const mongoose = require('mongoose');

const SleepSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  durationMinutes: { type: Number }, // computed if available
  raw: { type: mongoose.Schema.Types.Mixed }, // optionally keep raw record
}, { timestamps: true });

SleepSchema.index({ userId: 1, startTime: -1 });

module.exports = mongoose.model('Sleep', SleepSchema);
