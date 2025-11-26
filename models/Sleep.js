const mongoose = require('mongoose');

const SleepSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  healthDataId: {type: mongoose.Schema.Types.ObjectId, ref: 'HealthData', index: true },
  timestamp: { type: Date, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  durationMinutes: { type: Number },
  raw: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

SleepSchema.index({ userId: 1, startTime: -1 });

module.exports = mongoose.model('Sleep', SleepSchema);
