const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

// Models
const HealthData = require("./models/HealthData");
const Steps = require("./models/Steps");
const HeartRate = require("./models/HeartRate");
const Sleep = require("./models/Sleep");
const Calories = require("./models/Calories");
const OxygenSaturation = require("./models/OxygenSaturation");
const Distance = require("./models/Distance");
const BloodPressure = require("./models/BloodPressure");
const BloodGlucose = require("./models/BloodGlucose");
const BodyTemperature = require("./models/BodyTemperature");
const Weight = require("./models/Weight");
const Hydration = require("./models/Hydration");
const Exercise = require("./models/Exercise");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "20mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "20mb" }));

// MongoDB Connection
const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/healthapp";

mongoose.set("strictQuery", false);

mongoose
    .connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
    })
    .then(() => {
        console.log("✅ MongoDB connected");

        app.listen(PORT, "0.0.0.0", () =>
            console.log(`🚀 Server running on http://0.0.0.0:${PORT}`)
        );
    })
    .catch((err) => {
        console.error("❌ MongoDB Error:", err.message);
        process.exit(1);
    });

/* ------------------------------------------------------------------
    GET LATEST HEALTHDATA TIMESTAMP FOR A USER
-------------------------------------------------------------------*/
app.post("/latest-healthdata", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId)
            return res.status(400).json({ message: "userId is required" });

        const latest = await HealthData.findOne({ userId })
            .sort({ timestamp: -1 })
            .select("timestamp");

        res.status(200).json({
            success: true,
            latestTimestamp: latest ? latest.timestamp : null,
        });
    } catch (err) {
        console.error("❌ Error /latest-healthdata:", err);
        res.status(500).json({ error: err.message });
    }
});

/* ------------------------------------------------------------------
    SAVE HEALTH DATA (RAW + COMBINED)
-------------------------------------------------------------------*/
app.post("/healthdata", async (req, res) => {
    try {
        const data = req.body;
        const {
            userId,
            timestamp,
            combined,
            steps,
            heartRate,
            calories,
            activeCalories,
            distance,
            oxygenSaturation,
            bloodPressure,
            bloodGlucose,
            bodyTemperature,
            weight,
            hydration,
            sleep,
            exercise,
        } = data;

        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }

        /* ------------------------------------------------------------
            1) SAVE COMBINED SUMMARY INTO HealthData
        -------------------------------------------------------------*/
        const combinedRow = new HealthData({
            userId,
            timestamp: timestamp || new Date(),
            steps: combined?.stepsTotal || 0,
            heartRate: combined?.heartRateAvg || null,
            calories: combined?.caloriesTotal || 0,
            distance: combined?.distanceMeters || 0,
            oxygenSaturation: combined?.oxygenAvg || null,
            sleepMinutes: combined?.sleepMinutesTotal || 0,
        });

        await combinedRow.save();

        /* ------------------------------------------------------------
            2) SAVE RAW INDIVIDUAL ROWS (actual health records)
        -------------------------------------------------------------*/

        // --- STEPS ---
        if (steps?.length) {
            const formatted = steps.map((r) => ({
                userId,
                timestamp: new Date(r.endTime || r.startTime || timestamp),
                count: r.count,
                startTime: new Date(r.startTime),
                endTime: new Date(r.endTime),
            }));
            await Steps.insertMany(formatted);
        }

        // --- HEART RATE ---
        if (heartRate?.length) {
            const hrRows = heartRate.map((h) => ({
                userId,
                bpm: h.bpm || null,
                timestamp: new Date(h.timestamp),
            }));
            await HeartRate.insertMany(hrRows);
        }

        // --- CALORIES ---
        if (calories?.length) {
            const rows = calories.map((r) => ({
                userId,
                timestamp: new Date(r.timestamp),
                totalCalories: r.kcal || 0,
                startTime: new Date(r.startTime),
                endTime: new Date(r.endTime),
            }));
            await Calories.insertMany(rows);
        }

        // --- ACTIVE CALORIES ---
        if (activeCalories?.length) {
            const rows = activeCalories.map((r) => ({
                userId,
                timestamp: new Date(r.timestamp),
                activeCalories: r.kcal || 0,
                startTime: new Date(r.startTime),
                endTime: new Date(r.endTime),
            }));
            await Calories.insertMany(rows);
        }

        // --- DISTANCE ---
        if (distance?.length) {
            const rows = distance.map((r) => ({
                userId,
                timestamp: new Date(r.timestamp),
                totalMeters: r.meters || 0,
                startTime: new Date(r.startTime),
                endTime: new Date(r.endTime),
            }));
            await Distance.insertMany(rows);
        }

        // --- OXYGEN ---
        if (oxygenSaturation?.length) {
            const rows = oxygenSaturation.map((o) => ({
                userId,
                timestamp: new Date(o.timestamp),
                average: o.percentage,
                samples: [o.percentage],
            }));
            await OxygenSaturation.insertMany(rows);
        }

        // --- BLOOD PRESSURE ---
        if (bloodPressure?.length) {
            const rows = bloodPressure.map((bp) => ({
                userId,
                timestamp: new Date(bp.timestamp),
                systolic: bp.systolic,
                diastolic: bp.diastolic,
            }));
            await BloodPressure.insertMany(rows);
        }

        // --- BLOOD GLUCOSE ---
        if (bloodGlucose?.length) {
            const rows = bloodGlucose.map((g) => ({
                userId,
                timestamp: new Date(g.timestamp),
                level: g.level,
            }));
            await BloodGlucose.insertMany(rows);
        }

        // --- BODY TEMPERATURE ---
        if (bodyTemperature?.length) {
            const rows = bodyTemperature.map((t) => ({
                userId,
                timestamp: new Date(t.timestamp),
                celsius: t.celsius,
            }));
            await BodyTemperature.insertMany(rows);
        }

        // --- WEIGHT ---
        if (weight?.length) {
            const rows = weight.map((w) => ({
                userId,
                timestamp: new Date(w.timestamp),
                kilograms: w.kilograms,
            }));
            await Weight.insertMany(rows);
        }

        // --- HYDRATION ---
        if (hydration?.length) {
            const rows = hydration.map((h) => ({
                userId,
                timestamp: new Date(h.timestamp),
                totalLiters: h.liters,
            }));
            await Hydration.insertMany(rows);
        }

        // --- SLEEP ---
        if (sleep?.length) {
            const rows = sleep.map((s) => ({
                userId,
                startTime: new Date(s.startTime),
                endTime: new Date(s.endTime),
                timestamp: new Date(s.endTime),
                totalMinutes: s.durationMinutes,
                totalHours: parseFloat((s.durationMinutes / 60).toFixed(2)),
                sessions: 1,
            }));
            await Sleep.insertMany(rows);
        }

        // --- EXERCISE ---
        if (exercise?.length) {
            const rows = exercise.map((e) => ({
                userId,
                timestamp: new Date(e.endTime || e.startTime),
                type: e.type,
                startTime: new Date(e.startTime),
                endTime: new Date(e.endTime),
                durationMinutes: e.durationMinutes,
            }));
            await Exercise.insertMany(rows);
        }

        res.status(200).json({
            success: true,
            message: "Health data saved successfully",
            recordId: combinedRow._id,
        });
    } catch (error) {
        console.error("❌ Error saving healthdata:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/* ------------------------------------------------------------------
    GET ALL HEALTH DATA SUMMARY
-------------------------------------------------------------------*/
app.get("/healthdata/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        const data = await HealthData.find({ userId })
            .sort({ timestamp: -1 })
            .limit(100);

        res.status(200).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ------------------------------------------------------------------
    GET RAW METRIC DATA
-------------------------------------------------------------------*/
app.get("/healthdata/:userId/:metric", async (req, res) => {
    try {
        const { userId, metric } = req.params;

        const collections = {
            steps: Steps,
            heartrate: HeartRate,
            calories: Calories,
            oxygen: OxygenSaturation,
            distance: Distance,
            bloodpressure: BloodPressure,
            glucose: BloodGlucose,
            temperature: BodyTemperature,
            weight: Weight,
            hydration: Hydration,
            sleep: Sleep,
            exercise: Exercise,
        };

        const Model = collections[metric.toLowerCase()];
        if (!Model)
            return res.status(400).json({ error: "Invalid metric name" });

        const data = await Model.find({ userId })
            .sort({ timestamp: -1 })
            .limit(200);

        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("❌ Error fetching metric:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = app;
