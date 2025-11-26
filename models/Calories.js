const mongoose = require('mongoose');

const CaloriesSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthData', index: true },
  timestamp: { type: Date, required: true },
  kilocalories: { type: Number, default: 0 },
  type: { type: String },
  startTime: { type: Date },
  endTime: { type: Date },
}, { timestamps: true, strict: false });

CaloriesSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Calories', CaloriesSchema);
