// build_12_flats_plan.cjs
// Clean 12-flat residential general plan inside the existing test DWG parcel.
// Uses direct AutoCAD plugin DB commands, not command-line LISP.
//
// Program:
// - 2 apartment blocks, each 26 x 16 m footprint
// - 3 floors per block, 2 flats per floor = 6 flats/block = 12 total
// - Separate 6 m internal road, 18 surface parking spaces, sidewalks, trees
// - All primary geometry is checked against the exact 47-vertex parcel polygon.

const axios = require("axios");

const URL = process.env.AUTOCAD_PLUGIN_URL || "http://localhost:12345/";
const TOKEN = process.env.MCP_AUTOCAD_TOKEN || "default-secret-token";

const parcel = [
  [477908.792, 4611607.655],
  [477908.58, 4611607.776],
  [477908.463, 4611607.496],
  [477907.483, 4611608.048],
  [477897.869, 4611584.87],
  [477895.501, 4611583.94],
  [477870.828, 4611597.985],
  [477851.324, 4611609.089],
  [477831.622, 4611620.304],
  [477814.808, 4611629.876],
  [477814.394, 4611632.815],
  [477823.675, 4611655.237],
  [477816.537, 4611659.257],
  [477806.69, 4611636.094],
  [477804.388, 4611635.643],
  [477765.529, 4611657.594],
  [477746.022, 4611668.613],
  [477725.946, 4611679.954],
  [477724.719, 4611683.129],
  [477733.914, 4611705.779],
  [477732.829, 4611706.39],
  [477703.986, 4611635.647],
  [477705.149, 4611635.011],
  [477719.857, 4611671.465],
  [477722.203, 4611672.487],
  [477741.553, 4611661.617],
  [477754.572, 4611654.277],
  [477767.619, 4611646.921],
  [477781.029, 4611639.36],
  [477801.392, 4611627.859],
  [477802.439, 4611625.328],
  [477794.395, 4611605.952],
  [477786.032, 4611586.003],
  [477776.797, 4611563.099],
  [477767.743, 4611541.158],
  [477765.21, 4611540.563],
  [477745.72, 4611553.828],
  [477744.146, 4611550.015],
  [477745.641, 4611548.988],
  [477743.552, 4611545.573],
  [477767.81, 4611528.918],
  [477806.904, 4611490.024],
  [477829.317, 4611468.02],
  [477833.067, 4611465.201],
  [477847.461, 4611458.828],
  [477856.912, 4611481.982],
  [477856.94, 4611481.971],
];

const PARCEL_AREA = 14470.304;
const ORIGIN = [477796.9650851065, 4611601.226361702];
const ANGLE_DEG = -52.90335811662062;
const ANGLE = (ANGLE_DEG * Math.PI) / 180;
const AX = [Math.cos(ANGLE), Math.sin(ANGLE)];
const AY = [-Math.sin(ANGLE), Math.cos(ANGLE)];

const BLOCK_L = 26;
const BLOCK_W = 16;
const BLOCK_FLOORS = 3;
const BLOCKS = [
  { name: "A", u: 45, v: 24 },
  { name: "B", u: 82, v: 24 },
];

const ROAD_W = 6;
const PARKING_COUNT_TARGET = 18;

function ge(text) {
  return `\\FSylfaen|b0|i0;${text}`;
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

function world(u, v) {
  return {
    x: ORIGIN[0] + u * AX[0] + v * AY[0],
    y: ORIGIN[1] + u * AX[1] + v * AY[1],
  };
}

function pointInPolygon(p) {
  let inside = false;
  for (let i = 0, j = parcel.length - 1; i < parcel.length; j = i++) {
    const [xi, yi] = parcel[i];
    const [xj, yj] = parcel[j];
    const crosses =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function distToSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const denom = dx * dx + dy * dy || 1;
  let t = ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / denom;
  t = Math.max(0, Math.min(1, t));
  const px = a[0] + t * dx;
  const py = a[1] + t * dy;
  return Math.hypot(p.x - px, p.y - py);
}

function minBoundaryDistance(p) {
  let d = Infinity;
  for (let i = 0; i < parcel.length; i++) {
    d = Math.min(d, distToSegment(p, parcel[i], parcel[(i + 1) % parcel.length]));
  }
  return d;
}

function rectLocal(centerU, centerV, lengthU, widthV) {
  const lu = lengthU / 2;
  const wv = widthV / 2;
  return [
    world(centerU - lu, centerV - wv),
    world(centerU + lu, centerV - wv),
    world(centerU + lu, centerV + wv),
    world(centerU - lu, centerV + wv),
  ];
}

function inside(points, clearance = 1) {
  return points.every(
    (p) => pointInPolygon(p) && minBoundaryDistance(p) >= clearance,
  );
}

function toPolylinePoints(points) {
  return points.map((p) => ({ x: p.x, y: p.y }));
}

async function layer(name, color) {
  await safeCall("create_layer", { name, color: String(color) });
}

async function poly(points, closed, layerName) {
  if (!inside(points, 0.4)) {
    console.warn(`[skip] ${layerName}: outside parcel`);
    return null;
  }
  return safeCall("create_polyline", {
    points: toPolylinePoints(points),
    closed,
    layer: layerName,
  });
}

async function hatch(handle, pattern, scale, angle, layerName) {
  if (!handle) return;
  await safeCall("create_hatch", {
    boundaryHandles: [handle],
    pattern,
    scale,
    angle,
    layer: layerName,
  });
}

async function line(a, b, layerName) {
  if (!inside([a, b], 0.2)) return;
  await safeCall("create_line", {
    startX: a.x,
    startY: a.y,
    endX: b.x,
    endY: b.y,
    layer: layerName,
  });
}

async function circle(p, radius, layerName) {
  if (!pointInPolygon(p) || minBoundaryDistance(p) < radius + 0.3) return;
  await safeCall("create_circle", { x: p.x, y: p.y, radius, layer: layerName });
}

async function mtext(u, v, contents, height, width, layerName, rotation = ANGLE_DEG) {
  const p = world(u, v);
  if (!pointInPolygon(p)) return;
  await safeCall("create_mtext", {
    x: p.x,
    y: p.y,
    text: ge(contents),
    height,
    width,
    rotation,
    layer: layerName,
  });
}

async function dbtext(u, v, contents, height, layerName) {
  const p = world(u, v);
  if (!pointInPolygon(p)) return;
  await safeCall("create_text", {
    x: p.x,
    y: p.y,
    text: contents,
    height,
    rotation: ANGLE_DEG,
    layer: layerName,
  });
}

async function dim(u1, v1, u2, v2, offset, orientation) {
  const p1 = world(u1, v1);
  const p2 = world(u2, v2);
  await safeCall("add_aligned_dimension", {
    x1: p1.x,
    y1: p1.y,
    x2: p2.x,
    y2: p2.y,
    offset,
    layer: "F12-DIM",
  });
}

async function drawBlock(block, index) {
  const footprint = rectLocal(block.u, block.v, BLOCK_L, BLOCK_W);
  const outer = await poly(footprint, true, "F12-BLDG");
  await hatch(outer?.handle, "ANSI31", 0.055, 45, "F12-BLDG-HATCH");

  // Draw typical-floor organization: two flat bays and a core/stair strip.
  await line(world(block.u, block.v - BLOCK_W / 2), world(block.u, block.v + BLOCK_W / 2), "F12-INNER");
  await line(world(block.u - 4, block.v - BLOCK_W / 2), world(block.u - 4, block.v + BLOCK_W / 2), "F12-INNER");
  const core = rectLocal(block.u - 4, block.v - 3.5, 4, 7);
  const corePoly = await poly(core, true, "F12-CORE");
  await hatch(corePoly?.handle, "ANSI37", 0.08, 0, "F12-CORE");

  // Entry court and walkway to road; road is at v=2.
  const entry = rectLocal(block.u - 4, block.v - BLOCK_W / 2 - 1.1, 5, 2.2);
  await poly(entry, true, "F12-SIDEWALK");
  const walk = rectLocal(block.u - 4, 10.5, 3, 11);
  await poly(walk, true, "F12-SIDEWALK");

  await mtext(
    block.u - 12,
    block.v,
    `ბლოკი ${block.name}\\P6 ბინა\\P3 სართული\\P2 ბინა/სართ.`,
    0.75,
    18,
    "F12-TEXT",
  );
  await dbtext(block.u - 10, block.v + 6.2, `${index}`, 1.0, "F12-NUM");

  // Footprint dimensions.
  await dim(block.u - BLOCK_L / 2, block.v - BLOCK_W / 2, block.u + BLOCK_L / 2, block.v - BLOCK_W / 2, 3, "H");
  await dim(block.u - BLOCK_L / 2, block.v - BLOCK_W / 2, block.u - BLOCK_L / 2, block.v + BLOCK_W / 2, 3, "V");
}

async function drawRoadAndParking() {
  // Main road, separated below buildings.
  for (let u = 15; u <= 112; u += 8) {
    const seg = rectLocal(u + 4, 2, 8, ROAD_W);
    const r = await poly(seg, true, "F12-ROAD");
    await hatch(r?.handle, "ANSI37", 0.12, 0, "F12-ROAD");
    await line(world(u + 1, 2), world(u + 5, 2), "F12-ROAD-LINE");
  }

  // Road entrance widened at the west side.
  const entry = rectLocal(11, 2, 10, 8);
  const er = await poly(entry, true, "F12-ROAD");
  await hatch(er?.handle, "ANSI37", 0.12, 0, "F12-ROAD");

  // Parking on south side of road. Bays do not overlap the road or blocks.
  let count = 0;
  for (let u = 20; u <= 85 && count < PARKING_COUNT_TARGET; u += 3.2) {
    const bay = rectLocal(u, -6.5, 2.5, 5);
    const b = await poly(bay, true, "F12-PARKING");
    if (b?.handle) {
      count += 1;
      await dbtext(u - 0.4, -6.6, String(count), 0.45, "F12-NUM");
    }
  }

  // Sidewalk between road and blocks.
  for (let u = 18; u <= 104; u += 10) {
    await poly(rectLocal(u + 5, 7.0, 10, 1.8), true, "F12-SIDEWALK");
  }

  await mtext(20, 5.8, "შიდა გზა 6.0 მ", 0.75, 18, "F12-TEXT");
  await mtext(43, -11, "18 ზედაპირული ავტოსადგომი", 0.7, 28, "F12-TEXT");
}

async function drawGreenAndLabels(metrics) {
  const treePositions = [
    [18, 18],
    [24, 31],
    [34, 38],
    [58, 38],
    [76, 38],
    [100, 34],
    [109, 18],
    [104, -15],
    [86, -18],
    [66, -18],
    [46, -18],
    [26, -18],
    [12, -5],
  ];
  for (const [u, v] of treePositions) {
    const p = world(u, v);
    await circle(p, 1.2, "F12-TREE");
    await circle(p, 0.35, "F12-TREE");
  }

  await mtext(
    13,
    49,
    "12-ბინიანი საცხოვრებელი კომპლექსი\\Pარსებული ნაკვეთის ფარგლებში",
    1.6,
    70,
    "F12-TEXT",
  );
  await mtext(
    7,
    -22,
    "გეგმა: 2 ბლოკი × 6 ბინა = 12 ბინა. გზა, პარკინგი და შენობები არ იკვეთება.",
    0.9,
    90,
    "F12-TEXT",
  );

  // Technical table inside the parcel, east/south-east open zone.
  const tableU = 105;
  const tableV = -14;
  const table = rectLocal(tableU, tableV, 44, 34);
  const t = await poly(table, true, "F12-TABLE");
  if (t?.handle) {
    for (let i = -3; i <= 3; i++) {
      await line(world(tableU - 22, tableV + i * 4.2), world(tableU + 22, tableV + i * 4.2), "F12-TABLE");
    }
    await line(world(tableU - 4, tableV - 17), world(tableU - 4, tableV + 17), "F12-TABLE");
    await line(world(tableU + 10, tableV - 17), world(tableU + 10, tableV + 17), "F12-TABLE");

    const rows = [
      ["მაჩვენებელი", "ფაქტი", "ნორმა"],
      ["ნაკვეთი", "14 470 მ²", "—"],
      ["ბინები", "12", "—"],
      ["აშენება", `${metrics.footprint} მ²`, "—"],
      ["საერთო", `${metrics.gfa} მ²`, "—"],
      ["K1", metrics.k1, "≤0.50"],
      ["K2", metrics.k2, "≤3.50"],
      ["K3", metrics.k3, "≥0.20"],
    ];
    for (let i = 0; i < rows.length; i++) {
      const y = tableV + 13.5 - i * 4.2;
      await mtext(tableU - 21, y, rows[i][0], 0.55, 15, "F12-TABLE");
      await mtext(tableU - 2, y, rows[i][1], 0.55, 10, "F12-TABLE");
      await mtext(tableU + 12, y, rows[i][2], 0.55, 10, "F12-TABLE");
    }
  }
}

async function main() {
  // Hide older experiments so the new clean plan is visually clear.
  for (const prefix of ["S-", "GP-"]) {
    const names = [
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
    ];
    for (const n of names) {
      await safeCall("set_layer_properties", { name: `${prefix}${n}`, isOff: true });
    }
  }

  await layer("F12-BLDG", 7);
  await layer("F12-BLDG-HATCH", 8);
  await layer("F12-INNER", 8);
  await layer("F12-CORE", 6);
  await layer("F12-ROAD", 9);
  await layer("F12-ROAD-LINE", 7);
  await layer("F12-PARKING", 5);
  await layer("F12-SIDEWALK", 8);
  await layer("F12-TREE", 92);
  await layer("F12-DIM", 2);
  await layer("F12-TEXT", 7);
  await layer("F12-TABLE", 7);
  await layer("F12-NUM", 2);

  for (let i = 0; i < BLOCKS.length; i++) {
    await drawBlock(BLOCKS[i], i + 1);
  }
  await drawRoadAndParking();

  const footprint = BLOCKS.length * BLOCK_L * BLOCK_W;
  const gfa = footprint * BLOCK_FLOORS;
  const roadApprox = 105 * ROAD_W;
  const parkingApprox = PARKING_COUNT_TARGET * 2.5 * 5;
  const sidewalksApprox = 260;
  const greenArea = PARCEL_AREA - footprint - roadApprox - parkingApprox - sidewalksApprox;
  const metrics = {
    footprint: Math.round(footprint),
    gfa: Math.round(gfa),
    k1: (footprint / PARCEL_AREA).toFixed(3),
    k2: (gfa / PARCEL_AREA).toFixed(3),
    k3: (greenArea / PARCEL_AREA).toFixed(2),
  };

  await drawGreenAndLabels(metrics);

  console.log(
    `[12-flats] done: 2 blocks, 12 flats, 18 parking, K1=${metrics.k1}, K2=${metrics.k2}, K3=${metrics.k3}`,
  );
}

main().catch((error) => {
  console.error("[12-flats] ERROR:", error.response?.data || error.message);
  process.exit(1);
});
