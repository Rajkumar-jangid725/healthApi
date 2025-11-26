const mongoose = require('mongoose');

const TempSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthData', index: true },
  timestamp: { type: Date, required: true },
  celsius: { type: Number },
}, { timestamps: true, strict: false });

TempSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('BodyTemperature', TempSchema);
