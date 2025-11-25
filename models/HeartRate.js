const mongoose = require('mongoose');

const HeartRateSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true }, // sample time
  bpm: { type: Number, required: true },
  sourceRecordStart: { type: Date }, // optional: original record start
  sourceRecordEnd: { type: Date },   // optional: original record end
}, { timestamps: true });

HeartRateSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('HeartRate', HeartRateSchema);
