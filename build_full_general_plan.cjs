// build_full_general_plan.cjs
// Complete general plan inside the existing 47-vertex parcel in test.dwg.
// Uses only direct AutoCAD plugin database calls, not command-line LISP.
//
// Layout basis:
// - Existing parcel area: 14,470.304 m2
// - Principal parcel axis: -52.903 deg
// - Buildings: 13 residential blocks, each 12 x 20 m
// - Buildings alternate 8 and 10 floors
// - Central 6 m access road, parking bays along road, sidewalks, trees
// - All generated geometry is checked against the parcel polygon before drawing.

const axios = require("axios");

const URL = process.env.AUTOCAD_PLUGIN_URL || "http://localhost:12345/";
const TOKEN = process.env.MCP_AUTOCAD_TOKEN || "default-secret-token";

const parcel = [
  [477908.792, 4611607.655],
  [477908.580, 4611607.776],
  [477908.463, 4611607.496],
  [477907.483, 4611608.048],
  [477897.869, 4611584.870],
  [477895.501, 4611583.940],
  [477870.828, 4611597.985],
  [477851.324, 4611609.089],
  [477831.622, 4611620.304],
  [477814.808, 4611629.876],
  [477814.394, 4611632.815],
  [477823.675, 4611655.237],
  [477816.537, 4611659.257],
  [477806.690, 4611636.094],
  [477804.388, 4611635.643],
  [477765.529, 4611657.594],
  [477746.022, 4611668.613],
  [477725.946, 4611679.954],
  [477724.719, 4611683.129],
  [477733.914, 4611705.779],
  [477732.829, 4611706.390],
  [477703.986, 4611635.647],
  [477705.149, 4611635.011],
  [477719.857, 4611671.465],
  [477722.203, 4611672.487],
  [477741.553, 4611661.617],
  [477754.572, 4611654.277],
  [477767.619, 4611646.921],
  [477781.029, 4611639.360],
  [477801.392, 4611627.859],
  [477802.439, 4611625.328],
  [477794.395, 4611605.952],
  [477786.032, 4611586.003],
  [477776.797, 4611563.099],
  [477767.743, 4611541.158],
  [477765.210, 4611540.563],
  [477745.720, 4611553.828],
  [477744.146, 4611550.015],
  [477745.641, 4611548.988],
  [477743.552, 4611545.573],
  [477767.810, 4611528.918],
  [477806.904, 4611490.024],
  [477829.317, 4611468.020],
  [477833.067, 4611465.201],
  [477847.461, 4611458.828],
  [477856.912, 4611481.982],
  [477856.940, 4611481.971],
];

const PARCEL_AREA = 14470.304;
const ORIGIN = [477796.9650851065, 4611601.226361702];
const ANGLE = (-52.90335811662062 * Math.PI) / 180;
const AX = [Math.cos(ANGLE), Math.sin(ANGLE)];
const AY = [-Math.sin(ANGLE), Math.cos(ANGLE)];

const BUILDING_W = 12;
const BUILDING_L = 20;
const BUILDING_AREA = BUILDING_W * BUILDING_L;
const ROAD_W = 6;

const buildingCenters = [
  [5, 18],
  [29, -18],
  [29, 18],
  [53, -36],
  [53, -18],
  [53, 18],
  [53, 36],
  [77, -36],
  [77, -18],
  [77, 18],
  [77, 36],
  [101, -36],
  [101, -18],
];

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

function local(pt) {
  const dx = pt[0] - ORIGIN[0];
  const dy = pt[1] - ORIGIN[1];
  return {
    u: dx * AX[0] + dy * AX[1],
    v: dx * AY[0] + dy * AY[1],
  };
}

function pointInPolygon(p) {
  let inside = false;
  const x = p.x;
  const y = p.y;
  for (let i = 0, j = parcel.length - 1; i < parcel.length; j = i++) {
    const [xi, yi] = parcel[i];
    const [xj, yj] = parcel[j];
    const cross =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (cross) inside = !inside;
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
  let best = Infinity;
  for (let i = 0; i < parcel.length; i++) {
    best = Math.min(best, distToSegment(p, parcel[i], parcel[(i + 1) % parcel.length]));
  }
  return best;
}

function rectLocalPoints(centerU, centerV, lengthU, widthV) {
  const lu = lengthU / 2;
  const wv = widthV / 2;
  return [
    world(centerU - lu, centerV - wv),
    world(centerU + lu, centerV - wv),
    world(centerU + lu, centerV + wv),
    world(centerU - lu, centerV + wv),
  ];
}

function insideWithClearance(points, clearance = 1.0) {
  for (const p of points) {
    if (!pointInPolygon(p)) return false;
    if (minBoundaryDistance(p) < clearance) return false;
  }
  return true;
}

function localBBox(centerU, centerV, lengthU, widthV, grow = 0) {
  return {
    minU: centerU - lengthU / 2 - grow,
    maxU: centerU + lengthU / 2 + grow,
    minV: centerV - widthV / 2 - grow,
    maxV: centerV + widthV / 2 + grow,
  };
}

function overlaps(a, b) {
  return !(
    a.maxU <= b.minU ||
    a.minU >= b.maxU ||
    a.maxV <= b.minV ||
    a.minV >= b.maxV
  );
}

function pointsForPlugin(points) {
  return points.map((p) => ({ x: p.x, y: p.y }));
}

async function createLayer(name, color) {
  await safeCall("create_layer", { name, color: String(color) });
}

async function poly(points, closed, layer) {
  return safeCall("create_polyline", {
    points: pointsForPlugin(points),
    closed,
    layer,
  });
}

async function hatch(handle, pattern, scale, angle, layer) {
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
  await safeCall("create_line", {
    startX: a.x,
    startY: a.y,
    endX: b.x,
    endY: b.y,
    layer,
  });
}

async function circle(p, radius, layer) {
  await safeCall("create_circle", { x: p.x, y: p.y, radius, layer });
}

async function textLocal(u, v, text, height, width, layer) {
  const p = world(u, v);
  await safeCall("create_mtext", {
    x: p.x,
    y: p.y,
    text: ge(text),
    height,
    width,
    rotation: (-52.90335811662062),
    layer,
  });
}

async function textWorld(x, y, text, height, width, layer) {
  await safeCall("create_mtext", {
    x,
    y,
    text: ge(text),
    height,
    width,
    rotation: 0,
    layer,
  });
}

async function build() {
  // Hide previous trial layers instead of relying on the command line to erase them.
  const oldLayers = [
    "S-BLDG",
    "S-ROAD",
    "S-ROAD-LINE",
    "S-PARKING",
    "S-PARK-NUM",
    "S-SIDEWALK",
    "S-GREEN",
    "S-TREE",
    "S-DIM",
    "S-TEXT",
    "S-TABLE",
  ];
  for (const name of oldLayers) {
    await safeCall("set_layer_properties", { name, isOff: true });
  }

  await createLayer("GP-BLDG", 7);
  await createLayer("GP-BLDG-HATCH", 8);
  await createLayer("GP-ROAD", 9);
  await createLayer("GP-ROAD-LINE", 7);
  await createLayer("GP-PARKING", 5);
  await createLayer("GP-SIDEWALK", 8);
  await createLayer("GP-GREEN", 3);
  await createLayer("GP-TREE", 92);
  await createLayer("GP-TEXT", 7);
  await createLayer("GP-TABLE", 7);

  const buildingBoxes = [];
  let floorsTotal = 0;
  let buildingIndex = 0;

  for (const [u, v] of buildingCenters) {
    const points = rectLocalPoints(u, v, BUILDING_L, BUILDING_W);
    if (!insideWithClearance(points, 4)) continue;

    const floors = buildingIndex % 2 === 0 ? 10 : 8;
    floorsTotal += floors;
    buildingIndex += 1;

    const p = await poly(points, true, "GP-BLDG");
    await hatch(p?.handle, "ANSI31", 0.06, 45, "GP-BLDG-HATCH");
    buildingBoxes.push(localBBox(u, v, BUILDING_L, BUILDING_W, 2));

    // Entrance court/recess toward the central road.
    const side = v > 0 ? -1 : 1;
    const entry = rectLocalPoints(u, v + side * (BUILDING_W / 2 + 0.8), 4, 1.6);
    if (insideWithClearance(entry, 1)) {
      await poly(entry, true, "GP-SIDEWALK");
    }

    await textLocal(
      u - 6,
      v,
      `ბლოკი ${buildingIndex}\\P${floors} სართული\\P12×20 მ`,
      0.8,
      14,
      "GP-TEXT",
    );
  }

  // Main road: draw as safe short segments along the central axis.
  const roadSegments = [];
  for (let u = -2; u <= 116; u += 10) {
    const pts = rectLocalPoints(u + 5, 0, 10, ROAD_W);
    if (insideWithClearance(pts, 1.5)) {
      const p = await poly(pts, true, "GP-ROAD");
      await hatch(p?.handle, "ANSI37", 0.12, 0, "GP-ROAD");
      roadSegments.push(localBBox(u + 5, 0, 10, ROAD_W, 1));

      // dashed centerline, 5 m dash per segment
      await line(world(u + 1, 0), world(u + 5, 0), "GP-ROAD-LINE");
    }
  }

  // Sidewalk strips on both road edges, safe-segmented.
  for (let u = -2; u <= 116; u += 10) {
    for (const v of [-4.25, 4.25]) {
      const pts = rectLocalPoints(u + 5, v, 10, 1.5);
      if (insideWithClearance(pts, 1)) {
        await poly(pts, true, "GP-SIDEWALK");
      }
    }
  }

  // Surface parking bays along both sides of the central road.
  const parkingBoxes = [];
  let parkingNo = 0;
  const tryParking = async (centerU, centerV) => {
    const pts = rectLocalPoints(centerU, centerV, 2.5, 5);
    const box = localBBox(centerU, centerV, 2.5, 5, 0.3);
    if (!insideWithClearance(pts, 1)) return;
    if (buildingBoxes.some((b) => overlaps(b, box))) return;
    if (parkingBoxes.some((b) => overlaps(b, box))) return;
    parkingBoxes.push(box);
    parkingNo += 1;
    await poly(pts, true, "GP-PARKING");
    await textLocal(centerU - 0.4, centerV - 0.2, String(parkingNo), 0.45, 2, "GP-TEXT");
  };

  for (let u = 0; u <= 118; u += 3) {
    await tryParking(u, 7.0);
    await tryParking(u, -7.0);
  }

  // Secondary access stubs to outer building rows.
  const stubSpecs = [
    [50, 18],
    [76, 18],
    [54, -18],
    [78, -18],
    [58, 36],
    [80, 36],
    [58, -36],
    [82, -36],
  ];
  for (const [u, v] of stubSpecs) {
    const len = Math.abs(v) - ROAD_W / 2;
    const midV = v / 2;
    const pts = rectLocalPoints(u, midV, 4.5, len);
    if (insideWithClearance(pts, 1)) {
      const p = await poly(pts, true, "GP-ROAD");
      await hatch(p?.handle, "ANSI37", 0.12, 0, "GP-ROAD");
    }
  }

  // Trees and green court markers in leftover open areas.
  const treePositions = [
    [-15, 22],
    [4, 36],
    [21, 36],
    [41, 50],
    [65, 52],
    [91, 52],
    [112, 10],
    [120, -8],
    [92, -52],
    [67, -52],
    [42, -52],
    [16, -35],
    [-6, 2],
    [28, 2],
    [52, 2],
    [76, 2],
    [100, 2],
  ];
  for (const [u, v] of treePositions) {
    const p = world(u, v);
    if (pointInPolygon(p) && minBoundaryDistance(p) > 2) {
      await circle(p, 1.2, "GP-TREE");
      await circle(p, 0.35, "GP-TREE");
    }
  }

  // Table and plan labels: placed in the open east/south-east portion but still inside parcel.
  const footprint = buildingIndex * BUILDING_AREA;
  const gfa = floorsTotal * BUILDING_AREA;
  const roadArea = roadSegments.length * 10 * ROAD_W;
  const parkingArea = parkingNo * 2.5 * 5;
  const sidewalkArea = 450;
  const k1 = footprint / PARCEL_AREA;
  const k2 = gfa / PARCEL_AREA;
  const k3 = Math.max(0, (PARCEL_AREA - footprint - roadArea - parkingArea - sidewalkArea) / PARCEL_AREA);

  await textLocal(
    -22,
    62,
    "გენერალური გეგმა\\Pარსებული ნაკვეთის ფარგლებში",
    2.0,
    60,
    "GP-TEXT",
  );
  await textLocal(
    -18,
    -58,
    "შენიშვნა: ყველა შენობა, გზა და ავტოსადგომი მოთავსებულია არსებული ნაკვეთის პოლიგონში.",
    1.0,
    80,
    "GP-TEXT",
  );
  await textLocal(15, 0, "შიდა გზა 6.0 მ", 0.8, 16, "GP-TEXT");
  await textLocal(42, 8.5, "ზედაპირული ავტოსადგომი", 0.65, 24, "GP-TEXT");

  // Simple data table lines and content in local coordinates.
  const tableU = 105;
  const tableV = 30;
  const table = rectLocalPoints(tableU, tableV, 44, 44);
  if (insideWithClearance(table, 1)) {
    await poly(table, true, "GP-TABLE");
    for (let i = -4; i <= 4; i++) {
      await line(world(tableU - 22, tableV + i * 4.9), world(tableU + 22, tableV + i * 4.9), "GP-TABLE");
    }
    await line(world(tableU - 3, tableV - 22), world(tableU - 3, tableV + 22), "GP-TABLE");
    await line(world(tableU + 10, tableV - 22), world(tableU + 10, tableV + 22), "GP-TABLE");

    const rows = [
      ["მაჩვენებელი", "ფაქტი", "ნორმა"],
      ["ნაკვეთი", "14 470 მ²", "—"],
      ["შენობები", `${buildingIndex} ბლოკი`, "12×20 მ"],
      ["სართულიანობა", "8/10", "სზ-5"],
      ["ფართობი", `${Math.round(gfa)} მ²`, "—"],
      ["K1", k1.toFixed(3), "≤ 0.50"],
      ["K2", k2.toFixed(3), "≤ 3.50"],
      ["K3", k3.toFixed(2), "≥ 0.20"],
      ["პარკინგი", `${parkingNo} ზედ.`, "+ მიწისქვეშა"],
    ];
    for (let i = 0; i < rows.length; i++) {
      const y = tableV + 18 - i * 4.9;
      await textLocal(tableU - 21, y, rows[i][0], 0.62, 18, "GP-TABLE");
      await textLocal(tableU - 1, y, rows[i][1], 0.62, 12, "GP-TABLE");
      await textLocal(tableU + 12, y, rows[i][2], 0.62, 12, "GP-TABLE");
    }
  }

  // Larger perimeter note near centroid.
  await textWorld(
    ORIGIN[0] - 56,
    ORIGIN[1] + 91,
    `დაგეგმარება: ${buildingIndex} ბლოკი, ${parkingNo} ზედაპირული ადგილი\\P` +
      `K1=${k1.toFixed(3)}  K2=${k2.toFixed(3)}  K3=${k3.toFixed(2)}`,
    1.1,
    90,
    "GP-TEXT",
  );

  console.log(
    `[full-plan] buildings=${buildingIndex}, parking=${parkingNo}, ` +
      `K1=${k1.toFixed(3)}, K2=${k2.toFixed(3)}, K3=${k3.toFixed(2)}`,
  );
}

build().catch((error) => {
  console.error("[full-plan] ERROR:", error.response?.data || error.message);
  process.exit(1);
});
