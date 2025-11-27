const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const { flattenDeep } = require("./utils/flatten");

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

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/healthapp";
mongoose.set("strictQuery", false);

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
})
    .then(() => {
        console.log("✅ MongoDB connected");
        app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on http://0.0.0.0:${PORT}`));
    })
    .catch((err) => {
        console.error("❌ MongoDB Error:", err.message);
        process.exit(1);
    });


app.post("/latest-healthdata", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: "userId is required" });

        const getLatest = async (Model, filter = {}) => {
            const doc = await Model.findOne({ userId, ...filter })
                .sort({ timestamp: -1 })
                .select("timestamp");
            return doc ? doc.timestamp.toISOString() : null;
        };

        const latestTimestamps = {
            steps: await getLatest(Steps),
            heartRate: await getLatest(HeartRate),
            calories: await getLatest(Calories, { type: "total" }),
            activeCalories: await getLatest(Calories, { type: "active" }),
            sleep: await getLatest(Sleep),
            oxygenSaturation: await getLatest(OxygenSaturation),
            distance: await getLatest(Distance),
            bloodPressure: await getLatest(BloodPressure),
            bloodGlucose: await getLatest(BloodGlucose),
            bodyTemperature: await getLatest(BodyTemperature),
            weight: await getLatest(Weight),
            hydration: await getLatest(Hydration),
            exercise: await getLatest(Exercise),
        };

        return res.status(200).json({
            success: true,
            latestTimestamps,
        });

    } catch (err) {
        console.error("❌ Error /latest-healthdata:", err);
        res.status(500).json({ error: err.message });
    }
});

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

        if (!userId) return res.status(400).json({ error: "userId is required" });

        const combinedRow = new HealthData({
            userId,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            steps: combined?.stepsTotal || 0,
            heartRate: combined?.heartRateAvg || null,
            calories: combined?.caloriesTotal || 0,
            distance: combined?.distanceMeters || 0,
            oxygenSaturation: combined?.oxygenAvg || null,
            sleepMinutes: combined?.sleepMinutesTotal || 0,
        });

        await combinedRow.save();

        const healthDataId = combinedRow._id;

        const safeDate = (v) => (v ? new Date(v) : null);
        const flattenAndPrefix = (obj, prefix) => {
            if (!obj || typeof obj !== "object") return {};
            const flat = flattenDeep(obj);
            const prefixed = {};
            for (const k of Object.keys(flat)) {
                prefixed[`${prefix}${k}`] = flat[k];
            }
            return prefixed;
        };

        if (Array.isArray(steps) && steps.length) {
            const docs = steps.map((r) => {
                const ts = safeDate(r.endTime || r.timestamp || r.startTime || timestamp);
                const base = {
                    userId,
                    healthDataId,
                    timestamp: ts || new Date(),
                    count: r.count ?? r.value ?? 0,
                    startTime: safeDate(r.startTime),
                    endTime: safeDate(r.endTime),
                };
                if (r.raw) {
                    Object.assign(base, flattenAndPrefix(r.raw, ""));
                    if (r.raw.metadata) Object.assign(base, flattenAndPrefix(r.raw.metadata, "metadata_"));
                }
                return base;
            });
            await Steps.insertMany(docs);
        }

        if (Array.isArray(heartRate) && heartRate.length) {
            const docs = heartRate.map((h) => {
                const ts = safeDate(h.timestamp || h.time || timestamp);
                const base = {
                    userId,
                    healthDataId,
                    timestamp: ts || new Date(),
                    bpm: h.bpm ?? h.beatsPerMinute ?? null,
                };
                if (h.rawSample) Object.assign(base, flattenAndPrefix(h.rawSample, "rawSample_"));
                if (h.raw) Object.assign(base, flattenAndPrefix(h.raw, ""));
                if (h.metadata) Object.assign(base, flattenAndPrefix(h.metadata, "metadata_"));
                return base;
            });
            await HeartRate.insertMany(docs);
        }

        const pushCalories = async (arr, typeLabel = "total") => {
            if (!Array.isArray(arr) || !arr.length) return;
            const docs = arr.map((r) => {
                const ts = safeDate(r.timestamp || r.endTime || r.startTime || timestamp);
                const base = {
                    userId,
                    healthDataId,
                    timestamp: ts || new Date(),
                    kilocalories: r.kcal ?? r.kilocalories ?? null,
                    type: typeLabel,
                    startTime: safeDate(r.startTime),
                    endTime: safeDate(r.endTime),
                };
                if (r.raw) {
                    Object.assign(base, flattenAndPrefix(r.raw, ""));
                    if (r.raw.metadata) Object.assign(base, flattenAndPrefix(r.raw.metadata, "metadata_"));
                    if (r.raw.energy) Object.assign(base, flattenAndPrefix(r.raw.energy, "energy_"));
                }
                return base;
            });
            await Calories.insertMany(docs);
        };

        await pushCalories(calories, "total");
        await pushCalories(activeCalories, "active");

        if (Array.isArray(distance) && distance.length) {
            const docs = distance.map((r) => {
                const ts = safeDate(r.timestamp || r.endTime || r.startTime || timestamp);
                const base = {
                    userId,
                    healthDataId,
                    timestamp: ts || new Date(),
                    meters: r.meters ?? (r.distance?.inMeters) ?? 0,
                    startTime: safeDate(r.startTime),
                    endTime: safeDate(r.endTime),
                };
                if (r.raw) {
                    Object.assign(base, flattenAndPrefix(r.raw, ""));
                    if (r.raw.metadata) Object.assign(base, flattenAndPrefix(r.raw.metadata, "metadata_"));
                    if (r.raw.distance) Object.assign(base, flattenAndPrefix(r.raw.distance, "distance_"));
                }
                return base;
            });
            await Distance.insertMany(docs);
        }

        if (Array.isArray(oxygenSaturation) && oxygenSaturation.length) {
            const docs = oxygenSaturation.map((o) => {
                const ts = safeDate(o.timestamp || o.time || timestamp);
                const base = {
                    userId,
                    healthDataId,
                    timestamp: ts || new Date(),
                    percentage: o.percentage ?? o.value ?? null,
                };
                if (o.raw) {
                    Object.assign(base, flattenAndPrefix(o.raw, ""));
                    if (o.raw.metadata) Object.assign(base, flattenAndPrefix(o.raw.metadata, "metadata_"));
                }
                return base;
            });
            await OxygenSaturation.insertMany(docs);
        }

        if (Array.isArray(bloodPressure) && bloodPressure.length) {
            const docs = bloodPressure.map((bp) => {
                const ts = safeDate(bp.timestamp || bp.time || timestamp);
                const base = {
                    userId,
                    healthDataId,
                    timestamp: ts || new Date(),
                    systolic: bp.systolic ?? bp.systolicValue ?? null,
                    diastolic: bp.diastolic ?? bp.diastolicValue ?? null,
                };
                if (bp.raw) {
                    Object.assign(base, flattenAndPrefix(bp.raw, ""));
                    if (bp.raw.metadata) Object.assign(base, flattenAndPrefix(bp.raw.metadata, "metadata_"));
                }
                return base;
            });
            await BloodPressure.insertMany(docs);
        }

        if (Array.isArray(bloodGlucose) && bloodGlucose.length) {
            const docs = bloodGlucose.map((g) => {
                const ts = safeDate(g.timestamp || timestamp);
                const base = {
                    userId,
                    healthDataId,
                    timestamp: ts || new Date(),
                    mmolPerL: g.level ?? g.mmolPerL ?? g.value ?? null,
                };
                if (g.raw) {
                    Object.assign(base, flattenAndPrefix(g.raw, ""));
                    if (g.raw.metadata) Object.assign(base, flattenAndPrefix(g.raw.metadata, "metadata_"));
                }
                return base;
            });
            await BloodGlucose.insertMany(docs);
        }

        if (Array.isArray(bodyTemperature) && bodyTemperature.length) {
            const docs = bodyTemperature.map((t) => {
                const ts = safeDate(t.timestamp || t.endTime || t.startTime || timestamp);
                const base = {
                    userId,
                    healthDataId,
                    timestamp: ts || new Date(),
                    celsius: t.celsius ?? t.value ?? null,
                };
                if (t.raw) {
                    Object.assign(base, flattenAndPrefix(t.raw, ""));
                    if (t.raw.metadata) Object.assign(base, flattenAndPrefix(t.raw.metadata, "metadata_"));
                }
                return base;
            });
            await BodyTemperature.insertMany(docs);
        }

        if (Array.isArray(weight) && weight.length) {
            const docs = weight.map((w) => {
                const ts = safeDate(w.timestamp || timestamp);
                const base = {
                    userId,
                    healthDataId,
                    timestamp: ts || new Date(),
                    kilograms: w.kilograms ?? w.value ?? null,
                };
                if (w.raw) {
                    Object.assign(base, flattenAndPrefix(w.raw, ""));
                    if (w.raw.metadata) Object.assign(base, flattenAndPrefix(w.raw.metadata, "metadata_"));
                }
                return base;
            });
            await Weight.insertMany(docs);
        }

        if (Array.isArray(hydration) && hydration.length) {
            const docs = hydration.map((h) => {
                const ts = safeDate(h.timestamp || timestamp);
                const base = {
                    userId,
                    healthDataId,
                    timestamp: ts || new Date(),
                    liters: h.liters ?? h.value ?? null,
                };
                if (h.raw) {
                    Object.assign(base, flattenAndPrefix(h.raw, ""));
                    if (h.raw.metadata) Object.assign(base, flattenAndPrefix(h.raw.metadata, "metadata_"));
                }
                return base;
            });
            await Hydration.insertMany(docs);
        }

        if (Array.isArray(sleep) && sleep.length) {
            const docs = sleep.map((s) => {
                const start = safeDate(s.startTime);
                const end = safeDate(s.endTime);
                const ts = end || start || new Date();
                const base = {
                    userId,
                    healthDataId,
                    startTime: start,
                    endTime: end,
                    timestamp: ts,
                    durationMinutes: s.durationMinutes ?? (s.totalMinutes ?? null),
                };
                if (s.raw) {
                    Object.assign(base, flattenAndPrefix(s.raw, ""));
                    if (s.raw.metadata) Object.assign(base, flattenAndPrefix(s.raw.metadata, "metadata_"));
                }
                return base;
            });
            await Sleep.insertMany(docs);
        }

        if (Array.isArray(exercise) && exercise.length) {
            const docs = exercise.map((e) => {
                const start = safeDate(e.startTime);
                const end = safeDate(e.endTime);
                const ts = end || start || new Date();
                const base = {
                    userId,
                    healthDataId,
                    timestamp: ts,
                    type: e.type,
                    startTime: start,
                    endTime: end,
                    durationMinutes: e.durationMinutes ?? null,
                };
                if (e.raw) {
                    Object.assign(base, flattenAndPrefix(e.raw, ""));
                    if (e.raw.metadata) Object.assign(base, flattenAndPrefix(e.raw.metadata, "metadata_"));
                }
                return base;
            });
            await Exercise.insertMany(docs);
        }

        return res.status(200).json({
            success: true,
            message: "Health data saved successfully",
            recordId: combinedRow._id,
        });
    } catch (error) {
        console.error("❌ Error saving healthdata:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get("/healthdata/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const data = await HealthData.find({ userId }).sort({ timestamp: -1 }).limit(100);
        res.status(200).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
        if (!Model) return res.status(400).json({ error: "Invalid metric name" });

        const data = await Model.find({ userId }).sort({ timestamp: -1 }).limit(200);
        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("❌ Error fetching metric:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = app;
