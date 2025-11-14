const mongoose = require('mongoose');

const HeartRateSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  average: { type: Number },
  min: { type: Number },
  max: { type: Number },
  samples: [{ type: Number }],
}, { timestamps: true });

HeartRateSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('HeartRate', HeartRateSchema);
