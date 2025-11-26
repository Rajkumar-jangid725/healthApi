const mongoose = require('mongoose');

const StepsSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthData', index: true },
  timestamp: { type: Date, required: true, index: true },
  count: { type: Number, required: true },
  startTime: { type: Date },
  endTime: { type: Date },
}, { timestamps: true, strict: false });

StepsSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Steps', StepsSchema);
