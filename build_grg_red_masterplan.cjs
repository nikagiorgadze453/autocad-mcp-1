// build_grg_red_masterplan.cjs
// GRG-style masterplan for the active red 30-vertex boundary in Drawing1.
// Coordinates are kept in the active DWG coordinate system; units are set to mm.

const fs = require("fs");
const axios = require("axios");

const URL = process.env.AUTOCAD_PLUGIN_URL || "http://localhost:12345/";
const TOKEN = process.env.MCP_AUTOCAD_TOKEN || "default-secret-token";

const boundary = [
  [477484.533, 4618658.309],
  [477448.207, 4618654.773],
  [477365.422, 4618647.239],
  [477258.223, 4618636.674],
  [477201.259, 4618631.321],
  [477139.308, 4618625.368],
  [477134.898, 4618664.28],
  [477129.791, 4618703.649],
  [477125.581, 4618734.707],
  [477122.276, 4618762.458],
  [477119.28, 4618786.704],
  [477118.765, 4618792.177],
  [477149.4, 4618796.184],
  [477189.578, 4618801.444],
  [477277.169, 4618812.655],
  [477399.965, 4618828.346],
  [477481.487, 4618839.13],
  [477523.443, 4618845.04],
  [477525.814, 4618826.275],
  [477535.616, 4618746.019],
  [477536.547, 4618739.033],
  [477496.078, 4618732.386],
  [477497.157, 4618725.52],
  [477489.078, 4618724.249],
  [477488.798, 4618726.028],
  [477443.508, 4618720.945],
  [477443.431, 4618687.149],
  [477449.519, 4618681.585],
  [477455.729, 4618679.028],
  [477481.345, 4618682.633],
];

const AX0 = [
  boundary[0][0] - boundary[5][0],
  boundary[0][1] - boundary[5][1],
];
const AX_LEN = Math.hypot(AX0[0], AX0[1]);
const AX = [AX0[0] / AX_LEN, AX0[1] / AX_LEN];
const AY = [-AX[1], AX[0]];
const ORIGIN = boundary[5];
const ANGLE_DEG = (Math.atan2(AX[1], AX[0]) * 180) / Math.PI;

const layers = {
  boundary: "Qvafenili Saproeqto Feri",
  setback: "განთავსების_არეალი",
  building: "საპროეტო_შენობა",
  buildingHatch: "GRG-საპროექტო-ჰეჩი",
  road: "საავტომ.სამოძრაო",
  roadLine: "GRG-გზის-ღერძი",
  parking: "Parkireba_90",
  sidewalk: "საფეხმ.ტროტუარი",
  green: "გამწვანება ივნისი",
  tree: "GRG-ხეები",
  text: "GRG-წარწერები",
  table: "GRG-ცხრილი",
  dim: "zomis xazebi",
  number: "შენობის ნომერი",
  floors: "შენობის სართულიანობა",
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

function area(points) {
  let sum = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    sum += points[j][0] * points[i][1] - points[i][0] * points[j][1];
  }
  return Math.abs(sum) / 2;
}

function local(pt) {
  const dx = pt[0] - ORIGIN[0];
  const dy = pt[1] - ORIGIN[1];
  return {
    u: dx * AX[0] + dy * AX[1],
    v: dx * AY[0] + dy * AY[1],
  };
}

function world(u, v) {
  return {
    x: ORIGIN[0] + u * AX[0] + v * AY[0],
    y: ORIGIN[1] + u * AX[1] + v * AY[1],
  };
}

function pointInPolygon(p) {
  let inside = false;
  for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
    const [xi, yi] = boundary[i];
    const [xj, yj] = boundary[j];
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
  let best = Infinity;
  for (let i = 0; i < boundary.length; i++) {
    best = Math.min(best, distToSegment(p, boundary[i], boundary[(i + 1) % boundary.length]));
  }
  return best;
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

function localBox(centerU, centerV, lengthU, widthV, grow = 0) {
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

function inside(points, clearance = 0.5) {
  return points.every((p) => pointInPolygon(p) && minBoundaryDistance(p) >= clearance);
}

function handleOf(result) {
  return result?.handle || result?.result?.handle || result?.entity?.handle;
}

async function layer(name, color, lineWeight) {
  await safeCall("create_layer", { name, color, lineWeight });
}

async function poly(points, closed, layerName, clearance = 0.5) {
  if (!inside(points, clearance)) return null;
  return safeCall("create_polyline", {
    points: points.map((p) => ({ x: p.x, y: p.y })),
    closed,
    layer: layerName,
  });
}

async function hatch(result, pattern, scale, angle, layerName) {
  const handle = handleOf(result);
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
  await safeCall("create_line", {
    startX: a.x,
    startY: a.y,
    endX: b.x,
    endY: b.y,
    layer: layerName,
  });
}

async function mtextLocal(u, v, text, height, width, layerName, rotation = ANGLE_DEG) {
  const p = world(u, v);
  if (!pointInPolygon(p)) return false;
  await safeCall("create_mtext", {
    x: p.x,
    y: p.y,
    text: ge(text),
    height,
    width,
    rotation,
    layer: layerName,
  });
  return true;
}

async function textLocal(u, v, text, height, layerName, rotation = ANGLE_DEG) {
  const p = world(u, v);
  if (!pointInPolygon(p)) return false;
  await safeCall("create_text", {
    x: p.x,
    y: p.y,
    text,
    height,
    rotation,
    layer: layerName,
  });
  return true;
}

async function circleLocal(u, v, radius, layerName) {
  const p = world(u, v);
  if (!pointInPolygon(p) || minBoundaryDistance(p) < radius + 0.4) return false;
  await safeCall("create_circle", { x: p.x, y: p.y, radius, layer: layerName });
  return true;
}

async function drawRect(centerU, centerV, lengthU, widthV, layerName, clearance = 0.5) {
  return poly(rectLocal(centerU, centerV, lengthU, widthV), true, layerName, clearance);
}

async function drawBoundaryAndSetback(bounds) {
  const b = await safeCall("create_polyline", {
    points: boundary.map(([x, y]) => ({ x, y })),
    closed: true,
    layer: layers.boundary,
  });

  const centroid = {
    x: boundary.reduce((s, p) => s + p[0], 0) / boundary.length,
    y: boundary.reduce((s, p) => s + p[1], 0) / boundary.length,
  };
  const setback = boundary.map(([x, y]) => {
    const dx = centroid.x - x;
    const dy = centroid.y - y;
    const len = Math.hypot(dx, dy) || 1;
    const move = Math.min(10, len * 0.18);
    return { x: x + (dx / len) * move, y: y + (dy / len) * move };
  });
  const s = await poly(setback, true, layers.setback, 0.2);
  await hatch(s, "ANSI31", 0.6, ANGLE_DEG, layers.setback);

  await mtextLocal(
    bounds.minU + 18,
    bounds.maxV - 14,
    "გენერალური გეგმა\\Pსაპროექტო საზღვარი და განთავსების არეალი",
    2.6,
    110,
    layers.text,
  );
  return b;
}

async function drawRoad(bounds, roadV) {
  const roadW = 8;
  const roadSegments = [];
  for (let u = bounds.minU + 28; u <= bounds.maxU - 24; u += 18) {
    const len = Math.min(18, bounds.maxU - 18 - u);
    const result = await drawRect(u + len / 2, roadV, len, roadW, layers.road, 1.2);
    if (result) {
      roadSegments.push(localBox(u + len / 2, roadV, len, roadW));
      await hatch(result, "ANSI37", 0.45, ANGLE_DEG, layers.road);
      await line(world(u + 3, roadV), world(u + len - 3, roadV), layers.roadLine);
    }
  }

  await mtextLocal(bounds.maxU - 92, roadV + 6.5, "შიდა საავტომობილო გზა 8.0 მ", 1.35, 80, layers.text);
  await mtextLocal(bounds.maxU - 48, roadV - 7.5, "შესვლა / გამოსვლა", 1.25, 45, layers.text);
  return { roadW, roadSegments };
}

async function drawBuildings(bounds, roadV, roadW) {
  const blocks = [];
  const bLen = 42;
  const bWid = 24;
  const rowVs = [roadV - 35, roadV + 39, roadV + 78];
  const uStart = bounds.minU + 62;
  const uEnd = bounds.maxU - 54;
  let number = 1;

  for (const v of rowVs) {
    for (let u = uStart; u <= uEnd; u += 58) {
      const pts = rectLocal(u, v, bLen, bWid);
      const box = localBox(u, v, bLen, bWid, 8);
      const roadBox = localBox((bounds.minU + bounds.maxU) / 2, roadV, bounds.maxU - bounds.minU, roadW, 8);
      if (!inside(pts, 7) || overlaps(box, roadBox) || blocks.some((b) => overlaps(box, b.box))) continue;
      if (blocks.length >= 10) break;

      const floors = number % 3 === 0 ? 8 : number % 2 === 0 ? 7 : 6;
      const result = await poly(pts, true, layers.building, 7);
      await hatch(result, "SOLID", 1, 0, layers.buildingHatch);
      await line(world(u, v - bWid / 2), world(u, v + bWid / 2), layers.building);
      await line(world(u - 7, v - bWid / 2), world(u - 7, v + bWid / 2), layers.building);
      const core = await drawRect(u - 7, v, 8, 10, layers.building, 1);
      await hatch(core, "ANSI37", 0.18, 0, layers.building);

      await circleLocal(u - 16, v + 8, 3.5, layers.number);
      await textLocal(u - 17.4, v + 6.8, String(number), 2.2, layers.number, 0);
      await mtextLocal(u - 17, v - 2, `ბლოკი ${number}\\P${floors} სართული`, 1.15, 28, layers.floors);

      const sidewalkV = v < roadV ? roadV - roadW / 2 - 2 : roadV + roadW / 2 + 2;
      const walk = await drawRect(u, (v + sidewalkV) / 2, 3.0, Math.abs(v - sidewalkV), layers.sidewalk, 1);
      if (walk) await hatch(walk, "ANSI31", 0.22, ANGLE_DEG, layers.sidewalk);

      blocks.push({ number, u, v, floors, box: localBox(u, v, bLen, bWid), area: bLen * bWid });
      number += 1;
    }
    if (blocks.length >= 10) break;
  }

  return blocks;
}

async function drawParkingAndSidewalks(bounds, roadV, roadW, blocks) {
  let parkingCount = 0;
  let parkingArea = 0;
  const parkingBoxes = [];

  for (let u = bounds.minU + 45; u <= bounds.maxU - 42; u += 3.2) {
    for (const side of [-1, 1]) {
      const v = roadV + side * (roadW / 2 + 3.2);
      const box = localBox(u, v, 2.55, 5.4, 0.35);
      if (blocks.some((b) => overlaps(box, b.box))) continue;
      const result = await drawRect(u, v, 2.55, 5.4, layers.parking, 0.9);
      if (!result) continue;
      parkingCount += 1;
      parkingArea += 2.55 * 5.4;
      parkingBoxes.push(box);
      if (parkingCount <= 70) {
        await textLocal(u - 0.5, v - 0.55, String(parkingCount), 0.7, layers.number);
      }
    }
  }

  let sidewalkArea = 0;
  for (let u = bounds.minU + 30; u <= bounds.maxU - 30; u += 22) {
    for (const side of [-1, 1]) {
      const v = roadV + side * (roadW / 2 + 1.35);
      const result = await drawRect(u + 10, v, 20, 2.1, layers.sidewalk, 0.9);
      if (!result) continue;
      sidewalkArea += 20 * 2.1;
      await hatch(result, "ANSI31", 0.22, ANGLE_DEG, layers.sidewalk);
    }
  }

  await mtextLocal(bounds.minU + 42, roadV + 10, `პარკინგი: ${parkingCount} ადგილი`, 1.2, 60, layers.text);
  return { parkingCount, parkingArea, parkingBoxes, sidewalkArea };
}

async function drawGreen(bounds, roadV, roadW, blocks, parkingBoxes) {
  let greenArea = 0;
  const greenRects = [
    [bounds.minU + 70, bounds.maxV - 24, 105, 16],
    [bounds.minU + 205, bounds.maxV - 20, 120, 14],
    [bounds.minU + 78, bounds.minV + 18, 120, 14],
    [bounds.minU + 235, bounds.minV + 22, 135, 16],
    [bounds.maxU - 86, bounds.maxV - 39, 92, 16],
  ];

  for (const [u, v, lu, wv] of greenRects) {
    const result = await drawRect(u, v, lu, wv, layers.green, 1.4);
    if (!result) continue;
    greenArea += lu * wv;
    await hatch(result, "SOLID", 1, 0, layers.green);
  }

  let trees = 0;
  for (let u = bounds.minU + 28; u <= bounds.maxU - 26; u += 24) {
    for (let v = bounds.minV + 16; v <= bounds.maxV - 16; v += 24) {
      const box = localBox(u, v, 5, 5);
      const roadBox = localBox((bounds.minU + bounds.maxU) / 2, roadV, bounds.maxU - bounds.minU, roadW, 8);
      if (overlaps(box, roadBox)) continue;
      if (blocks.some((b) => overlaps(box, b.box)) || parkingBoxes.some((p) => overlaps(box, p))) continue;
      if (await circleLocal(u, v, 2.2, layers.tree)) {
        await circleLocal(u, v, 0.65, layers.tree);
        trees += 1;
      }
    }
  }

  await mtextLocal(bounds.maxU - 118, bounds.maxV - 18, "გამწვანებული ეზოები და ბუფერული ზოლები", 1.25, 100, layers.text);
  return { greenArea, trees };
}

async function drawDimensions(bounds) {
  const p1 = world(bounds.minU, bounds.minV);
  const p2 = world(bounds.maxU, bounds.minV);
  const p3 = world(bounds.minU, bounds.maxV);
  await safeCall("add_aligned_dimension", {
    x1: p1.x,
    y1: p1.y,
    x2: p2.x,
    y2: p2.y,
    offset: -18,
    layer: layers.dim,
  });
  await safeCall("add_aligned_dimension", {
    x1: p1.x,
    y1: p1.y,
    x2: p3.x,
    y2: p3.y,
    offset: 18,
    layer: layers.dim,
  });
}

async function drawTable(bounds, metrics) {
  const candidates = [
    [bounds.minU + 95, bounds.maxV - 48],
    [bounds.maxU - 96, bounds.minV + 52],
    [bounds.minU + 106, bounds.minV + 52],
  ];
  const width = 92;
  const height = 54;
  const [tableU, tableV] =
    candidates.find(([u, v]) => inside(rectLocal(u, v, width, height), 3)) || candidates[0];

  const outline = await drawRect(tableU, tableV, width, height, layers.table, 1);
  if (!outline) return false;

  for (let i = -2; i <= 3; i++) {
    await line(world(tableU - width / 2, tableV + i * 7.2), world(tableU + width / 2, tableV + i * 7.2), layers.table);
  }
  await line(world(tableU - 12, tableV - height / 2), world(tableU - 12, tableV + height / 2), layers.table);
  await line(world(tableU + 23, tableV - height / 2), world(tableU + 23, tableV + height / 2), layers.table);

  const rows = [
    ["მაჩვენებელი", "ფაქტი", "შენიშვნა"],
    ["ნაკვეთის ფართობი", `${metrics.siteArea.toLocaleString("en-US")} მ²`, "წითელი საზღვარი"],
    ["შენობები", `${metrics.blocks} ბლოკი`, "საპროექტო"],
    ["განაშენიანება", `${metrics.footprint.toLocaleString("en-US")} მ²`, `K1=${metrics.k1}`],
    ["საერთო ფართობი", `${metrics.gfa.toLocaleString("en-US")} მ²`, `K2=${metrics.k2}`],
    ["გამწვანება", `${metrics.green.toLocaleString("en-US")} მ²`, `K3=${metrics.k3}`],
    ["პარკინგი", `${metrics.parkingCount} ადგილი`, "ზედაპირული"],
  ];
  for (let i = 0; i < rows.length; i++) {
    const y = tableV + 21.4 - i * 7.2;
    await mtextLocal(tableU - 43, y, rows[i][0], 1.05, 30, layers.table);
    await mtextLocal(tableU - 8, y, rows[i][1], 1.05, 28, layers.table);
    await mtextLocal(tableU + 25, y, rows[i][2], 1.05, 32, layers.table);
  }
  return true;
}

async function drawLegend(bounds, metrics) {
  const u = bounds.minU + 28;
  const v = bounds.minV + 35;
  await mtextLocal(
    u,
    v,
    "პირობითი აღნიშვნები\\Pსაპროექტო შენობა\\Pშიდა გზა\\Pტროტუარი / ბილიკი\\Pგამწვანება\\Pსაპროექტო არეალი",
    1.15,
    70,
    layers.text,
  );
  await mtextLocal(
    bounds.minU + 24,
    bounds.maxV - 40,
    `დაგეგმარების დაშვებები:\\Pსართულიანობა 6-8 სართული\\Pსეტბექი მინ. 7-10 მ გეომეტრიული კონტროლით\\Pსამართლებრივი პარამეტრები გადასამოწმებელია მუნიციპალიტეტთან`,
    1.05,
    120,
    layers.text,
  );
  await mtextLocal(
    bounds.maxU - 150,
    bounds.minV + 24,
    `სულ: ${metrics.blocks} ბლოკი, ${metrics.parkingCount} ავტოსადგომი\\Pშენობები, გზები და პარკინგი მოთავსებულია საზღვრის შიგნით.`,
    1.2,
    125,
    layers.text,
  );
}

async function main() {
  await safeCall("run_command", {
    command:
      '(setvar "INSUNITS" 4) (setvar "MEASUREMENT" 1) (setvar "LUNITS" 2) (setvar "AUNITS" 0) (command "_.-STYLE" "GEO" "Sylfaen.ttf" "0" "1" "0" "N" "N" "N") (princ)',
  });

  await layer(layers.boundary, 254, "LineWeight000");
  await layer(layers.setback, 30, "LineWeight025");
  await layer(layers.building, 251, "LineWeight035");
  await layer(layers.buildingHatch, 253, "LineWeight000");
  await layer(layers.road, 8, "LineWeight025");
  await layer(layers.roadLine, 7, "LineWeight013");
  await layer(layers.parking, 7, "LineWeight000");
  await layer(layers.sidewalk, 9, "LineWeight018");
  await layer(layers.green, 94, "LineWeight018");
  await layer(layers.tree, 92, "LineWeight018");
  await layer(layers.text, 7, "LineWeight018");
  await layer(layers.table, 7, "LineWeight018");
  await layer(layers.dim, 7, "LineWeight018");
  await layer(layers.number, 7, "LineWeight018");
  await layer(layers.floors, 7, "LineWeight018");

  const locals = boundary.map(local);
  const bounds = {
    minU: Math.min(...locals.map((p) => p.u)),
    maxU: Math.max(...locals.map((p) => p.u)),
    minV: Math.min(...locals.map((p) => p.v)),
    maxV: Math.max(...locals.map((p) => p.v)),
  };
  const siteArea = Math.round(area(boundary));
  const roadV = bounds.minV + (bounds.maxV - bounds.minV) * 0.38;

  await drawBoundaryAndSetback(bounds);
  const { roadW, roadSegments } = await drawRoad(bounds, roadV);
  const blocks = await drawBuildings(bounds, roadV, roadW);
  const parking = await drawParkingAndSidewalks(bounds, roadV, roadW, blocks);
  const green = await drawGreen(bounds, roadV, roadW, blocks, parking.parkingBoxes);
  await drawDimensions(bounds);

  const footprint = Math.round(blocks.reduce((sum, b) => sum + b.area, 0));
  const gfa = Math.round(blocks.reduce((sum, b) => sum + b.area * b.floors, 0));
  const roadArea = Math.round(roadSegments.length * 18 * roadW);
  const greenEstimate = Math.max(
    0,
    Math.round(siteArea - footprint - roadArea - parking.parkingArea - parking.sidewalkArea),
  );
  const metrics = {
    siteArea,
    blocks: blocks.length,
    footprint,
    gfa,
    parkingCount: parking.parkingCount,
    green: greenEstimate,
    k1: (footprint / siteArea).toFixed(3),
    k2: (gfa / siteArea).toFixed(3),
    k3: (greenEstimate / siteArea).toFixed(2),
    roadSegments: roadSegments.length,
    trees: green.trees,
    angleDeg: Number(ANGLE_DEG.toFixed(3)),
  };
  await drawTable(bounds, metrics);
  await drawLegend(bounds, metrics);

  await safeCall("run_command", {
    command: '(command "_.ZOOM" "_W" "477070,4618615" "477555,4618860") (princ)',
  });

  fs.writeFileSync(
    "C:/Users/PCZONE.GE/autocad-mcp/grg-red-validation.json",
    JSON.stringify(
      {
        drawing: "Drawing1.dwg",
        boundaryVertices: boundary.length,
        bounds,
        metrics,
        validation: {
          allGeneratedPrimaryGeometryUsesInsideChecks: true,
          buildingClearanceMeters: ">= 7.0 from boundary by corner checks",
          roadParkingConflictCheck: "parking candidates rejected when overlapping buildings",
          missingLegalInputs:
            "Exact zoning class, cadastral restrictions, easements, and confirmed municipal K limits were not provided; layout uses conservative GRG-style assumptions.",
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(
    `[grg-red] done: area=${siteArea}m2 blocks=${metrics.blocks} parking=${metrics.parkingCount} K1=${metrics.k1} K2=${metrics.k2} K3=${metrics.k3}`,
  );
}

main().catch((error) => {
  console.error("[grg-red] ERROR:", error.response?.data || error.message);
  process.exit(1);
});
