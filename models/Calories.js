const mongoose = require('mongoose');

const CaloriesSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  kilocalories: { type: Number, default: 0 },
  type: { type: String }, // optional: e.g., 'total' or 'active' if present in record
}, { timestamps: true });

CaloriesSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Calories', CaloriesSchema);
