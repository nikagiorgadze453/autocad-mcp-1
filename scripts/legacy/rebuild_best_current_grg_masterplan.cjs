// rebuild_best_current_grg_masterplan.cjs
// Cleaner reference-informed model-space masterplan for the current red area.
// It hides the previous schematic generated layers and draws a more GRG-like
// composition: larger 8-12 floor blocks, road spine/loop, parking rows, and
// landscaped buffers. It does not add a plot frame.

const fs = require("fs");
const axios = require("axios");

const URL = process.env.AUTOCAD_PLUGIN_URL || "http://localhost:12345/";
const TOKEN = process.env.MCP_AUTOCAD_TOKEN || "default-secret-token";
const PARCEL_DUMP = "C:/Users/PCZONE.GE/autocad-mcp/parcel-v2.txt";

const layers = {
  building: "საპროეტო_შენობა",
  buildingFill: "BEST-შენობა-ჰეჩი",
  road: "საავტომ.სამოძრაო",
  roadFill: "BEST-გზა-ჰეჩი",
  roadAxis: "BEST-გზის-ღერძი",
  parking: "Parkireba_90",
  sidewalk: "საფეხმ.ტროტუარი",
  green: "გამწვანება ივნისი",
  tree: "BEST-ხეები",
  text: "BEST-წარწერები",
  table: "BEST-K-ცხრილი",
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

function parseRedCluster() {
  const dump = fs.readFileSync(PARCEL_DUMP, "utf8");
  const blocks = dump.split(/\n(?=\[\d+\] )/g);
  const result = [];
  for (const block of blocks) {
    const header = block.match(
      /^\[(\d+)\].*closed=(\d+).*nverts=(\d+).*bbox=\(([-\d.]+),([-\d.]+)\s+-\s+([-\d.]+),([-\d.]+)\)/m,
    );
    if (!header) continue;
    const [, index, closed, , minX, minY, maxX, maxY] = header;
    const bbox = {
      minX: Number(minX),
      minY: Number(minY),
      maxX: Number(maxX),
      maxY: Number(maxY),
    };
    if (
      closed !== "1" ||
      bbox.minX < 476300 ||
      bbox.maxX > 476760 ||
      bbox.minY < 4618100 ||
      bbox.maxY > 4618460
    ) {
      continue;
    }
    const vertices = [...block.matchAll(/^\s+v\s+([-\d.]+)\s+([-\d.]+)/gm)].map((m) => ({
      x: Number(m[1]),
      y: Number(m[2]),
    }));
    if (vertices.length >= 4) result.push({ index: Number(index), bbox, vertices });
  }
  return result.slice(0, 8);
}

function boundsOf(polys) {
  const pts = polys.flatMap((poly) => poly.vertices);
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    maxX: Math.max(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)),
    maxY: Math.max(...pts.map((p) => p.y)),
  };
}

function polygonArea(poly) {
  let sum = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    sum += poly[j].x * poly[i].y - poly[i].x * poly[j].y;
  }
  return Math.abs(sum) / 2;
}

function pointInPolygon(point, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const crosses =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInSite(point, polys) {
  return polys.some((poly) => pointInPolygon(point, poly.vertices));
}

function rect(cx, cy, w, h) {
  return [
    { x: cx - w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy + h / 2 },
    { x: cx - w / 2, y: cy + h / 2 },
  ];
}

function rectSamples(cx, cy, w, h) {
  const pts = rect(cx, cy, w, h);
  pts.push({ x: cx, y: cy });
  pts.push({ x: cx - w / 4, y: cy - h / 4 });
  pts.push({ x: cx + w / 4, y: cy - h / 4 });
  pts.push({ x: cx - w / 4, y: cy + h / 4 });
  pts.push({ x: cx + w / 4, y: cy + h / 4 });
  return pts;
}

function rectInsideSite(cx, cy, w, h, polys) {
  return rectSamples(cx, cy, w, h).every((p) => pointInSite(p, polys));
}

function bbox(cx, cy, w, h, grow = 0) {
  return {
    minX: cx - w / 2 - grow,
    maxX: cx + w / 2 + grow,
    minY: cy - h / 2 - grow,
    maxY: cy + h / 2 + grow,
  };
}

function overlaps(a, b) {
  return !(a.maxX <= b.minX || a.minX >= b.maxX || a.maxY <= b.minY || a.minY >= b.maxY);
}

function handleOf(result) {
  return result?.handle || result?.result?.handle || result?.entity?.handle;
}

async function layer(name, color, lineWeight) {
  await safeCall("create_layer", { name, color, lineWeight });
  await safeCall("set_layer_properties", { name, isOff: false, color, lineWeight });
}

async function poly(points, closed, layerName) {
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
  return safeCall("create_line", {
    startX: a.x,
    startY: a.y,
    endX: b.x,
    endY: b.y,
    layer: layerName,
  });
}

async function mtext(x, y, text, height, width, layerName, rotation = 0) {
  return safeCall("create_mtext", {
    x,
    y,
    text: ge(text),
    height,
    width,
    rotation,
    layer: layerName,
  });
}

async function dbtext(x, y, text, height, layerName, rotation = 0) {
  return safeCall("create_text", { x, y, text, height, rotation, layer: layerName });
}

async function circle(x, y, radius, layerName) {
  return safeCall("create_circle", { centerX: x, centerY: y, radius, layer: layerName });
}

async function drawRect(cx, cy, w, h, layerName) {
  return poly(rect(cx, cy, w, h), true, layerName);
}

async function setup() {
  await safeCall("run_command", {
    command:
      '(setvar "INSUNITS" 4) (setvar "MEASUREMENT" 1) (setvar "LUNITS" 2) (setvar "AUNITS" 0) (command "_.-STYLE" "GEO" "Sylfaen.ttf" "0" "1" "0" "N" "N" "N") (princ)',
  });

  for (const name of [
    "NGRG-საპროექტო-შენობა",
    "NGRG-შენობა-ჰეჩი",
    "NGRG-შიდა-გზა",
    "NGRG-გზის-ღერძი",
    "NGRG-პარკინგი",
    "NGRG-ტროტუარი",
    "NGRG-გამწვანება",
    "NGRG-ხეები",
    "NGRG-წარწერები",
    "NGRG-K-ცხრილი",
    "NGRG-ზომები",
    "NGRG-ნომრები",
    "GRG-საპროექტო-ჰეჩი",
    "GRG-გზის-ღერძი",
    "GRG-წარწერები",
    "GRG-ცხრილი",
    "GRG-ხეები",
    "TITLE",
    "TEXT",
  ]) {
    await safeCall("set_layer_properties", { name, isOff: true });
  }

  await layer(layers.building, 251, "LineWeight035");
  await layer(layers.buildingFill, 30, "LineWeight000");
  await layer(layers.road, 8, "LineWeight025");
  await layer(layers.roadFill, 9, "LineWeight000");
  await layer(layers.roadAxis, 7, "LineWeight013");
  await layer(layers.parking, 7, "LineWeight000");
  await layer(layers.sidewalk, 7, "LineWeight018");
  await layer(layers.green, 94, "LineWeight018");
  await layer(layers.tree, 92, "LineWeight018");
  await layer(layers.text, 7, "LineWeight018");
  await layer(layers.table, 7, "LineWeight018");
  await layer(layers.dim, 2, "LineWeight018");
  await layer(layers.number, 7, "LineWeight018");
  await layer(layers.floors, 7, "LineWeight018");
}

async function drawBuilding(cx, cy, w, h, floors, number, polys, used) {
  if (!rectInsideSite(cx, cy, w, h, polys)) return null;
  const b = bbox(cx, cy, w, h, 9);
  if (used.some((u) => overlaps(u.box, b))) return null;
  const outline = await drawRect(cx, cy, w, h, layers.building);
  await hatch(outline, "SOLID", 1, 0, layers.buildingFill);
  await line({ x: cx - w * 0.15, y: cy - h / 2 }, { x: cx - w * 0.15, y: cy + h / 2 }, layers.building);
  await line({ x: cx + w * 0.15, y: cy - h / 2 }, { x: cx + w * 0.15, y: cy + h / 2 }, layers.building);
  const core = await drawRect(cx, cy, Math.min(14, w * 0.22), Math.min(14, h * 0.55), layers.building);
  await hatch(core, "ANSI37", 0.15, 0, layers.building);

  await circle(cx - w / 2 + 7, cy + h / 2 - 6, 3.2, layers.number);
  await dbtext(cx - w / 2 + 6, cy + h / 2 - 7.3, String(number), 1.8, layers.number);
  await mtext(cx - w / 2 + 5, cy - h / 2 + 5, `${floors} სართული`, 1.05, 30, layers.floors);
  const item = { cx, cy, w, h, floors, area: w * h, box: b };
  used.push(item);
  return item;
}

async function drawRoad(cx, cy, w, h, polys, usedRoads, blocks) {
  if (!rectInsideSite(cx, cy, w, h, polys)) return null;
  const b = bbox(cx, cy, w, h, 1);
  if (blocks.some((block) => overlaps(block.box, b))) return null;
  const outline = await drawRect(cx, cy, w, h, layers.road);
  await hatch(outline, "ANSI37", 0.22, 0, layers.roadFill);
  if (w >= h) {
    await line({ x: cx - w / 2 + 4, y: cy }, { x: cx + w / 2 - 4, y: cy }, layers.roadAxis);
  } else {
    await line({ x: cx, y: cy - h / 2 + 4 }, { x: cx, y: cy + h / 2 - 4 }, layers.roadAxis);
  }
  const road = { cx, cy, w, h, area: w * h, box: b };
  usedRoads.push(road);
  return road;
}

async function main() {
  const polys = parseRedCluster();
  if (polys.length < 3) throw new Error("Could not identify current red cluster");
  const bounds = boundsOf(polys);
  const siteArea = Math.round(polys.reduce((sum, p) => sum + polygonArea(p.vertices), 0));

  await setup();

  const blocks = [];
  // The reference plan has a dominant middle building and smaller wings.
  const buildingCandidates = [
    [476492, 4618408, 104, 24, 12],
    [476603, 4618370, 58, 22, 10],
    [476657, 4618304, 48, 22, 8],
    [476524, 4618284, 54, 21, 10],
    [476593, 4618205, 66, 24, 12],
    [476559, 4618176, 44, 20, 8],
    [476455, 4618330, 38, 20, 8],
  ];
  for (const candidate of buildingCandidates) {
    await drawBuilding(...candidate, blocks.length + 1, polys, blocks);
  }

  const roads = [];
  const roadCandidates = [
    [476504, 4618390, 230, 8],
    [476584, 4618342, 8, 92],
    [476599, 4618262, 155, 8],
    [476641, 4618312, 8, 74],
    [476452, 4618358, 8, 54],
  ];
  for (const candidate of roadCandidates) {
    await drawRoad(...candidate, polys, roads, blocks);
  }

  let sidewalkArea = 0;
  for (const [cx, cy, w, h] of [
    [476504, 4618400, 230, 2.2],
    [476584, 4618342, 2.2, 92],
    [476599, 4618274, 155, 2.2],
    [476641, 4618312, 2.2, 74],
    [476452, 4618358, 2.2, 54],
  ]) {
    if (!rectInsideSite(cx, cy, w, h, polys)) continue;
    const result = await drawRect(cx, cy, w, h, layers.sidewalk);
    await hatch(result, "ANSI31", 0.18, 0, layers.sidewalk);
    sidewalkArea += w * h;
  }

  const parkingBoxes = [];
  let parkingCount = 0;
  let parkingArea = 0;
  const tryParking = async (cx, cy, w, h) => {
    if (!rectInsideSite(cx, cy, w, h, polys)) return;
    const b = bbox(cx, cy, w, h, 0.4);
    if (blocks.some((block) => overlaps(block.box, b))) return;
    if (roads.some((road) => overlaps(road.box, b))) return;
    const result = await drawRect(cx, cy, w, h, layers.parking);
    if (!result) return;
    parkingCount += 1;
    parkingArea += w * h;
    parkingBoxes.push(b);
    if (parkingCount <= 90) await dbtext(cx - 0.7, cy - 0.6, String(parkingCount), 0.52, layers.number);
  };
  for (let x = 476388; x <= 476610; x += 5.9) await tryParking(x, 4618378, 2.6, 5.2);
  for (let x = 476512; x <= 476688; x += 5.9) await tryParking(x, 4618278, 2.6, 5.2);
  for (let y = 4618290; y <= 4618355; y += 5.9) await tryParking(476628, y, 5.2, 2.6);

  let greenArea = 0;
  for (const [cx, cy, w, h] of [
    [476430, 4618430, 130, 12],
    [476606, 4618420, 86, 12],
    [476386, 4618374, 58, 12],
    [476617, 4618328, 42, 18],
    [476600, 4618168, 62, 15],
    [476660, 4618380, 42, 12],
  ]) {
    if (!rectInsideSite(cx, cy, w, h, polys)) continue;
    const result = await drawRect(cx, cy, w, h, layers.green);
    await hatch(result, "SOLID", 1, 0, layers.green);
    greenArea += w * h;
  }

  let trees = 0;
  for (let x = bounds.minX + 18; x <= bounds.maxX - 12; x += 18) {
    for (let y = bounds.minY + 16; y <= bounds.maxY - 14; y += 20) {
      if (!pointInSite({ x, y }, polys)) continue;
      const b = bbox(x, y, 4, 4);
      if (blocks.some((block) => overlaps(block.box, b))) continue;
      if (roads.some((road) => overlaps(road.box, b))) continue;
      if (parkingBoxes.some((parking) => overlaps(parking, b))) continue;
      await circle(x, y, 1.55, layers.tree);
      await circle(x, y, 0.4, layers.tree);
      trees += 1;
    }
  }

  const footprint = Math.round(blocks.reduce((sum, block) => sum + block.area, 0));
  const gfa = Math.round(blocks.reduce((sum, block) => sum + block.area * block.floors, 0));
  const roadArea = Math.round(roads.reduce((sum, road) => sum + road.area, 0));
  const openGreen = Math.max(0, Math.round(siteArea - footprint - roadArea - parkingArea - sidewalkArea));
  const metrics = {
    siteArea,
    blocks: blocks.length,
    footprint,
    gfa,
    roadArea,
    sidewalkArea: Math.round(sidewalkArea),
    parking: parkingCount,
    green: openGreen,
    trees,
    k1: (footprint / siteArea).toFixed(3),
    k2: (gfa / siteArea).toFixed(3),
    k3: (openGreen / siteArea).toFixed(2),
  };

  // K table and concise Georgian notes, kept in model space like the reference.
  const tx = bounds.minX + 18;
  const ty = bounds.minY + 34;
  const tw = 92;
  const th = 50;
  await drawRect(tx + tw / 2, ty + th / 2, tw, th, layers.table);
  for (let i = 1; i < 7; i++) await line({ x: tx, y: ty + i * 7 }, { x: tx + tw, y: ty + i * 7 }, layers.table);
  await line({ x: tx + 36, y: ty }, { x: tx + 36, y: ty + th }, layers.table);
  await line({ x: tx + 61, y: ty }, { x: tx + 61, y: ty + th }, layers.table);
  const rows = [
    ["მაჩვენებელი", "ფაქტი", "შენიშვნა"],
    ["ტერიტორია", `${metrics.siteArea} მ²`, "არეალი"],
    ["ბლოკები", `${metrics.blocks}`, "8-12 სართ."],
    ["განაშენიანება", `${metrics.footprint} მ²`, `K1=${metrics.k1}`],
    ["საერთო", `${metrics.gfa} მ²`, `K2=${metrics.k2}`],
    ["გამწვანება", `${metrics.green} მ²`, `K3=${metrics.k3}`],
    ["პარკინგი", `${metrics.parking}`, "ადგილი"],
  ];
  for (let i = 0; i < rows.length; i++) {
    const y = ty + th - 5 - i * 7;
    await mtext(tx + 2, y, rows[i][0], 0.88, 31, layers.table);
    await mtext(tx + 38, y, rows[i][1], 0.88, 21, layers.table);
    await mtext(tx + 63, y, rows[i][2], 0.88, 27, layers.table);
  }

  await mtext(bounds.minX + 4, bounds.maxY + 12, "საპროექტო გენგეგმა", 2.0, 95, layers.text);
  await mtext(bounds.minX + 4, bounds.maxY + 5, "8-12 სართულიანი საცხოვრებელი ბლოკები, შიდა გზა, პარკინგი და გამწვანება", 1.05, 210, layers.text);
  await mtext(476386, 4618405, "შიდა გზა 8.0 მ", 1.05, 50, layers.text);
  await mtext(476515, 4618287, `პარკინგი ${metrics.parking} ადგილი`, 1.0, 62, layers.text);
  await mtext(bounds.maxX - 112, bounds.minY + 22, "შენიშვნა:\\Pსაბოლოო ნორმები გადასამოწმებელია\\Pზონირების და სერვიტუტების მიხედვით", 0.95, 96, layers.text);

  await safeCall("run_command", {
    command: `(command "_.ZOOM" "_W" "${bounds.minX - 28},${bounds.minY - 35}" "${bounds.maxX + 35},${bounds.maxY + 32}") (princ)`,
  });

  fs.writeFileSync(
    "C:/Users/PCZONE.GE/autocad-mcp/best-current-grg-validation.json",
    JSON.stringify(
      {
        drawing: "Drawing1.dwg",
        redCluster: {
          polylinesUsed: polys.map((poly) => ({ index: poly.index, vertices: poly.vertices.length, bbox: poly.bbox })),
          bounds,
        },
        metrics,
        validation: {
          oldSchematicLayersHidden: true,
          noPlotFrameAdded: true,
          primaryGeometrySampledInsideRedCluster: true,
          roadBuildingConflictAvoidance: "Road candidates skipped if overlapping building boxes.",
          parkingConflictAvoidance: "Parking bays skipped if outside red cluster or overlapping buildings/roads.",
          remainingAssumptions:
            "Exact legal zoning, confirmed setbacks, fire truck turning templates, servitudes, and municipal coefficients still need authoritative confirmation.",
        },
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(
    `[best-current-grg] done: area=${metrics.siteArea} blocks=${metrics.blocks} parking=${metrics.parking} K1=${metrics.k1} K2=${metrics.k2} K3=${metrics.k3}`,
  );
}

main().catch((error) => {
  console.error("[best-current-grg] ERROR:", error.response?.data || error.message);
  process.exit(1);
});
