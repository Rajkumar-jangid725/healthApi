const mongoose = require('mongoose');

const BodyTemperatureSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  celsius: { type: Number },
}, { timestamps: true });

BodyTemperatureSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('BodyTemperature', BodyTemperatureSchema);
