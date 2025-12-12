const mongoose = require("mongoose");

const bodyTemperatureSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: "HealthData" },
    timestamp: { type: Date, default: Date.now, index: true },
    celsius: { type: Number, default: null },
}, { timestamps: true });

bodyTemperatureSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model("BodyTemperature", bodyTemperatureSchema);
