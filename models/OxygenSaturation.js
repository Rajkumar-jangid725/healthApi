const mongoose = require("mongoose");

const oxygenSaturationSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: "HealthData" },
    timestamp: { type: Date, default: Date.now, index: true },
    percentage: { type: Number, default: null },
}, { timestamps: true });

oxygenSaturationSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model("OxygenSaturation", oxygenSaturationSchema);
