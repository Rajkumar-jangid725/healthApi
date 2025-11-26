// function flattenDeep(obj, prefix = "") {
//   const out = {};

//   function recurse(cur, pre) {
//     if (cur === null || cur === undefined) return;
//     if (typeof cur !== "object" || cur instanceof Date) {
//       out[pre.replace(/\.$/, "")] = cur;
//       return;
//     }
//     if (Array.isArray(cur)) {
//       out[pre.replace(/\.$/, "")] = cur;
//       return;
//     }
//     for (const k of Object.keys(cur)) {
//       recurse(cur[k], `${pre}${k}_`);
//     }
//   }

//   recurse(obj, prefix);
//   return out;
// }

// module.exports = { flattenDeep };


function flattenDeep(obj, prefix = "") {
    const out = {};

    function recurse(cur, pre) {
        if (cur === null || cur === undefined) return;

        if (typeof cur !== "object" || cur instanceof Date) {
            out[pre.replace(/_$/, "")] = cur;
            return;
        }

        if (Array.isArray(cur)) {
            out[pre.replace(/_$/, "")] = cur;
            return;
        }

        for (const k of Object.keys(cur)) {
            recurse(cur[k], `${pre}${k}_`);
        }
    }

    recurse(obj, prefix);
    return out;
}

function removeDuplicates(base, flat) {
    const cleaned = {};

    for (const key of Object.keys(flat)) {
        const isDuplicate = Object.keys(base).some((baseKey) => {
            return (
                key === baseKey ||
                key.startsWith(baseKey + "_") ||
                key.startsWith(baseKey + "__")
            );
        });

        if (!isDuplicate) cleaned[key] = flat[key];
    }

    return cleaned;
}

module.exports = { flattenDeep, removeDuplicates };
