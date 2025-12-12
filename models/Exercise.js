const mongoose = require("mongoose");

const exerciseSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: "HealthData" },
    timestamp: { type: Date, default: Date.now, index: true },
    type: { type: String, default: "unknown" },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    durationMinutes: { type: Number, default: null },
}, { timestamps: true });

exerciseSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model("Exercise", exerciseSchema);
