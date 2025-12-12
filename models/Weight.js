const mongoose = require("mongoose");

const weightSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: "HealthData" },
    timestamp: { type: Date, default: Date.now, index: true },
    kilograms: { type: Number, default: null },
}, { timestamps: true });

weightSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model("Weight", weightSchema);
