const mongoose = require('mongoose');

const OxygenSaturationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  average: { type: Number },
  samples: [{ type: Number }],
}, { timestamps: true });

OxygenSaturationSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('OxygenSaturation', OxygenSaturationSchema);
