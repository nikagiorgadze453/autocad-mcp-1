// build_current_area_grg_masterplan.cjs
// Model-space GRG-style proposal for the current red cluster, without plot/sheet frame.

const fs = require("fs");
const axios = require("axios");

const URL = process.env.AUTOCAD_PLUGIN_URL || "http://localhost:12345/";
const TOKEN = process.env.MCP_AUTOCAD_TOKEN || "default-secret-token";
const PARCEL_DUMP = "C:/Users/PCZONE.GE/autocad-mcp/parcel-v2.txt";

const layers = {
  building: "NGRG-საპროექტო-შენობა",
  buildingHatch: "NGRG-შენობა-ჰეჩი",
  road: "NGRG-შიდა-გზა",
  roadLine: "NGRG-გზის-ღერძი",
  parking: "NGRG-პარკინგი",
  sidewalk: "NGRG-ტროტუარი",
  green: "NGRG-გამწვანება",
  tree: "NGRG-ხეები",
  text: "NGRG-წარწერები",
  table: "NGRG-K-ცხრილი",
  dim: "NGRG-ზომები",
  number: "NGRG-ნომრები",
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

function parseCurrentRedCluster() {
  const text = fs.readFileSync(PARCEL_DUMP, "utf8");
  const blocks = text.split(/\n(?=\[\d+\] )/g);
  const polys = [];

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
    if (vertices.length >= 4) polys.push({ index: Number(index), bbox, vertices });
  }
  return polys.slice(0, 8);
}

function area(poly) {
  let sum = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    sum += poly[j].x * poly[i].y - poly[i].x * poly[j].y;
  }
  return Math.abs(sum) / 2;
}

function pointInPolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const crosses =
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInSite(p, polys) {
  return polys.some((poly) => pointInPolygon(p, poly.vertices));
}

function rect(cx, cy, w, h) {
  return [
    { x: cx - w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy + h / 2 },
    { x: cx - w / 2, y: cy + h / 2 },
  ];
}

function samplesForRect(cx, cy, w, h) {
  const pts = rect(cx, cy, w, h);
  pts.push({ x: cx, y: cy });
  pts.push({ x: cx - w / 2, y: cy });
  pts.push({ x: cx + w / 2, y: cy });
  pts.push({ x: cx, y: cy - h / 2 });
  pts.push({ x: cx, y: cy + h / 2 });
  return pts;
}

function rectInsideSite(cx, cy, w, h, polys) {
  return samplesForRect(cx, cy, w, h).every((p) => pointInSite(p, polys));
}

function box(cx, cy, w, h, grow = 0) {
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

function resultHandle(result) {
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
  const handle = resultHandle(result);
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
  if (Number.isNaN(x) || Number.isNaN(y)) return;
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

async function text(x, y, value, height, layerName, rotation = 0) {
  return safeCall("create_text", { x, y, text: value, height, rotation, layer: layerName });
}

async function circle(x, y, radius, layerName) {
  return safeCall("create_circle", { centerX: x, centerY: y, radius, layer: layerName });
}

async function drawRect(cx, cy, w, h, layerName) {
  return poly(rect(cx, cy, w, h), true, layerName);
}

function boundsOf(polys) {
  const pts = polys.flatMap((p) => p.vertices);
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    maxX: Math.max(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)),
    maxY: Math.max(...pts.map((p) => p.y)),
  };
}

async function setupLayers() {
  for (const oldLayer of [
    "TITLE",
    "TEXT",
    "GRG-საპროექტო-ჰეჩი",
    "GRG-გზის-ღერძი",
    "GRG-წარწერები",
    "GRG-ცხრილი",
    "GRG-ხეები",
  ]) {
    await safeCall("set_layer_properties", { name: oldLayer, isOff: true });
  }

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
  await layer(layers.dim, 2, "LineWeight018");
  await layer(layers.number, 7, "LineWeight018");
}

async function drawBuildings(polys) {
  const candidates = [
    [476595, 4618387, 46, 18, 12],
    [476640, 4618371, 42, 18, 10],
    [476520, 4618356, 42, 19, 12],
    [476455, 4618334, 34, 18, 8],
    [476522, 4618287, 39, 18, 10],
    [476665, 4618295, 38, 18, 8],
    [476600, 4618218, 42, 20, 12],
    [476563, 4618194, 36, 18, 10],
    [476392, 4618414, 55, 17, 8],
    [476502, 4618417, 50, 17, 10],
  ];
  const blocks = [];

  for (const [cx, cy, w, h, floors] of candidates) {
    if (!rectInsideSite(cx, cy, w, h, polys)) continue;
    const b = box(cx, cy, w, h, 7);
    if (blocks.some((existing) => overlaps(existing.box, b))) continue;
    const result = await drawRect(cx, cy, w, h, layers.building);
    await hatch(result, "SOLID", 1, 0, layers.buildingHatch);
    await line({ x: cx, y: cy - h / 2 }, { x: cx, y: cy + h / 2 }, layers.building);
    await line({ x: cx - 7, y: cy - h / 2 }, { x: cx - 7, y: cy + h / 2 }, layers.building);
    const core = await drawRect(cx - 7, cy, 8, 9, layers.building);
    await hatch(core, "ANSI37", 0.15, 0, layers.building);
    await circle(cx - w / 2 + 6, cy + h / 2 - 5, 3.0, layers.number);
    await text(cx - w / 2 + 5.1, cy + h / 2 - 6.2, String(blocks.length + 1), 1.8, layers.number);
    await mtext(cx - w / 2 + 4, cy - 2, `${floors} სართული\\P${w}×${h} მ`, 1.05, 28, layers.text);
    blocks.push({ cx, cy, w, h, floors, box: b, area: w * h });
  }
  return blocks;
}

async function drawRoadsAndPedestrian(polys, blocks) {
  const roads = [
    [476375, 4618390, 230, 7],
    [476585, 4618368, 7, 72],
    [476540, 4618262, 120, 7],
    [476644, 4618260, 82, 7],
  ];
  const drawnRoads = [];
  for (const [cx, cy, w, h] of roads) {
    if (!rectInsideSite(cx, cy, w, h, polys)) continue;
    const b = box(cx, cy, w, h, 2);
    if (blocks.some((block) => overlaps(block.box, b))) continue;
    const result = await drawRect(cx, cy, w, h, layers.road);
    await hatch(result, "ANSI37", 0.35, 0, layers.road);
    await line({ x: cx - w / 2 + 4, y: cy }, { x: cx + w / 2 - 4, y: cy }, layers.roadLine);
    drawnRoads.push({ cx, cy, w, h, box: b });
  }

  const walks = [
    [476375, 4618400, 230, 2.2],
    [476585, 4618368, 2.2, 72],
    [476540, 4618272, 120, 2.2],
    [476644, 4618270, 82, 2.2],
    [476462, 4618358, 2.2, 56],
  ];
  let sidewalkArea = 0;
  for (const [cx, cy, w, h] of walks) {
    if (!rectInsideSite(cx, cy, w, h, polys)) continue;
    const result = await drawRect(cx, cy, w, h, layers.sidewalk);
    await hatch(result, "ANSI31", 0.22, 0, layers.sidewalk);
    sidewalkArea += w * h;
  }
  await mtext(476382, 4618406, "შიდა გზა 7.0 მ / ქვეითთა ბილიკი", 1.2, 90, layers.text);
  return { roads: drawnRoads, sidewalkArea };
}

async function drawParking(polys, blocks, roads) {
  const parkingCandidates = [];
  for (let x = 476372; x <= 476560; x += 6.2) parkingCandidates.push([x, 4618381, 2.7, 5.4]);
  for (let x = 476515; x <= 476680; x += 6.2) parkingCandidates.push([x, 4618278, 2.7, 5.4]);
  for (let y = 4618295; y <= 4618355; y += 6.2) parkingCandidates.push([476571, y, 5.4, 2.7]);

  let count = 0;
  let areaTotal = 0;
  const boxes = [];
  for (const [cx, cy, w, h] of parkingCandidates) {
    if (!rectInsideSite(cx, cy, w, h, polys)) continue;
    const b = box(cx, cy, w, h, 0.4);
    if (blocks.some((block) => overlaps(block.box, b))) continue;
    if (roads.some((road) => overlaps(road.box, b))) continue;
    const result = await drawRect(cx, cy, w, h, layers.parking);
    if (!result) continue;
    count += 1;
    areaTotal += w * h;
    boxes.push(b);
    if (count <= 70) await text(cx - 0.7, cy - 0.7, String(count), 0.55, layers.number);
  }
  await mtext(476505, 4618286, `პარკინგი ${count} ადგილი`, 1.05, 54, layers.text);
  return { count, areaTotal, boxes };
}

async function drawGreen(polys, blocks, parkingBoxes, roads) {
  const greenRects = [
    [476430, 4618430, 110, 10],
    [476596, 4618419, 78, 10],
    [476382, 4618380, 50, 10],
    [476620, 4618315, 45, 14],
    [476595, 4618168, 44, 12],
  ];
  let greenArea = 0;
  for (const [cx, cy, w, h] of greenRects) {
    if (!rectInsideSite(cx, cy, w, h, polys)) continue;
    const result = await drawRect(cx, cy, w, h, layers.green);
    await hatch(result, "SOLID", 1, 0, layers.green);
    greenArea += w * h;
  }

  let trees = 0;
  for (let x = 476370; x <= 476690; x += 22) {
    for (let y = 4618170; y <= 4618430; y += 24) {
      if (!pointInSite({ x, y }, polys)) continue;
      const b = box(x, y, 5, 5);
      if (blocks.some((block) => overlaps(block.box, b))) continue;
      if (parkingBoxes.some((parking) => overlaps(parking, b))) continue;
      if (roads.some((road) => overlaps(road.box, b))) continue;
      await circle(x, y, 1.8, layers.tree);
      await circle(x, y, 0.45, layers.tree);
      trees += 1;
    }
  }
  await mtext(476380, 4618435, "გამწვანებული ეზოები და ბუფერული ზონები", 1.05, 95, layers.text);
  return { greenArea, trees };
}

async function drawTable(bounds, metrics) {
  const tableX = bounds.minX + 18;
  const tableY = bounds.minY + 40;
  const width = 86;
  const height = 49;
  const outline = await drawRect(tableX + width / 2, tableY + height / 2, width, height, layers.table);
  if (!outline) return;
  for (let i = 1; i < 7; i++) {
    await line({ x: tableX, y: tableY + i * 7 }, { x: tableX + width, y: tableY + i * 7 }, layers.table);
  }
  await line({ x: tableX + 34, y: tableY }, { x: tableX + 34, y: tableY + height }, layers.table);
  await line({ x: tableX + 58, y: tableY }, { x: tableX + 58, y: tableY + height }, layers.table);
  const rows = [
    ["მაჩვენებელი", "ფაქტი", "შენიშვნა"],
    ["ტერიტორია", `${metrics.siteArea} მ²`, "წითელი კონტური"],
    ["ბლოკები", `${metrics.blocks}`, "8-12 სართ."],
    ["განაშენიანება", `${metrics.footprint} მ²`, `K1=${metrics.k1}`],
    ["საერთო ფართობი", `${metrics.gfa} მ²`, `K2=${metrics.k2}`],
    ["გამწვანება", `${metrics.green} მ²`, `K3=${metrics.k3}`],
    ["პარკინგი", `${metrics.parking}`, "ადგილი"],
  ];
  for (let i = 0; i < rows.length; i++) {
    const y = tableY + height - 5 - i * 7;
    await mtext(tableX + 2, y, rows[i][0], 0.9, 30, layers.table);
    await mtext(tableX + 36, y, rows[i][1], 0.9, 20, layers.table);
    await mtext(tableX + 60, y, rows[i][2], 0.9, 24, layers.table);
  }
}

async function drawLabels(bounds, metrics) {
  await mtext(
    bounds.minX + 4,
    bounds.maxY + 12,
    "საცხოვრებელი გენგეგმა / GRG სტილი",
    2.2,
    135,
    layers.text,
  );
  await mtext(
    bounds.minX + 4,
    bounds.maxY + 5,
    "8-12 სართულიანი ბლოკები, შიდა გზა, პარკინგი, ქვეითთა ბილიკები და გამწვანება",
    1.1,
    210,
    layers.text,
  );
  await mtext(
    bounds.maxX - 108,
    bounds.minY + 22,
    `სულ ${metrics.blocks} ბლოკი\\Pშენობები და გზები არ კვეთს ერთმანეთს\\Pსქემა მოთავსებულია მიმდინარე წითელ არეალში`,
    1.0,
    95,
    layers.text,
  );
}

async function main() {
  const polys = parseCurrentRedCluster();
  if (polys.length < 3) throw new Error("Could not find current red cluster polylines");
  const bounds = boundsOf(polys);
  const siteArea = Math.round(polys.reduce((sum, poly) => sum + area(poly.vertices), 0));

  await safeCall("run_command", {
    command:
      '(setvar "INSUNITS" 4) (setvar "MEASUREMENT" 1) (setvar "LUNITS" 2) (setvar "AUNITS" 0) (command "_.-STYLE" "GEO" "Sylfaen.ttf" "0" "1" "0" "N" "N" "N") (princ)',
  });
  await setupLayers();

  const blocks = await drawBuildings(polys);
  const roadResult = await drawRoadsAndPedestrian(polys, blocks);
  const parking = await drawParking(polys, blocks, roadResult.roads);
  const green = await drawGreen(polys, blocks, parking.boxes, roadResult.roads);

  const footprint = Math.round(blocks.reduce((sum, block) => sum + block.area, 0));
  const gfa = Math.round(blocks.reduce((sum, block) => sum + block.area * block.floors, 0));
  const estimatedGreen = Math.max(
    0,
    Math.round(siteArea - footprint - parking.areaTotal - roadResult.sidewalkArea - roadResult.roads.reduce((s, r) => s + r.w * r.h, 0)),
  );
  const metrics = {
    siteArea,
    blocks: blocks.length,
    footprint,
    gfa,
    green: estimatedGreen,
    parking: parking.count,
    trees: green.trees,
    k1: (footprint / siteArea).toFixed(3),
    k2: (gfa / siteArea).toFixed(3),
    k3: (estimatedGreen / siteArea).toFixed(2),
    redPolylinesUsed: polys.map((p) => p.index),
  };

  await drawTable(bounds, metrics);
  await drawLabels(bounds, metrics);
  await safeCall("run_command", {
    command: `(command "_.ZOOM" "_W" "${bounds.minX - 35},${bounds.minY - 45}" "${bounds.maxX + 45},${bounds.maxY + 35}") (princ)`,
  });

  fs.writeFileSync(
    "C:/Users/PCZONE.GE/autocad-mcp/current-area-grg-validation.json",
    JSON.stringify(
      {
        drawing: "Drawing1.dwg",
        currentRedCluster: {
          polylinesUsed: polys.map((p) => ({ index: p.index, vertices: p.vertices.length, bbox: p.bbox })),
          bounds,
        },
        metrics,
        validation: {
          noPlotFrameAdded: true,
          blockHeights: "8-12 floors, selected per block label",
          containment: "All primary rectangles are sampled against the current red cluster before drawing.",
          conflictAvoidance: "Building boxes reject overlaps; parking rejects overlaps with buildings and roads.",
          assumption:
            "The current red cluster is treated as the development area because no single active boundary polyline was selected.",
        },
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(
    `[current-grg] done: redPolys=${polys.length} area=${siteArea} blocks=${metrics.blocks} parking=${metrics.parking} K1=${metrics.k1} K2=${metrics.k2} K3=${metrics.k3}`,
  );
}

main().catch((error) => {
  console.error("[current-grg] ERROR:", error.response?.data || error.message);
  process.exit(1);
});
