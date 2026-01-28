const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

// ============================================================================
// UTILITIES
// ============================================================================
const { flattenDeep } = require("./utils/flatten");

// ============================================================================
// MODELS
// ============================================================================
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

// ============================================================================
// APP INITIALIZATION
// ============================================================================
const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/healthapp";

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Cache control middleware for summary endpoint (30 seconds)
const cacheMiddleware = (duration) => (req, res, next) => {
    res.set('Cache-Control', `public, max-age=${duration}`);
    next();
};

// ============================================================================
// DATABASE CONNECTION
// ============================================================================
mongoose.set("strictQuery", false);

mongoose
    .connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
    })
    .then(() => {
        console.log("✅ MongoDB connected");
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
        });
    })
    .catch((err) => {
        console.error("❌ MongoDB Error:", err.message);
        process.exit(1);
    });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely convert value to Date object
 * @param {*} v - Value to convert
 * @returns {Date|null} Date object or null
 */
const safeDate = (v) => (v ? new Date(v) : null);

/**
 * Flatten object and add prefix to all keys
 * @param {Object} obj - Object to flatten
 * @param {string} prefix - Prefix to add to keys
 * @returns {Object} Flattened object with prefixed keys
 */
const flattenAndPrefix = (obj, prefix) => {
    if (!obj || typeof obj !== "object") return {};
    const flat = flattenDeep(obj);
    const prefixed = {};
    for (const k of Object.keys(flat)) {
        prefixed[`${prefix}${k}`] = flat[k];
    }
    return prefixed;
};

/**
 * Extract timestamp from various possible fields in an object
 * @param {Object} obj - Object containing timestamp data
 * @param {string} fallback - Fallback timestamp
 * @returns {string} ISO timestamp string
 */
const extractTimestamp = (obj, fallback = null) => {
    if (!obj) return fallback || new Date().toISOString();
    
    const possible =
        obj.time ||
        obj.timestamp ||
        obj.startTime ||
        obj.endTime ||
        obj.recordedAt ||
        obj.sampleTime ||
        obj.sampleTimestamp;
    
    try {
        if (possible) return new Date(possible).toISOString();
        if (obj.timeRange && obj.timeRange.startTime) {
            return new Date(obj.timeRange.startTime).toISOString();
        }
        return fallback || new Date().toISOString();
    } catch (e) {
        return fallback || new Date().toISOString();
    }
};

// ============================================================================
// DATA PROCESSING FUNCTIONS
// ============================================================================

/**
 * Process raw health data and calculate aggregated metrics
 * @param {Object} rawData - Raw health data from request
 * @returns {Object} Aggregated health metrics
 */
const processRawHealthData = (rawData) => {
    const { 
        steps = [], 
        heartRate = [], 
        calories = [], 
        activeCalories = [],
        sleepSessions = [],
        distance = [],
        oxygenSaturation = [],
    } = rawData;

    // Calculate total steps
    const totalSteps = steps.reduce((sum, r) => sum + (r.count || r.stepCount || 0), 0);
    
    // Calculate heart rate metrics
    const allBPMs = [];
    heartRate.forEach(r => {
        if (Array.isArray(r.samples)) {
            r.samples.forEach(s => {
                const bpm = s.beatsPerMinute || s.bpm || s.value;
                if (bpm) allBPMs.push(bpm);
            });
        } else {
            const bpm = r.beatsPerMinute || r.bpm || r.value;
            if (bpm) allBPMs.push(bpm);
        }
    });
    
    const avgHeartRate = allBPMs.length > 0 
        ? Math.round(allBPMs.reduce((a, b) => a + b, 0) / allBPMs.length) 
        : null;
    const minHeartRate = allBPMs.length > 0 ? Math.min(...allBPMs) : null;
    const maxHeartRate = allBPMs.length > 0 ? Math.max(...allBPMs) : null;

    // Calculate total calories
    const totalCalories = calories.reduce((sum, r) => {
        const kcal = (r.energy?.inKilocalories || r.energy?.kcal || r.kcal || r.value || 0);
        return sum + kcal;
    }, 0);

    // Calculate total active calories
    const totalActiveCalories = activeCalories.reduce((sum, r) => {
        const kcal = (r.energy?.inKilocalories || r.energy?.kcal || r.kcal || r.value || 0);
        return sum + kcal;
    }, 0);

    // Calculate total distance
    const totalDistanceMeters = distance.reduce((sum, r) => {
        const meters = r.distance?.inMeters || r.distance?.meters || r.meters || r.value || 0;
        return sum + meters;
    }, 0);

    // Calculate average oxygen saturation
    const oxygenValues = oxygenSaturation
        .map(o => o.percentage?.value || o.value || o.percent)
        .filter(v => typeof v === 'number' && !isNaN(v));
    const avgOxygen = oxygenValues.length > 0 
        ? parseFloat((oxygenValues.reduce((a, b) => a + b, 0) / oxygenValues.length).toFixed(2)) 
        : null;

    // Calculate total sleep duration
    const totalSleepMinutes = sleepSessions.reduce((sum, s) => {
        if (s.durationMinutes) return sum + s.durationMinutes;
        if (s.startTime && s.endTime) {
            const duration = (new Date(s.endTime) - new Date(s.startTime)) / (1000 * 60);
            return sum + (isFinite(duration) ? duration : 0);
        }
        return sum;
    }, 0);

    return {
        stepsTotal: totalSteps,
        heartRateAvg: avgHeartRate,
        heartRateMin: minHeartRate,
        heartRateMax: maxHeartRate,
        caloriesTotal: Math.round(totalCalories),
        activeCaloriesTotal: Math.round(totalActiveCalories),
        distanceMeters: Math.round(totalDistanceMeters),
        oxygenAvg: avgOxygen,
        sleepMinutesTotal: Math.round(totalSleepMinutes),
    };
};

/**
 * Extract latest timestamps for each health metric type
 * @param {Object} rawData - Raw health data
 * @returns {Object} Latest timestamps for each metric
 */
const extractLatestTimestamps = (rawData) => {
    const timestamps = { combined: new Date().toISOString() };

    const findLatest = (arr, timeKey = 'timestamp') => {
        if (!arr || arr.length === 0) return null;
        return arr.reduce((latest, item) => {
            let t = item[timeKey];
            if (!t && timeKey === 'timestamp') {
                t = extractTimestamp(item);
            }
            return !latest || new Date(t) > new Date(latest) ? t : latest;
        }, null);
    };

    timestamps.steps = findLatest(rawData.steps || [], 'endTime');
    timestamps.heartRate = findLatest(rawData.heartRate || []);
    timestamps.calories = findLatest(rawData.calories || []);
    timestamps.activeCalories = findLatest(rawData.activeCalories || []);
    timestamps.distance = findLatest(rawData.distance || []);
    timestamps.oxygenSaturation = findLatest(rawData.oxygenSaturation || []);
    timestamps.sleep = findLatest(rawData.sleepSessions || [], 'endTime');
    timestamps.bloodPressure = findLatest(rawData.bloodPressure || []);
    timestamps.bloodGlucose = findLatest(rawData.bloodGlucose || []);
    timestamps.bodyTemperature = findLatest(rawData.bodyTemperature || []);
    timestamps.weight = findLatest(rawData.weight || []);
    timestamps.hydration = findLatest(rawData.hydration || []);
    timestamps.exercise = findLatest(rawData.exercise || [], 'endTime');

    return timestamps;
};

// ============================================================================
// CORE DATA PROCESSING
// ============================================================================

/**
 * Process and save a single health data record with all associated metrics
 * @param {Object} data - Health data object
 * @returns {Promise<Object>} Processing result with record ID and timestamps
 */
const processSingleHealthData = async (data) => {
    const { userId, timestamp, rawData, combined } = data;

    // Validate required fields
    if (!userId) {
        throw new Error("userId is required");
    }

    const healthData = rawData || data;
    const calculatedCombined = rawData ? processRawHealthData(rawData) : (combined || {});

    // Create main HealthData record
    const combinedRow = new HealthData({
        userId,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        steps: calculatedCombined.stepsTotal || 0,
        heartRate: calculatedCombined.heartRateAvg || null,
        calories: calculatedCombined.caloriesTotal || 0,
        distance: calculatedCombined.distanceMeters || 0,
        oxygenSaturation: calculatedCombined.oxygenAvg || null,
        sleepMinutes: calculatedCombined.sleepMinutesTotal || 0,
    });

    await combinedRow.save();
    const healthDataId = combinedRow._id;

    // Process and save detailed metric data
    await saveStepsData(healthData, userId, healthDataId, timestamp);
    await saveHeartRateData(healthData, userId, healthDataId, timestamp);
    await saveCaloriesData(healthData, userId, healthDataId, timestamp);
    await saveDistanceData(healthData, userId, healthDataId, timestamp);
    await saveOxygenSaturationData(healthData, userId, healthDataId, timestamp);
    await saveBloodPressureData(healthData, userId, healthDataId, timestamp);
    await saveBloodGlucoseData(healthData, userId, healthDataId, timestamp);
    await saveBodyTemperatureData(healthData, userId, healthDataId, timestamp);
    await saveWeightData(healthData, userId, healthDataId, timestamp);
    await saveHydrationData(healthData, userId, healthDataId, timestamp);
    await saveSleepData(healthData, userId, healthDataId, timestamp);
    await saveExerciseData(healthData, userId, healthDataId, timestamp);

    const latestTimestamps = rawData ? extractLatestTimestamps(rawData) : null;

    return {
        success: true,
        recordId: combinedRow._id,
        userId: combinedRow.userId,
        timestamp: combinedRow.timestamp,
        latestTimestamps,
    };
};

// ============================================================================
// METRIC-SPECIFIC SAVE FUNCTIONS
// ============================================================================

/**
 * Save steps data to database
 */
const saveStepsData = async (healthData, userId, healthDataId, timestamp) => {
    const steps = healthData.steps || [];
    if (!Array.isArray(steps) || !steps.length) return;

    const docs = steps.map((r) => {
        const ts = safeDate(r.endTime || r.timestamp || r.startTime || timestamp);
        const base = {
            userId,
            healthDataId,
            timestamp: ts || new Date(),
            count: r.count ?? r.stepCount ?? r.value ?? 0,
            startTime: safeDate(r.startTime),
            endTime: safeDate(r.endTime),
        };
        if (r.metadata) Object.assign(base, flattenAndPrefix(r.metadata, "metadata_"));
        return base;
    });
    await Steps.insertMany(docs);
};

/**
 * Save heart rate data to database
 */
const saveHeartRateData = async (healthData, userId, healthDataId, timestamp) => {
    const heartRate = healthData.heartRate || [];
    if (!Array.isArray(heartRate) || !heartRate.length) return;

    const docs = [];
    heartRate.forEach((r) => {
        if (Array.isArray(r.samples) && r.samples.length > 0) {
            r.samples.forEach(s => {
                const ts = safeDate(s.time || s.timestamp || r.startTime || r.time || timestamp);
                const bpm = s.beatsPerMinute ?? s.bpm ?? s.value ?? null;
                docs.push({
                    userId,
                    healthDataId,
                    timestamp: ts || new Date(),
                    bpm,
                });
            });
        } else {
            const ts = safeDate(r.timestamp || r.time || timestamp);
            const bpm = r.beatsPerMinute ?? r.bpm ?? r.value ?? null;
            docs.push({
                userId,
                healthDataId,
                timestamp: ts || new Date(),
                bpm,
            });
        }
    });
    if (docs.length) await HeartRate.insertMany(docs);
};

/**
 * Save calories data to database (total and active)
 */
const saveCaloriesData = async (healthData, userId, healthDataId, timestamp) => {
    const pushCalories = async (arr, typeLabel = "total") => {
        if (!Array.isArray(arr) || !arr.length) return;
        const docs = arr.map((r) => {
            const ts = safeDate(r.timestamp || r.startTime || r.endTime || timestamp);
            const kcal = (r.energy?.inKilocalories || r.energy?.kcal || r.kcal || r.value || 0);
            return {
                userId,
                healthDataId,
                timestamp: ts || new Date(),
                kilocalories: kcal,
                type: typeLabel,
                startTime: safeDate(r.startTime),
                endTime: safeDate(r.endTime),
            };
        });
        await Calories.insertMany(docs);
    };

    await pushCalories(healthData.calories, "total");
    await pushCalories(healthData.activeCalories, "active");
};

/**
 * Save distance data to database
 */
const saveDistanceData = async (healthData, userId, healthDataId, timestamp) => {
    const distance = healthData.distance || [];
    if (!Array.isArray(distance) || !distance.length) return;

    const docs = distance.map((r) => {
        const ts = safeDate(r.timestamp || r.endTime || r.startTime || timestamp);
        const meters = r.distance?.inMeters || r.distance?.meters || r.meters || r.value || 0;
        return {
            userId,
            healthDataId,
            timestamp: ts || new Date(),
            meters,
            startTime: safeDate(r.startTime),
            endTime: safeDate(r.endTime),
        };
    });
    await Distance.insertMany(docs);
};

/**
 * Save oxygen saturation data to database
 */
const saveOxygenSaturationData = async (healthData, userId, healthDataId, timestamp) => {
    const oxygenSaturation = healthData.oxygenSaturation || [];
    if (!Array.isArray(oxygenSaturation) || !oxygenSaturation.length) return;

    const docs = oxygenSaturation.map((o) => {
        const ts = safeDate(o.timestamp || o.time || timestamp);
        const percentage = o.percentage?.value || o.value || o.percent || null;
        return {
            userId,
            healthDataId,
            timestamp: ts || new Date(),
            percentage: typeof percentage === 'number' ? percentage : parseFloat(percentage) || null,
        };
    });
    await OxygenSaturation.insertMany(docs);
};

/**
 * Save blood pressure data to database (type/value per document)
 */
const saveBloodPressureData = async (healthData, userId, healthDataId, timestamp) => {
    const bloodPressure = healthData.bloodPressure || [];
    if (!Array.isArray(bloodPressure) || !bloodPressure.length) return;

    // Accepts: [{type: 'systolic', value: 120, ...}, {type: 'diastolic', value: 80, ...}] or legacy {systolic, diastolic}
    const docs = [];
    bloodPressure.forEach(bp => {
        const ts = safeDate(bp.timestamp || bp.time || timestamp);
        if (bp.type && bp.value !== undefined) {
            docs.push({
                userId,
                healthDataId,
                timestamp: ts || new Date(),
                type: bp.type,
                value: bp.value
            });
        } else {
            // Legacy: {systolic, diastolic}
            if (bp.systolic !== undefined) {
                docs.push({
                    userId,
                    healthDataId,
                    timestamp: ts || new Date(),
                    type: 'systolic',
                    value: bp.systolic
                });
            }
            if (bp.diastolic !== undefined) {
                docs.push({
                    userId,
                    healthDataId,
                    timestamp: ts || new Date(),
                    type: 'diastolic',
                    value: bp.diastolic
                });
            }
        }
    });
    if (docs.length) await BloodPressure.insertMany(docs);
};

/**
 * Save blood glucose data to database
 */
const saveBloodGlucoseData = async (healthData, userId, healthDataId, timestamp) => {
    const bloodGlucose = healthData.bloodGlucose || [];
    if (!Array.isArray(bloodGlucose) || !bloodGlucose.length) return;

    const docs = bloodGlucose.map((g) => {
        const ts = safeDate(g.timestamp || timestamp);
        return {
            userId,
            healthDataId,
            timestamp: ts || new Date(),
            mmolPerL: g.level?.inMillimolesPerLiter || g.level?.value || g.level || g.mmolPerL || g.value || null,
        };
    });
    await BloodGlucose.insertMany(docs);
};

/**
 * Save body temperature data to database
 */
const saveBodyTemperatureData = async (healthData, userId, healthDataId, timestamp) => {
    const bodyTemperature = healthData.bodyTemperature || [];
    if (!Array.isArray(bodyTemperature) || !bodyTemperature.length) return;

    const docs = bodyTemperature.map((t) => {
        const ts = safeDate(t.timestamp || t.endTime || t.startTime || timestamp);
        return {
            userId,
            healthDataId,
            timestamp: ts || new Date(),
            celsius: t.temperature?.inCelsius || t.temperature?.value || t.celsius || t.value || null,
        };
    });
    await BodyTemperature.insertMany(docs);
};

/**
 * Save weight data to database
 */
const saveWeightData = async (healthData, userId, healthDataId, timestamp) => {
    const weight = healthData.weight || [];
    if (!Array.isArray(weight) || !weight.length) return;

    const docs = weight.map((w) => {
        const ts = safeDate(w.timestamp || timestamp);
        return {
            userId,
            healthDataId,
            timestamp: ts || new Date(),
            kilograms: w.weight?.inKilograms || w.weight?.value || w.kilograms || w.kg || w.value || null,
        };
    });
    await Weight.insertMany(docs);
};

/**
 * Save hydration data to database
 */
const saveHydrationData = async (healthData, userId, healthDataId, timestamp) => {
    const hydration = healthData.hydration || [];
    if (!Array.isArray(hydration) || !hydration.length) return;

    const docs = hydration.map((h) => {
        const ts = safeDate(h.timestamp || timestamp);
        return {
            userId,
            healthDataId,
            timestamp: ts || new Date(),
            liters: h.volume?.inLiters || h.volume?.value || h.liters || h.value || null,
        };
    });
    await Hydration.insertMany(docs);
};

/**
 * Save sleep session data to database
 */
const saveSleepData = async (healthData, userId, healthDataId, timestamp) => {
    const sleep = healthData.sleepSessions || healthData.sleep || [];
    if (!Array.isArray(sleep) || !sleep.length) return;

    const docs = sleep.map((s) => {
        const start = safeDate(s.startTime);
        const end = safeDate(s.endTime);
        const ts = end || start || new Date();
        let durationMinutes = s.durationMinutes || s.totalMinutes || null;
        if (!durationMinutes && start && end) {
            durationMinutes = (new Date(end) - new Date(start)) / (1000 * 60);
        }
        return {
            userId,
            healthDataId,
            startTime: start,
            endTime: end,
            timestamp: ts,
            durationMinutes: isFinite(durationMinutes) ? Math.round(durationMinutes) : null,
        };
    });
    await Sleep.insertMany(docs);
};

/**
 * Save exercise session data to database
 */
const saveExerciseData = async (healthData, userId, healthDataId, timestamp) => {
    const exercise = healthData.exercise || [];
    if (!Array.isArray(exercise) || !exercise.length) return;

    const docs = exercise.map((e) => {
        const start = safeDate(e.startTime);
        const end = safeDate(e.endTime);
        const ts = end || start || new Date();
        let durationMinutes = e.durationMinutes || null;
        if (!durationMinutes && start && end) {
            durationMinutes = (new Date(end) - new Date(start)) / (1000 * 60);
        }
        return {
            userId,
            healthDataId,
            timestamp: ts,
            type: e.exerciseType || e.type || 'unknown',
            startTime: start,
            endTime: end,
            durationMinutes: isFinite(durationMinutes) ? Math.round(durationMinutes) : null,
        };
    });
    await Exercise.insertMany(docs);
};

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * POST /latest-healthdata
 * Get the latest timestamps for each health metric for a specific user
 */
app.post("/latest-healthdata", async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ message: "userId is required" });
        }

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

/**
 * POST /healthdata
 * Submit a single health data record
 */
app.post("/healthdata", async (req, res) => {
    try {
        const data = req.body;
        
        console.log(`📊 Processing health data for user: ${data.userId}`);
        
        const result = await processSingleHealthData(data);
        
        console.log(`✅ Health data saved successfully - ID: ${result.recordId}`);
        
        return res.status(200).json({
            success: true,
            message: "Health data saved successfully",
            recordId: result.recordId,
            timestamp: result.timestamp,
            latestTimestamps: result.latestTimestamps,
        });
    } catch (error) {
        console.error("❌ Error saving healthdata:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /healthdata/batch
 * Submit multiple health data records in a single request
 */
app.post("/healthdata/batch", async (req, res) => {
    try {
        const { data: batchData } = req.body;

        if (!Array.isArray(batchData) || batchData.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Invalid batch data: expected array of health records",
            });
        }

        console.log(`📦 Processing batch of ${batchData.length} health records...`);

        const results = {
            total: batchData.length,
            successful: 0,
            failed: 0,
            errors: [],
            savedRecords: [],
        };

        let latestTimestamps = null;

        for (let i = 0; i < batchData.length; i++) {
            const healthData = batchData[i];

            try {
                console.log(`   🔍 [${i + 1}/${batchData.length}] Processing user: ${healthData.userId}`);
                
                const result = await processSingleHealthData(healthData);
                
                // Track latest timestamps across all records
                if (result.latestTimestamps) {
                    if (!latestTimestamps) {
                        latestTimestamps = result.latestTimestamps;
                    } else {
                        Object.keys(result.latestTimestamps).forEach(key => {
                            const newTs = result.latestTimestamps[key];
                            const currentTs = latestTimestamps[key];
                            if (newTs && (!currentTs || new Date(newTs) > new Date(currentTs))) {
                                latestTimestamps[key] = newTs;
                            }
                        });
                    }
                }
                
                results.successful++;
                results.savedRecords.push({
                    recordId: result.recordId,
                    userId: result.userId,
                    timestamp: result.timestamp,
                    index: i,
                });

                console.log(`   ✅ [${i + 1}/${batchData.length}] Saved successfully`);
            } catch (error) {
                results.failed++;
                results.errors.push({
                    index: i,
                    userId: healthData.userId || 'unknown',
                    error: error.message,
                    timestamp: healthData.timestamp,
                });
                console.error(`   ❌ [${i + 1}/${batchData.length}] Failed:`, error.message);
            }
        }

        console.log(`🎉 Batch processing complete: ${results.successful} successful, ${results.failed} failed`);

        const statusCode = results.failed === 0 ? 200 : (results.successful === 0 ? 400 : 207);

        return res.status(statusCode).json({
            success: results.failed === 0,
            message: `Batch processing complete: ${results.successful}/${results.total} successful`,
            results: {
                total: results.total,
                successful: results.successful,
                failed: results.failed,
            },
            savedRecords: results.savedRecords,
            errors: results.errors.length > 0 ? results.errors : undefined,
            latestTimestamps,
        });
    } catch (error) {
        console.error("❌ Error in batch processing:", error);
        res.status(500).json({
            success: false,
            error: "Batch processing failed",
            message: error.message,
        });
    }
});

/**
 * GET /healthdata/:userId
 * Retrieve health data history for a specific user
 */
app.get("/healthdata/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const data = await HealthData.find({ userId })
            .sort({ timestamp: -1 })
            .limit(100);
        
        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("❌ Error fetching health data:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /healthdata/:userId/summary
 * Returns the latest value for each health metric for dashboard summary
 * IMPORTANT: This route must be defined BEFORE /healthdata/:userId/:metric
 * Optimized with 30-second cache
 */
app.get("/healthdata/:userId/summary", cacheMiddleware(30), async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('--- /healthdata/:userId/summary DEBUG ---');
        console.log('Received userId:', userId);
        if (!userId) {
            console.log('No userId provided in params!');
            return res.status(400).json({ error: "userId is required" });
        }

        // Map of metric name to Mongoose model and value field(s)
        // Use keys that match frontend HEALTH_DATA_TYPES ids exactly
        const metrics = {
            bloodpressure: { model: BloodPressure },
            heartrate: { model: HeartRate, value: "bpm" },
            steps: { model: Steps, value: "count" },
            calories: { model: Calories, value: "kilocalories" },
            distance: { model: Distance, value: "meters" },
            sleep: { model: Sleep, value: "durationMinutes" },
            weight: { model: Weight, value: "kilograms" },
            oxygen: { model: OxygenSaturation, value: "percentage", altFields: ["percent", "value", "oxygenSaturation"] },
            glucose: { model: BloodGlucose, value: "mmolPerL" },
            temperature: { model: BodyTemperature, value: "celsius" },
            hydration: { model: Hydration, value: "liters" }
        };

        const summary = {};
        for (const [key, { model, value, altFields }] of Object.entries(metrics)) {
            try {
                if (!model) {
                    console.error(`Model for metric '${key}' is not defined.`);
                    summary[key] = { value: null, timestamp: null };
                    continue;
                }
                if (key === 'bloodpressure') {
                    // Get latest systolic and diastolic
                    const systolicDoc = await model.findOne({ userId, type: 'systolic' }).sort({ timestamp: -1 });
                    const diastolicDoc = await model.findOne({ userId, type: 'diastolic' }).sort({ timestamp: -1 });
                    summary[key] = {
                        value: [systolicDoc ? systolicDoc.value : null, diastolicDoc ? diastolicDoc.value : null],
                        timestamp: systolicDoc && diastolicDoc ? (systolicDoc.timestamp > diastolicDoc.timestamp ? systolicDoc.timestamp.toISOString() : diastolicDoc.timestamp.toISOString()) : (systolicDoc ? systolicDoc.timestamp.toISOString() : (diastolicDoc ? diastolicDoc.timestamp.toISOString() : null))
                    };
                    continue;
                }
                const doc = await model.findOne({ userId }).sort({ timestamp: -1 });
                if (key === 'oxygen' && doc) {
                    console.log(`🔍 OXYGEN DEBUG - Full doc:`, JSON.stringify(doc, null, 2));
                    console.log(`🔍 OXYGEN DEBUG - doc.percentage:`, doc.percentage, `type:`, typeof doc.percentage);
                    console.log(`🔍 OXYGEN DEBUG - All doc keys:`, Object.keys(doc.toObject ? doc.toObject() : doc));
                }
                console.log(`Metric: ${key}, Query: { userId: ${userId} }, Found:`, doc ? 'YES' : 'NO', doc ? `value: ${doc[Array.isArray(value) ? value[0] : value]}` : '');
                if (!doc) {
                    summary[key] = { value: null, timestamp: null };
                } else if (Array.isArray(value)) {
                    summary[key] = {
                        value: value.map(v => doc[v] ?? null),
                        timestamp: doc.timestamp ? doc.timestamp.toISOString() : null
                    };
                } else {
                    let extractedValue = doc[value] ?? null;
                    // Try alternative field names if primary field is null
                    if (extractedValue === null && altFields && Array.isArray(altFields)) {
                        for (const altField of altFields) {
                            if (doc[altField] !== null && doc[altField] !== undefined) {
                                extractedValue = doc[altField];
                                console.log(`✅ Using alternative field '${altField}' for ${key}: ${extractedValue}`);
                                break;
                            }
                        }
                    }
                    summary[key] = {
                        value: extractedValue,
                        timestamp: doc.timestamp ? doc.timestamp.toISOString() : null
                    };
                }
            } catch (err) {
                console.error(`Error fetching summary for metric '${key}':`, err.message);
                summary[key] = { value: null, timestamp: null };
            }
        }

        console.log('Summary result:', JSON.stringify(summary, null, 2));
        return res.json({ success: true, summary });
    } catch (err) {
        console.error('Error in /healthdata/:userId/summary:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /healthdata/:userId/:metric
 * Retrieve specific metric data for a user
 */
app.get("/healthdata/:userId/:metric", async (req, res) => {
    try {
        const { userId, metric } = req.params;
        const { period } = req.query;

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
        if (!Model) {
            return res.status(400).json({ error: "Invalid metric name" });
        }

        // Calculate date range based on period
        const currentDate = new Date();
        let startDate = new Date();

        switch(period) {
            case 'daily':
                startDate.setDate(currentDate.getDate() - 1);
                break;
            case 'weekly':
                startDate.setDate(currentDate.getDate() - 7);
                break;
            case 'monthly':
                startDate.setDate(currentDate.getDate() - 30);
                break;
            case 'quarterly':
                startDate.setDate(currentDate.getDate() - 90);
                break;
            case 'yearly':
                startDate.setDate(currentDate.getDate() - 365);
                break;
            default:
                startDate.setDate(currentDate.getDate() - 7); // Default to weekly
        }

        let data = await Model.find({ 
            userId,
            timestamp: {
                $gte: startDate,
                $lte: currentDate
            }
        })
            .sort({ timestamp: 1 }) // Sort ASC (oldest to newest)
            .limit(2000)
            .lean();

        // Group data by day
        const groupByDay = (arr) => {
            return arr.reduce((acc, item) => {
                const day = item.timestamp.toISOString().slice(0, 10);
                if (!acc[day]) acc[day] = [];
                acc[day].push(item);
                return acc;
            }, {});
        };

        // Only filter for weekly/monthly, not daily
        if (metric.toLowerCase() === 'bloodpressure' && (period === 'weekly' || period === 'monthly')) {
            // For each day, keep first and last value for both diastolic & systolic
            const grouped = groupByDay(data);
            let filtered = [];
            Object.values(grouped).forEach(dayArr => {
                if (dayArr.length === 1) {
                    filtered.push(dayArr[0]);
                } else if (dayArr.length > 1) {
                    // Separate systolic and diastolic by type field
                    const systolicArr = dayArr.filter(d => d.type === 'systolic');
                    const diastolicArr = dayArr.filter(d => d.type === 'diastolic');
                    
                    // Get first and last for systolic
                    if (systolicArr.length > 0) {
                        filtered.push(systolicArr[0]); // first
                        if (systolicArr.length > 1) {
                            filtered.push(systolicArr[systolicArr.length - 1]); // last
                        }
                    }
                    
                    // Get first and last for diastolic
                    if (diastolicArr.length > 0) {
                        filtered.push(diastolicArr[0]); // first
                        if (diastolicArr.length > 1) {
                            filtered.push(diastolicArr[diastolicArr.length - 1]); // last
                        }
                    }
                }
            });
            data = filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            console.log(`Filtered bloodpressure data for period '${period}':`, JSON.stringify(data, null, 2));
        } else if (period === 'weekly') {
            // For each day, get first and last reading (generic)
            const grouped = groupByDay(data);
            let filtered = [];
            Object.values(grouped).forEach(dayArr => {
                if (dayArr.length === 1) {
                    filtered.push(dayArr[0]);
                } else if (dayArr.length > 1) {
                    filtered.push(dayArr[0]); // first
                    filtered.push(dayArr[dayArr.length - 1]); // last
                }
            });
            data = filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        } else if (period === 'monthly') {
            // For each day, get only the first value (generic)
            const grouped = groupByDay(data);
            let filtered = [];
            Object.values(grouped).forEach(dayArr => {
                filtered.push(dayArr[0]);
            });
            data = filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }

        // Special formatting for bloodpressure to match /blood_pressure endpoint (now with type/value)
        if (metric.toLowerCase() === 'bloodpressure') {
            if (!data.length) {
                return res.status(200).json({
                    success: true,
                    sortedBloodData: [],
                    totalRecords: 0,
                    dateValue: new Date().toISOString().slice(0, 10),
                    message: "No data available for the selected period"
                });
            }
            // Group by timestamp and userId, then map type/value to systolic/diastolic
            const grouped = {};
            data.forEach(item => {
                const key = item.userId + '|' + (item.timestamp ? item.timestamp.toISOString() : '');
                if (!grouped[key]) grouped[key] = { dateFrom: item.timestamp?.toISOString(), userId: item.userId, systolic: null, diastolic: null, unit: "mmHg" };
                if (item.type === 'systolic') grouped[key].systolic = item.value;
                if (item.type === 'diastolic') grouped[key].diastolic = item.value;
            });
            const formattedBloodData = Object.values(grouped).sort((a, b) => new Date(a.dateFrom) - new Date(b.dateFrom));
            const latestDateFormatted = formattedBloodData.length > 0 
                ? formattedBloodData[formattedBloodData.length - 1].dateFrom.slice(0, 10)
                : new Date().toISOString().slice(0, 10);
            return res.status(200).json({
                success: true,
                sortedBloodData: formattedBloodData,
                dateValue: latestDateFormatted,
                totalRecords: formattedBloodData.length,
                period: period || 'weekly',
                dateRange: {
                    start: formattedBloodData[0]?.dateFrom,
                    end: formattedBloodData[formattedBloodData.length - 1]?.dateFrom
                }
            });
        }

        // Default: return generic data
        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("❌ Error fetching metric:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post("/healthdata/:userId/:metric/range", async (req, res) => {
    try {
        const { userId, metric } = req.params;
        const { startTime, endTime } = req.body;

        if (!startTime || !endTime) {
            return res.status(400).json({ 
                error: 'startTime and endTime are required' 
            });
        }

        const queryStart = new Date(startTime);
        const queryEnd = new Date(endTime);
        
        if (isNaN(queryStart) || isNaN(queryEnd)) {
            return res.status(400).json({ error: 'Invalid startTime or endTime' });
        }

        const modelMap = {
            steps: Steps,
            heartrate: HeartRate,
            heart_rate: HeartRate,
            sleep: Sleep,
            calories: Calories,
            oxygen: OxygenSaturation,
            distance: Distance,
            bloodpressure: BloodPressure,
            blood_pressure: BloodPressure,
            glucose: BloodGlucose,
            bloodglucose: BloodGlucose,
            temperature: BodyTemperature,
            bodytemperature: BodyTemperature,
            weight: Weight,
            hydration: Hydration,
            exercise: Exercise,
        };

        const Model = modelMap[metric.toLowerCase()];
        if (!Model) {
            return res.status(400).json({ error: 'Invalid metric' });
        }

        console.log(`📊 Fetching ${metric} data for user: ${userId}`);
        console.log(`📅 Date range: ${queryStart.toISOString()} to ${queryEnd.toISOString()}`);

        let data = await Model.find({
            userId: userId,
            timestamp: {
                $gte: queryStart,
                $lte: queryEnd
            }
        })
        .sort({ timestamp: 1 })
        .limit(5000)
        .lean();

        console.log(`📦 Initial query found ${data.length} ${metric} records`);
        if (metric.toLowerCase() === 'bloodpressure' && data.length > 0) {
            console.log('🩺 Sample blood pressure records:', JSON.stringify(data.slice(0, 3), null, 2));
        }

        // Determine range type (daily/weekly/monthly) based on range length
        const msInDay = 24 * 60 * 60 * 1000;
        const rangeDays = Math.round((queryEnd - queryStart) / msInDay);
        let rangeType = 'custom';
        if (rangeDays <= 1) rangeType = 'daily';
        else if (rangeDays <= 8) rangeType = 'weekly';
        else if (rangeDays <= 32) rangeType = 'monthly';

        // Group data by day
        const groupByDay = (arr) => {
            return arr.reduce((acc, item) => {
                const day = item.timestamp.toISOString().slice(0, 10);
                if (!acc[day]) acc[day] = [];
                acc[day].push(item);
                return acc;
            }, {});
        };

        // Only filter for weekly/monthly, not daily
        if (metric.toLowerCase() === 'bloodpressure' && (rangeType === 'weekly' || rangeType === 'monthly')) {
            // For each day, keep first and last value for both diastolic & systolic
            const grouped = groupByDay(data);
            let filtered = [];
            Object.values(grouped).forEach(dayArr => {
                if (dayArr.length === 1) {
                    filtered.push(dayArr[0]);
                } else if (dayArr.length > 1) {
                    // Separate systolic and diastolic by type field
                    const systolicArr = dayArr.filter(d => d.type === 'systolic');
                    const diastolicArr = dayArr.filter(d => d.type === 'diastolic');
                    
                    // Get first and last for systolic
                    if (systolicArr.length > 0) {
                        filtered.push(systolicArr[0]); // first
                        if (systolicArr.length > 1) {
                            filtered.push(systolicArr[systolicArr.length - 1]); // last
                        }
                    }
                    
                    // Get first and last for diastolic
                    if (diastolicArr.length > 0) {
                        filtered.push(diastolicArr[0]); // first
                        if (diastolicArr.length > 1) {
                            filtered.push(diastolicArr[diastolicArr.length - 1]); // last
                        }
                    }
                }
            });
            data = filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            console.log(`🩺 After filtering for ${rangeType}: ${data.length} blood pressure records`);
        } else if (rangeType === 'weekly') {
            // For each day, get first and last reading (generic)
            const grouped = groupByDay(data);
            let filtered = [];
            Object.values(grouped).forEach(dayArr => {
                if (dayArr.length === 1) {
                    filtered.push(dayArr[0]);
                } else if (dayArr.length > 1) {
                    filtered.push(dayArr[0]); // first
                    filtered.push(dayArr[dayArr.length - 1]); // last
                }
            });
            data = filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        } else if (rangeType === 'monthly') {
            // For each day, get only the first value (generic)
            const grouped = groupByDay(data);
            let filtered = [];
            Object.values(grouped).forEach(dayArr => {
                filtered.push(dayArr[0]);
            });
            data = filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }

        if (!data.length) {
            console.log(`ℹ️ No ${metric} data found for user: ${userId} in specified range`);
            // Return appropriate format based on metric type
            let emptyResponse = { success: true, data: [], totalRecords: 0 };
            
            if (metric.toLowerCase() === 'heartrate' || metric.toLowerCase() === 'heart_rate') {
                emptyResponse.sortedHeartData = [];
            } else if (metric.toLowerCase() === 'bloodpressure' || metric.toLowerCase() === 'blood_pressure') {
                emptyResponse.sortedBloodData = [];
            }
            
            return res.status(200).json(emptyResponse);
        }

        console.log(`✅ ${metric} data retrieved: ${data.length} records`);

        // Format response based on metric type for backward compatibility
        let responseData = {
            success: true,
            data: data,
            totalRecords: data.length,
            dateRange: {
                start: data[0]?.timestamp,
                end: data[data.length - 1]?.timestamp
            }
        };

        // Add metric-specific formatted data for compatibility
        if (metric.toLowerCase() === 'heartrate' || metric.toLowerCase() === 'heart_rate') {
            responseData.sortedHeartData = data.map(item => ({
                timestamp: item.timestamp.toISOString(),
                userId: item.userId,
                bpm: item.bpm.toString(),
                unit: "bpm",
                type: "HEART_RATE"
            }));
        } else if (metric.toLowerCase() === 'bloodpressure' || metric.toLowerCase() === 'blood_pressure') {
            // Group by timestamp and userId, then map type/value to systolic/diastolic
            const grouped = {};
            data.forEach(item => {
                const key = item.userId + '|' + (item.timestamp ? item.timestamp.toISOString() : '');
                if (!grouped[key]) grouped[key] = { dateFrom: item.timestamp?.toISOString(), userId: item.userId, systolic: null, diastolic: null, unit: "mmHg" };
                if (item.type === 'systolic') grouped[key].systolic = item.value;
                if (item.type === 'diastolic') grouped[key].diastolic = item.value;
            });
            responseData.sortedBloodData = Object.values(grouped).sort((a, b) => new Date(a.dateFrom) - new Date(b.dateFrom));
        }

        res.status(200).json(responseData);
    } catch (error) {
        console.error(`❌ Error fetching ${req.params.metric} data:`, error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * POST /healthdata/:userId/steps/range
 * Get steps data for a time range (alias for metric=steps)
 */
app.post("/healthdata/:userId/steps/range", async (req, res) => {
    req.params.metric = 'steps';
    return app._router.handle(req, res, () => {});
});

/**
 * GET /health/stats
 * Get overall system statistics
 */
app.get("/health/stats", async (req, res) => {
    try {
        const stats = {
            totalRecords: await HealthData.countDocuments(),
            uniqueUsers: await HealthData.distinct('userId').then(arr => arr.length),
            metrics: {
                steps: await Steps.countDocuments(),
                heartRate: await HeartRate.countDocuments(),
                sleep: await Sleep.countDocuments(),
                calories: await Calories.countDocuments(),
                distance: await Distance.countDocuments(),
                oxygenSaturation: await OxygenSaturation.countDocuments(),
                bloodPressure: await BloodPressure.countDocuments(),
                bloodGlucose: await BloodGlucose.countDocuments(),
                bodyTemperature: await BodyTemperature.countDocuments(),
                weight: await Weight.countDocuments(),
                hydration: await Hydration.countDocuments(),
                exercise: await Exercise.countDocuments(),
            },
        };
        
        res.status(200).json({ success: true, stats });
    } catch (err) {
        console.error("❌ Error fetching stats:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /healthdata/:userId
 * Delete all health data for a specific user
 */
app.delete("/healthdata/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        
        await Promise.all([
            HealthData.deleteMany({ userId }),
            Steps.deleteMany({ userId }),
            HeartRate.deleteMany({ userId }),
            Calories.deleteMany({ userId }),
            Distance.deleteMany({ userId }),
            OxygenSaturation.deleteMany({ userId }),
            BloodPressure.deleteMany({ userId }),
            BloodGlucose.deleteMany({ userId }),
            BodyTemperature.deleteMany({ userId }),
            Weight.deleteMany({ userId }),
            Hydration.deleteMany({ userId }),
            Sleep.deleteMany({ userId }),
            Exercise.deleteMany({ userId }),
        ]);
        
        console.log(`🗑️ Deleted all health data for user: ${userId}`);
        
        res.status(200).json({ 
            success: true, 
            message: `All health data deleted for user ${userId}` 
        });
    } catch (err) {
        console.error("❌ Error deleting health data:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * REMOVED: /blood_pressure endpoint - use /healthdata/:userId/bloodpressure?period=weekly instead
 * Or use /healthdata/:userId/bloodpressure/range for specific date ranges
 */

/**
 * REMOVED: /blood_pressure/range endpoint - use /healthdata/:userId/bloodpressure/range instead
 */

/**
 * REMOVED: /heart_rate endpoint - use /healthdata/:userId/heartrate?period=weekly instead
 * Or use /healthdata/:userId/heartrate/range for specific date ranges
 */


/**
 * GET /
 * Health check endpoint
 */
app.get("/", (req, res) => {
    res.status(200).json({ 
        message: "Health Monitor API Server", 
        status: "running",
        version: "1.0.0"
    });
});

// ============================================================================
// EXPORT
// ============================================================================
module.exports = app;