const mongoose = require('mongoose');

const BloodGlucoseSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  level: { type: Number },
}, { timestamps: true });

BloodGlucoseSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('BloodGlucose', BloodGlucoseSchema);
