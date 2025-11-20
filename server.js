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
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// MongoDB Connection
const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/healthapp";

mongoose.set("strictQuery", false);

mongoose
    .connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000, // 10s timeout
    })
    .then(() => {
        console.log("✅ MongoDB connected successfully");

        // Start server ONLY after successful DB connection
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
            console.log(`📊 Health data endpoint: http://0.0.0.0:${PORT}/healthdata`);
        });
    })
    .catch((err) => {
        console.error("❌ MongoDB connection error:", err.message);
        process.exit(1);
    });

// =============== ROUTES =============== //

// Health check
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        timestamp: new Date(),
        message: "Health API is running",
    });
});

// ✅ POST: Save health data
app.post("/healthdata", async (req, res) => {
    try {
        const data = req.body;

        const { userId, timestamp } = data;
        if (!userId) return res.status(400).json({ error: "userId is required" });

        const healthData = new HealthData({
            userId,
            timestamp: timestamp || new Date(),
            steps: data.steps?.total || 0,
            heartRate: data.heartRate?.average || null,
            calories: data.calories?.total || 0,
            distance: data.distance?.totalMeters || 0,
            oxygenSaturation: data.oxygenSaturation?.average || null,
            sleepMinutes: data.sleep?.totalMinutes || 0,
        });

        await healthData.save();

        // Save Steps details
        if (Array.isArray(data.steps?.records) && data.steps.records.length > 0) {
            const stepsRecords = data.steps.records.map((r) => ({
                userId,
                timestamp: new Date(r.endTime || timestamp),
                count: r.count,
                startTime: new Date(r.startTime),
                endTime: new Date(r.endTime),
            }));
            await Steps.insertMany(stepsRecords);
        }

        // Heart Rate
        if (Array.isArray(data.heartRate?.samples) && data.heartRate.samples.length > 0) {
            const hrRecord = new HeartRate({
                userId,
                timestamp: new Date(timestamp),
                average: data.heartRate.average,
                min: data.heartRate.min,
                max: data.heartRate.max,
                samples: data.heartRate.samples,
            });
            await hrRecord.save();
        }

        // Calories
        if (data.calories) {
            await new Calories({
                userId,
                timestamp: new Date(timestamp),
                totalCalories: data.calories.total || 0,
                activeCalories: data.calories.active || 0,
            }).save();
        }

        // Distance
        if (data.distance) {
            await new Distance({
                userId,
                timestamp: new Date(timestamp),
                totalMeters: data.distance.totalMeters || 0,
                totalKilometers: parseFloat(data.distance.totalKilometers) || 0,
            }).save();
        }

        // Oxygen Saturation
        if (Array.isArray(data.oxygenSaturation?.samples) && data.oxygenSaturation.samples.length > 0) {
            await new OxygenSaturation({
                userId,
                timestamp: new Date(timestamp),
                average: parseFloat(data.oxygenSaturation.average),
                samples: data.oxygenSaturation.samples,
            }).save();
        }

        // Sleep
        if (data.sleep && data.sleep.totalMinutes > 0) {
            await new Sleep({
                userId,
                timestamp: new Date(timestamp),
                totalMinutes: data.sleep.totalMinutes,
                totalHours: parseFloat(data.sleep.totalHours),
                sessions: data.sleep.sessions,
            }).save();
        }

        // Blood Pressure
        if (data.bloodPressure) {
            await new BloodPressure({
                userId,
                timestamp: new Date(data.bloodPressure.timestamp || timestamp),
                systolic: data.bloodPressure.systolic,
                diastolic: data.bloodPressure.diastolic,
            }).save();
        }

        // Blood Glucose
        if (data.bloodGlucose) {
            await new BloodGlucose({
                userId,
                timestamp: new Date(data.bloodGlucose.timestamp || timestamp),
                level: data.bloodGlucose.level,
            }).save();
        }

        // Body Temperature
        if (data.bodyTemperature) {
            await new BodyTemperature({
                userId,
                timestamp: new Date(data.bodyTemperature.timestamp || timestamp),
                celsius: data.bodyTemperature.celsius,
            }).save();
        }

        // Weight
        if (data.weight) {
            await new Weight({
                userId,
                timestamp: new Date(data.weight.timestamp || timestamp),
                kilograms: data.weight.kilograms,
            }).save();
        }

        // Hydration
        if (data.hydration) {
            await new Hydration({
                userId,
                timestamp: new Date(timestamp),
                totalLiters: parseFloat(data.hydration.totalLiters),
            }).save();
        }

        // Exercise
        if (Array.isArray(data.exercise?.details) && data.exercise.details.length > 0) {
            const exerciseRecords = data.exercise.details.map((e) => ({
                userId,
                timestamp: new Date(e.endTime || timestamp),
                type: e.type,
                startTime: new Date(e.startTime),
                endTime: new Date(e.endTime),
                durationMinutes: e.duration,
            }));
            await Exercise.insertMany(exerciseRecords);
        }

        res.status(200).json({
            success: true,
            message: "Health data saved successfully",
            recordId: healthData._id,
        });
    } catch (error) {
        console.error("❌ Error saving health data:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ GET: All health data for user
app.get("/healthdata/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;

        const query = { userId };
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const healthData = await HealthData.find(query)
            .sort({ timestamp: -1 })
            .limit(100);

        res.status(200).json({
            success: true,
            count: healthData.length,
            data: healthData,
        });
    } catch (error) {
        console.error("❌ Error fetching health data:", error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ GET: Specific health metric
app.get("/healthdata/:userId/:metric", async (req, res) => {
    try {
        const { userId, metric } = req.params;
        const { startDate, endDate, limit = 100 } = req.query;

        const query = { userId };
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const modelMap = {
            steps: Steps,
            heartrate: HeartRate,
            sleep: Sleep,
            calories: Calories,
            oxygen: OxygenSaturation,
            distance: Distance,
            bloodpressure: BloodPressure,
            glucose: BloodGlucose,
            temperature: BodyTemperature,
            weight: Weight,
            hydration: Hydration,
            exercise: Exercise,
        };

        const Model = modelMap[metric.toLowerCase()];
        if (!Model)
            return res.status(400).json({ error: "Invalid metric specified" });

        const data = await Model.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            metric,
            count: data.length,
            data,
        });
    } catch (error) {
        console.error("❌ Error fetching metric data:", error);
        res.status(500).json({ error: error.message });
    }
});
