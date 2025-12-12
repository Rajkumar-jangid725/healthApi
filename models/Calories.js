const mongoose = require("mongoose");

const caloriesSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: "HealthData" },
    timestamp: { type: Date, default: Date.now, index: true },
    kilocalories: { type: Number, default: 0 },
    type: { type: String, enum: ["total", "active"], default: "total" },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
}, { timestamps: true });

caloriesSchema.index({ userId: 1, timestamp: -1 });
caloriesSchema.index({ userId: 1, type: 1, timestamp: -1 });

module.exports = mongoose.model("Calories", caloriesSchema);
