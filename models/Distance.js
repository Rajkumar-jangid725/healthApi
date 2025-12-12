const mongoose = require("mongoose");

const distanceSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: "HealthData" },
    timestamp: { type: Date, default: Date.now, index: true },
    meters: { type: Number, default: 0 },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
}, { timestamps: true });

distanceSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model("Distance", distanceSchema);
