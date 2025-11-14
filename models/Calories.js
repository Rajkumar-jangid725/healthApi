const mongoose = require('mongoose');

const CaloriesSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  totalCalories: { type: Number, default: 0 },
  activeCalories: { type: Number, default: 0 },
}, { timestamps: true });

CaloriesSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Calories', CaloriesSchema);