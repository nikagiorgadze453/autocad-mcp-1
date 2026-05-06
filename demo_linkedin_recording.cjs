// demo_linkedin_recording.cjs
// Recording helper for the LinkedIn demo.
//
// Usage:
//   node demo_linkedin_recording.cjs before
//   node demo_linkedin_recording.cjs after
//   node demo_linkedin_recording.cjs zoom
//
// It switches layer visibility and zooms to the real parcel coordinates.

const axios = require("axios");

const URL = process.env.AUTOCAD_PLUGIN_URL || "http://localhost:12345/";
const TOKEN = process.env.MCP_AUTOCAD_TOKEN || "default-secret-token";

const F12_LAYERS = [
  "F12-BLDG",
  "F12-BLDG-HATCH",
  "F12-INNER",
  "F12-CORE",
  "F12-ROAD",
  "F12-ROAD-LINE",
  "F12-PARKING",
  "F12-SIDEWALK",
  "F12-TREE",
  "F12-DIM",
  "F12-TEXT",
  "F12-TABLE",
  "F12-NUM",
];

const TRIAL_PREFIXES = ["S-", "GP-"];
const TRIAL_SUFFIXES = [
  "BLDG",
  "BLDG-HATCH",
  "ROAD",
  "ROAD-LINE",
  "PARKING",
  "PARK-NUM",
  "SIDEWALK",
  "GREEN",
  "TREE",
  "DIM",
  "TEXT",
  "TABLE",
  "INNER",
  "CORE",
  "TITLE",
];

async function call(command, args) {
  const r = await axios.post(
    URL,
    { command, args },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${TOKEN}`,
      },
      timeout: 30000,
    },
  );
  return r.data;
}

async function safeCall(command, args) {
  try {
    return await call(command, args);
  } catch (error) {
    // Missing layers are fine; this helper is meant to be robust.
  }
}

async function setLayer(name, isOff) {
  await safeCall("set_layer_properties", { name, isOff });
}

async function zoomParcel() {
  await call("run_command", {
    command:
      '(command "_.ZOOM" "_W" "477690,4611445" "477930,4611725") (princ)',
  });
}

async function main() {
  const mode = process.argv[2] || "after";

  // Keep old experiments hidden for a clean recording.
  for (const prefix of TRIAL_PREFIXES) {
    for (const suffix of TRIAL_SUFFIXES) {
      await setLayer(`${prefix}${suffix}`, true);
    }
  }

  if (mode === "before") {
    for (const layer of F12_LAYERS) await setLayer(layer, true);
    await zoomParcel();
    console.log("[demo] before: parcel-only view");
    return;
  }

  if (mode === "after") {
    for (const layer of F12_LAYERS) await setLayer(layer, false);
    await zoomParcel();
    console.log("[demo] after: 12-flat plan visible");
    return;
  }

  if (mode === "zoom") {
    await zoomParcel();
    console.log("[demo] zoomed to parcel");
    return;
  }

  console.error("Usage: node demo_linkedin_recording.cjs before|after|zoom");
  process.exit(1);
}

main().catch((error) => {
  console.error("[demo] ERROR:", error.response?.data || error.message);
  process.exit(1);
});
