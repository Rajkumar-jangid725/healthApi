const mongoose = require("mongoose");

const bloodPressureSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: "HealthData" },
    timestamp: { type: Date, default: Date.now, index: true },
    type: { type: String, required: true },
    value: { type: Number, required: true },
}, { timestamps: true });

bloodPressureSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model("BloodPressure", bloodPressureSchema);
