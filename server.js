// ============================================================================
// DEPENDENCIES
// ============================================================================
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
 * Save blood pressure data to database
 */
const saveBloodPressureData = async (healthData, userId, healthDataId, timestamp) => {
    const bloodPressure = healthData.bloodPressure || [];
    if (!Array.isArray(bloodPressure) || !bloodPressure.length) return;

    const docs = bloodPressure.map((bp) => {
        const ts = safeDate(bp.timestamp || bp.time || timestamp);
        return {
            userId,
            healthDataId,
            timestamp: ts || new Date(),
            systolic: bp.systolic?.inMillimetersOfMercury || bp.systolic?.value || bp.systolic || null,
            diastolic: bp.diastolic?.inMillimetersOfMercury || bp.diastolic?.value || bp.diastolic || null,
        };
    });
    await BloodPressure.insertMany(docs);
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
                console.log(`   📝 [${i + 1}/${batchData.length}] Processing user: ${healthData.userId}`);
                
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
 * GET /healthdata/:userId/:metric
 * Retrieve specific metric data for a user
 */
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
        if (!Model) {
            return res.status(400).json({ error: "Invalid metric name" });
        }

        const data = await Model.find({ userId })
            .sort({ timestamp: -1 })
            .limit(200);
        
        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("❌ Error fetching metric:", err);
        res.status(500).json({ error: err.message });
    }
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
 * POST /blood_pressure
 * Get blood pressure data for a specific user (for testing purposes)
 */
app.post("/blood_pressure", async (req, res) => {
    try {
        const { userId, period } = req.body;

        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: "userId is required" 
            });
        }

        console.log(`🩺 Fetching blood pressure data for user: ${userId}, period: ${period || 'default'}`);

        // Calculate date range based on period
        const currentDate = new Date();
        let startDate = new Date();
        
        switch(period) {
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

        console.log(`📅 Date range: ${startDate.toISOString()} to ${currentDate.toISOString()}`);

        // Fetch blood pressure data from MongoDB
        const bloodPressureData = await BloodPressure.find({
            userId: userId,
            timestamp: {
                $gte: startDate,
                $lte: currentDate
            }
        })
        .sort({ timestamp: 1 }) // Sort by oldest first (ASC) for proper chart ordering
        .lean();

        if (bloodPressureData.length === 0) {
            console.log(`ℹ️ No blood pressure data found for user: ${userId}`);
            return res.status(204).end();
        }

        // Format data for response with correct field names
        const formattedBloodData = bloodPressureData.map(item => ({
            dateFrom: item.timestamp.toISOString(),
            userId: item.userId,
            systolic: item.systolic,
            diastolic: item.diastolic,
            unit: "mmHg"
        }));

        const latestDateFormatted = formattedBloodData.length > 0 
            ? formattedBloodData[formattedBloodData.length - 1].dateFrom.slice(0, 10)
            : new Date().toISOString().slice(0, 10);

        console.log(`✅ Blood pressure data retrieved: ${formattedBloodData.length} records for ${period || 'weekly'}`);

        res.status(200).json({
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
    } catch (error) {
        console.error("❌ Error fetching blood pressure data:", error);
        res.status(500).json({ 
            success: false, 
            error: "Internal Server Error",
            message: error.message
        });
    }
});

app.post("/heart_rate", async (req, res) => {
    try {
        const { userId, startDate, endDate, period } = req.body;

        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: "User ID is required" 
            });
        }

        console.log(`❤️ Fetching heart rate data for user: ${userId}`);
        
        // Calculate date range based on parameters or defaults
        const currentDate = new Date();
        let queryStartDate, queryEndDate;
        
        if (startDate && endDate) {
            // Use provided date range
            queryStartDate = new Date(startDate);
            queryEndDate = new Date(endDate);
            console.log(`📅 Using custom date range: ${queryStartDate.toISOString()} to ${queryEndDate.toISOString()}`);
        } else if (period) {
            // Calculate based on period
            queryEndDate = currentDate;
            queryStartDate = new Date();
            
            switch(period) {
                case 'weekly':
                    queryStartDate.setDate(currentDate.getDate() - 7);
                    break;
                case 'monthly':
                    queryStartDate.setDate(currentDate.getDate() - 30);
                    break;
                case 'quarterly':
                    queryStartDate.setDate(currentDate.getDate() - 90);
                    break;
                case 'yearly':
                    queryStartDate.setDate(currentDate.getDate() - 365);
                    break;
                default:
                    queryStartDate.setDate(currentDate.getDate() - 1095); // 3 years default
            }
            console.log(`📅 Using period ${period}: ${queryStartDate.toISOString()} to ${queryEndDate.toISOString()}`);
        } else {
            // Default to last 3 years
            queryEndDate = currentDate;
            queryStartDate = new Date();
            queryStartDate.setDate(currentDate.getDate() - 1095);
            console.log(`📅 Using default 3 years: ${queryStartDate.toISOString()} to ${queryEndDate.toISOString()}`);
        }

        // Fetch heart rate data from MongoDB
        const heartRateData = await HeartRate.find({
            userId: userId,
            timestamp: {
                $gte: queryStartDate,
                $lte: queryEndDate
            }
        })
        .sort({ timestamp: 1 }) // Sort by oldest first (ASC) for proper chart ordering
        .lean();

        if (heartRateData.length === 0) {
            console.log(`ℹ️ No heart rate data found for user: ${userId} in specified range`);
            return res.status(204).end();
        }

        // Format data for response with correct field names
        const sortedHeartData = heartRateData.map(item => ({
            timestamp: item.timestamp.toISOString(), // Changed from dateFrom to timestamp
            userId: item.userId,
            bpm: item.bpm.toString(), // Changed from value to bpm, ensure string
            unit: "bpm",
            type: "HEART_RATE"
        }));

        const latestRecord = sortedHeartData[sortedHeartData.length - 1];
        const latestDateFormatted = latestRecord.timestamp.slice(0, 10);

        console.log(`✅ Heart rate data retrieved: ${sortedHeartData.length} records`);
        console.log(`📊 Date range: ${sortedHeartData[0].timestamp} to ${latestRecord.timestamp}`);

        res.status(200).json({
            success: true,
            sortedHeartData: sortedHeartData, // Array sorted oldest to newest
            dateValue: latestDateFormatted,
            totalRecords: sortedHeartData.length,
            dateRange: {
                start: sortedHeartData[0].timestamp,
                end: latestRecord.timestamp
            }
        });
    } catch (error) {
        console.error("❌ Error fetching heart rate data:", error);
        res.status(500).json({ 
            success: false, 
            error: "Internal Server Error",
            message: error.message
        });
    }
});


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
