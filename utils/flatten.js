/**
 * Flatten nested objects into a single-level object with dot notation keys
 * @param {Object} obj - Object to flatten
 * @param {string} prefix - Prefix for keys
 * @returns {Object} Flattened object
 */
function flattenDeep(obj, prefix = "") {
    if (!obj || typeof obj !== "object") return {};
    
    let result = {};
    
    for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (value === null || value === undefined) {
            result[newKey] = value;
        } else if (Array.isArray(value)) {
            result[newKey] = value;
        } else if (typeof value === "object" && !(value instanceof Date)) {
            // Recursively flatten nested objects
            Object.assign(result, flattenDeep(value, newKey));
        } else {
            result[newKey] = value;
        }
    }
    
    return result;
}

module.exports = { flattenDeep };
