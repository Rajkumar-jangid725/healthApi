const mongoose = require("mongoose");

const sleepSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: "HealthData" },
    timestamp: { type: Date, default: Date.now, index: true },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    durationMinutes: { type: Number, default: null },
}, { timestamps: true });

sleepSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model("Sleep", sleepSchema);
