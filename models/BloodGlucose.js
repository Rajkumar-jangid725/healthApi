const mongoose = require('mongoose');

const GlucoseSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthData', index: true },
  timestamp: { type: Date, required: true },
  mmolPerL: { type: Number },
}, { timestamps: true, strict: false });

GlucoseSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('BloodGlucose', GlucoseSchema);
