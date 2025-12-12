const mongoose = require("mongoose");

const heartRateSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: "HealthData" },
    timestamp: { type: Date, default: Date.now, index: true },
    bpm: { type: Number, default: null },
}, { timestamps: true });

heartRateSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model("HeartRate", heartRateSchema);
