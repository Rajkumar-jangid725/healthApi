const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthData', index: true },
  timestamp: { type: Date, required: true },
  type: { type: String },
  startTime: { type: Date },
  endTime: { type: Date },
  durationMinutes: { type: Number },
}, { timestamps: true, strict: false });

ExerciseSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('Exercise', ExerciseSchema);
