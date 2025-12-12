const mongoose = require("mongoose");

const hydrationSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: "HealthData" },
    timestamp: { type: Date, default: Date.now, index: true },
    liters: { type: Number, default: null },
}, { timestamps: true });

hydrationSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model("Hydration", hydrationSchema);
