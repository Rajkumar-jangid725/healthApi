const mongoose = require('mongoose');

const TempSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  celsius: { type: Number },
}, { timestamps: true });

TempSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('BodyTemperature', TempSchema);
