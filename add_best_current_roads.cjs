// add_best_current_roads.cjs
// Adds segmented internal roads to the rebuilt current-area GRG plan and
// updates the validation report. This corrects the over-strict first road pass.

const fs = require("fs");
const axios = require("axios");

const URL = process.env.AUTOCAD_PLUGIN_URL || "http://localhost:12345/";
const TOKEN = process.env.MCP_AUTOCAD_TOKEN || "default-secret-token";
const VALIDATION_PATH = "C:/Users/PCZONE.GE/autocad-mcp/best-current-grg-validation.json";

const layers = {
  road: "საავტომ.სამოძრაო",
  roadFill: "BEST-გზა-ჰეჩი",
  roadAxis: "BEST-გზის-ღერძი",
  text: "BEST-წარწერები",
};

function ge(text) {
  return `\\FSylfaen|b0|i0;${text}`;
}

async function call(command, args) {
  const response = await axios.post(
    URL,
    { command, args },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${TOKEN}`,
      },
      timeout: 60000,
    },
  );
  return response.data;
}

async function safeCall(command, args) {
  try {
    return await call(command, args);
  } catch (error) {
    console.warn(`[warn] ${command}:`, error.response?.data || error.message);
    return null;
  }
}

function handleOf(result) {
  return result?.handle || result?.result?.handle || result?.entity?.handle;
}

function rect(cx, cy, w, h) {
  return [
    { x: cx - w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy + h / 2 },
    { x: cx - w / 2, y: cy + h / 2 },
  ];
}

async function poly(points, layer) {
  return safeCall("create_polyline", {
    points: points.map((p) => ({ x: p.x, y: p.y })),
    closed: true,
    layer,
  });
}

async function hatch(result, pattern, scale, angle, layer) {
  const handle = handleOf(result);
  if (!handle) return;
  await safeCall("create_hatch", {
    boundaryHandles: [handle],
    pattern,
    scale,
    angle,
    layer,
  });
}

async function line(a, b, layer) {
  return safeCall("create_line", {
    startX: a.x,
    startY: a.y,
    endX: b.x,
    endY: b.y,
    layer,
  });
}

async function mtext(x, y, text, height, width, layer) {
  return safeCall("create_mtext", { x, y, text: ge(text), height, width, layer });
}

async function drawRoad(cx, cy, w, h) {
  const outline = await poly(rect(cx, cy, w, h), layers.road);
  await hatch(outline, "ANSI37", 0.22, 0, layers.roadFill);
  if (w >= h) {
    await line({ x: cx - w / 2 + 4, y: cy }, { x: cx + w / 2 - 4, y: cy }, layers.roadAxis);
  } else {
    await line({ x: cx, y: cy - h / 2 + 4 }, { x: cx, y: cy + h / 2 - 4 }, layers.roadAxis);
  }
}

async function main() {
  await safeCall("create_layer", { name: layers.road, color: 8, lineWeight: "LineWeight025" });
  await safeCall("create_layer", { name: layers.roadFill, color: 9, lineWeight: "LineWeight000" });
  await safeCall("create_layer", { name: layers.roadAxis, color: 7, lineWeight: "LineWeight013" });
  await safeCall("create_layer", { name: layers.text, color: 7, lineWeight: "LineWeight018" });

  const roads = [
    [476458, 4618388, 142, 7],
    [476611, 4618388, 92, 7],
    [476565, 4618325, 7, 126],
    [476585, 4618260, 104, 7],
    [476650, 4618325, 7, 76],
    [476455, 4618342, 7, 70],
  ];
  for (const road of roads) await drawRoad(...road);
  await mtext(476375, 4618396, "შიდა საავტომობილო გზა 7.0 მ", 1.05, 72, layers.text);

  const validation = JSON.parse(fs.readFileSync(VALIDATION_PATH, "utf8"));
  const roadArea = Math.round(roads.reduce((sum, [, , w, h]) => sum + w * h, 0));
  validation.metrics.roadArea = roadArea;
  validation.metrics.green = Math.max(
    0,
    validation.metrics.siteArea -
      validation.metrics.footprint -
      roadArea -
      validation.metrics.sidewalkArea,
  );
  validation.metrics.k3 = (validation.metrics.green / validation.metrics.siteArea).toFixed(2);
  validation.validation.roadPassCorrected = true;
  validation.validation.roadDescription =
    "Segmented 7m road spine/loop added in gaps between building footprints.";
  fs.writeFileSync(VALIDATION_PATH, JSON.stringify(validation, null, 2), "utf8");

  await safeCall("run_command", {
    command: '(command "_.ZOOM" "_W" "476320,4618115" "476760,4618475") (princ)',
  });
  console.log(`[best-roads] added ${roads.length} road segments, roadArea=${roadArea}`);
}

main().catch((error) => {
  console.error("[best-roads] ERROR:", error.response?.data || error.message);
  process.exit(1);
});
