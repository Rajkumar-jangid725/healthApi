const mongoose = require("mongoose");

const bloodGlucoseSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    healthDataId: { type: mongoose.Schema.Types.ObjectId, ref: "HealthData" },
    timestamp: { type: Date, default: Date.now, index: true },
    mmolPerL: { type: Number, default: null },
}, { timestamps: true });

bloodGlucoseSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model("BloodGlucose", bloodGlucoseSchema);
