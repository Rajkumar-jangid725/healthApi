const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  type: { type: String },
  startTime: { type: Date },
  endTime: { type: Date },
  durationMinutes: { type: Number },
}, { timestamps: true });

ExerciseSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Exercise', ExerciseSchema);