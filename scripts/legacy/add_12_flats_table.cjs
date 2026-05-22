// add_12_flats_table.cjs
// Adds the K1/K2/K3 table for the 12-flat plan at a verified in-parcel location.

const axios = require("axios");

const URL = process.env.AUTOCAD_PLUGIN_URL || "http://localhost:12345/";
const TOKEN = process.env.MCP_AUTOCAD_TOKEN || "default-secret-token";
const ORIGIN = [477796.9650851065, 4611601.226361702];
const ANGLE_DEG = -52.90335811662062;
const ANGLE = (ANGLE_DEG * Math.PI) / 180;
const AX = [Math.cos(ANGLE), Math.sin(ANGLE)];
const AY = [-Math.sin(ANGLE), Math.cos(ANGLE)];

function ge(text) {
  return `\\FSylfaen|b0|i0;${text}`;
}

function world(u, v) {
  return {
    x: ORIGIN[0] + u * AX[0] + v * AY[0],
    y: ORIGIN[1] + u * AX[1] + v * AY[1],
  };
}

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
    console.warn(`[warn] ${command}:`, error.response?.data || error.message);
    return null;
  }
}

async function poly(points, layer) {
  return safeCall("create_polyline", {
    points: points.map((p) => ({ x: p.x, y: p.y })),
    closed: true,
    layer,
  });
}

async function line(a, b, layer) {
  await safeCall("create_line", {
    startX: a.x,
    startY: a.y,
    endX: b.x,
    endY: b.y,
    layer,
  });
}

async function mtext(u, v, text, height, width, layer) {
  const p = world(u, v);
  await safeCall("create_mtext", {
    x: p.x,
    y: p.y,
    text: ge(text),
    height,
    width,
    rotation: ANGLE_DEG,
    layer,
  });
}

function rect(u, v, lu, wv) {
  return [
    world(u - lu / 2, v - wv / 2),
    world(u + lu / 2, v - wv / 2),
    world(u + lu / 2, v + wv / 2),
    world(u - lu / 2, v + wv / 2),
  ];
}

async function main() {
  await safeCall("create_layer", { name: "F12-TABLE", color: "7" });

  const tableU = 65;
  const tableV = -16;
  const width = 34;
  const height = 24;
  await poly(rect(tableU, tableV, width, height), "F12-TABLE");

  for (let i = -2; i <= 2; i++) {
    await line(world(tableU - width / 2, tableV + i * 4), world(tableU + width / 2, tableV + i * 4), "F12-TABLE");
  }
  await line(world(tableU - 2, tableV - height / 2), world(tableU - 2, tableV + height / 2), "F12-TABLE");
  await line(world(tableU + 9, tableV - height / 2), world(tableU + 9, tableV + height / 2), "F12-TABLE");

  const rows = [
    ["მაჩვენებელი", "ფაქტი", "ნორმა"],
    ["ნაკვეთი", "14 470 მ²", "—"],
    ["ბინები", "12", "—"],
    ["აშენება", "832 მ²", "—"],
    ["საერთო", "2 496 მ²", "—"],
    ["K1", "0.057", "≤0.50"],
    ["K2", "0.172", "≤3.50"],
    ["K3", "0.87", "≥0.20"],
  ];

  for (let i = 0; i < rows.length; i++) {
    const y = tableV + 9.5 - i * 3;
    await mtext(tableU - 16, y, rows[i][0], 0.5, 11, "F12-TABLE");
    await mtext(tableU - 0.5, y, rows[i][1], 0.5, 9, "F12-TABLE");
    await mtext(tableU + 10.5, y, rows[i][2], 0.5, 8, "F12-TABLE");
  }

  console.log("[12-flats-table] done");
}

main().catch((error) => {
  console.error("[12-flats-table] ERROR:", error.response?.data || error.message);
  process.exit(1);
});
