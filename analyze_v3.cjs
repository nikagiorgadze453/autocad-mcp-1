// analyze_v3.cjs — final corrected analysis
const fs = require('fs');
const lines = fs.readFileSync('stage-dump-deep.txt', 'utf8').split(/\r?\n/);
const TARGET = { x: 475275599.4, y: 4621094871.3 };

function parsePos(s) { const m = s && s.match(/\(([-\d.eE+]+),([-\d.eE+]+)\)/); return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null; }
function parseBBox(s) { const m = s && s.match(/\(([-\d.eE+]+),([-\d.eE+]+)\)-\(([-\d.eE+]+),([-\d.eE+]+)\)/); return m ? { min:{x:parseFloat(m[1]),y:parseFloat(m[2])}, max:{x:parseFloat(m[3]),y:parseFloat(m[4])} } : null; }
function getLayer(line) { const m = line.match(/layer=(.+?)\s+h=[0-9A-Fa-f]+/); return m ? m[1] : ''; }
function stripMText(raw) { return (raw || '').replace(/\\f[^;]*;/g,'').replace(/\\H[^;]*;/g,'').replace(/\\S[^;]*;/g,'').replace(/\\W[^;]*;/g,'').replace(/\\A\d+;/g,'').replace(/\\p[^;]*;/g,'').replace(/\\[a-zA-Z]+;/g,'').replace(/[{}]/g,'').replace(/\|/g,' ').trim(); }

const linesA = [], polylines = [], circles = [], texts = [], inserts = [], dims = [];
for (const line of lines) {
  if (line.startsWith('L ') && line.includes(' LINE ')) {
    const layer = getLayer(line);
    const sM = line.match(/s=\(([-\d.eE+]+),([-\d.eE+]+)\)/);
    const eM = line.match(/e=\(([-\d.eE+]+),([-\d.eE+]+)\)/);
    const len = parseFloat((line.match(/len=([-\d.eE+]+)/) || [, '0'])[1]);
    if (sM && eM) linesA.push({ layer, s: { x: parseFloat(sM[1]), y: parseFloat(sM[2]) }, e: { x: parseFloat(eM[1]), y: parseFloat(eM[2]) }, len });
  }
  if (line.startsWith('P ')) {
    const layer = getLayer(line);
    const closed = /closed=1/.test(line);
    const npts = parseInt((line.match(/npts=(\d+)/) || [, '0'])[1], 10);
    const area_mm2 = parseFloat((line.match(/area=([-\d.eE+]+)/) || [, '0'])[1]);
    const perim_mm = parseFloat((line.match(/perim=([-\d.eE+]+)/) || [, '0'])[1]);
    const bbox = parseBBox(line);
    polylines.push({ layer, closed, npts, area_mm2, perim_mm, bbox });
  }
  if (line.startsWith('C ') && line.includes(' CIRCLE ')) {
    const layer = getLayer(line);
    const c = line.match(/c=\(([-\d.eE+]+),([-\d.eE+]+)\)/);
    const r = parseFloat((line.match(/r=([-\d.eE+]+)/) || [, '0'])[1]);
    if (c) circles.push({ layer, c: { x: parseFloat(c[1]), y: parseFloat(c[2]) }, r });
  }
  if (line.startsWith('T ')) {
    const ty = line.split(' ')[2];
    const layer = getLayer(line);
    const pos = parsePos((line.match(/pos=\([^)]+\)/) || [''])[0]);
    const txm = line.match(/text="(.*)"\s*$/);
    if (pos && txm) texts.push({ ty, layer, pos, text: stripMText(txm[1]) });
  }
  if (line.startsWith('B ')) {
    const layer = getLayer(line);
    const blkM = line.match(/block="([^"]*)"/);
    const pos = parsePos((line.match(/pos=\([^)]+\)/) || [''])[0]);
    if (pos && blkM) inserts.push({ layer, block: blkM[1], pos });
  }
  if (line.startsWith('D ')) {
    const layer = getLayer(line);
    const ty = line.split(' ')[2];
    const meas = parseFloat((line.match(/meas=([-\d.eE+]+)/) || [, '0'])[1]); // metres
    const tx = (line.match(/text="(.*?)"\s+p10=/) || [, ''])[1];
    const p10 = parsePos((line.match(/p10=\([^)]+\)/) || [''])[0]);
    dims.push({ ty, layer, meas, text: tx, p10 });
  }
}

const isGeoref = p => p && p.x > 1e8;

// ---- DIMENSIONS — values in METRES (dimlfac applied)
const dimValuesM = dims.filter(d => d.meas > 0 && isGeoref(d.p10)).map(d => d.meas);
dimValuesM.sort((a, b) => a - b);

function bucketDims(vals, bucketM) {
  const h = {};
  for (const v of vals) {
    const k = (Math.round(v / bucketM) * bucketM).toFixed(1);
    h[k] = (h[k] || 0) + 1;
  }
  return h;
}
const dimHist50 = bucketDims(dimValuesM, 0.05);
const topDimSizes = Object.entries(dimHist50).sort((a, b) => b[1] - a[1]).slice(0, 30);

// classify dim by typical ranges
function classifyDim(m) {
  if (m < 0.30) return '<300mm wall thickness or callout';
  if (m < 0.55) return '300–550mm structural element';
  if (m < 0.95) return '550–950mm door / passage';
  if (m < 1.20) return '950–1200mm wide door / pathway';
  if (m < 1.60) return '1.2–1.6m kitchen window';
  if (m < 2.00) return '1.6–2.0m bedroom window';
  if (m < 2.50) return '2.0–2.5m balcony door';
  if (m < 4.00) return '2.5–4.0m room bay';
  if (m < 6.00) return '4–6m room bay';
  if (m < 10.00) return '6–10m building module';
  return '>10m total dimension';
}
const dimClassHist = {};
for (const v of dimValuesM) {
  const cls = classifyDim(v);
  dimClassHist[cls] = (dimClassHist[cls] || 0) + 1;
}

// ---- WINDOW / DOOR sizes from bounding boxes on respective layers
function bboxSizeMM(p) { return { wmm: p.bbox.max.x - p.bbox.min.x, hmm: p.bbox.max.y - p.bbox.min.y }; }
const winPolys = polylines.filter(p =>
  /kar-panjara/i.test(p.layer) && p.bbox && isGeoref({ x: (p.bbox.min.x+p.bbox.max.x)/2 }));
const doorPolys = polylines.filter(p =>
  /^Doors|^New_Doors/i.test(p.layer) && p.bbox && isGeoref({ x: (p.bbox.min.x+p.bbox.max.x)/2 }));

const winSizes = winPolys.map(bboxSizeMM);
const doorSizes = doorPolys.map(bboxSizeMM);

// histogram of widths bucketed to 100mm, for items that fit "real" door/window dimensions
function widthHist(arr, minMM, maxMM, bucket = 100) {
  const h = {};
  for (const s of arr) {
    const w = Math.max(s.wmm, s.hmm); // long edge = nominal width
    if (w < minMM || w > maxMM) continue;
    const k = Math.round(w / bucket) * bucket;
    h[k] = (h[k] || 0) + 1;
  }
  return h;
}
const winWidthHist = widthHist(winSizes, 600, 4000);
const doorWidthHist = widthHist(doorSizes, 500, 2500);

// ---- BUILDING outlines (Bearing/Wall closed polylines) — pick the two most-significant per bina
const wallLayerRe = /(Bearing|A-Wall|shenobebi)/i;
const wallClosed = polylines.filter(p =>
  wallLayerRe.test(p.layer) && p.closed && p.bbox &&
  isGeoref({ x: (p.bbox.min.x + p.bbox.max.x)/2 }));

// ---- per bina aggregation
const binaLabels = texts.filter(t => /bina\s*#/i.test(t.text)).map(t => ({
  ...t, id: parseInt((t.text.match(/#\s*(\d+)/) || [, '0'])[1], 10)
}));
const binasG = binaLabels.filter(b => isGeoref(b.pos));

function nearest(p, list) {
  let best = null, bd = Infinity;
  for (const it of list) {
    const d = Math.hypot(p.x - it.pos.x, p.y - it.pos.y);
    if (d < bd) { bd = d; best = it; }
  }
  return { item: best, d: bd };
}

const perBina = {};
for (const b of binasG) perBina[b.id] = {
  bina: b.id, pos: b.pos,
  d_target_m: +(Math.hypot(b.pos.x - TARGET.x, b.pos.y - TARGET.y) / 1000).toFixed(2),
  flat_m2: null, rooms: [],
  dim_count: 0, dim_values_m: [],
  windows_logical: 0, doors_logical: 0,
  wall_lines_count: 0, wall_lines_len_m: 0,
  closed_wall_polys: 0, closed_wall_perim_m: 0,
  columns: 0, inserts: 0
};

const flatLabels = texts.filter(t => t.layer === 'G-Anno-Nplt_Pen_No__142' && /^[\d.]+\s*m/.test(t.text)).map(t => ({ ...t, m2: parseFloat(t.text) }));
for (const f of flatLabels.filter(f => isGeoref(f.pos))) {
  const nb = nearest(f.pos, binasG);
  if (nb.item) perBina[nb.item.id].flat_m2 = f.m2;
}
const roomLabels = texts.filter(t => /G-Anno-Nplt_Pen_No__7$|^New_G-Anno-Nplt/.test(t.layer) && /^[\d.]+\s*m/.test(t.text)).map(t => ({ ...t, m2: parseFloat(t.text) }));
for (const r of roomLabels.filter(r => isGeoref(r.pos) && r.m2 >= 1)) {
  const nb = nearest(r.pos, binasG);
  if (nb.item && nb.d < 8000) perBina[nb.item.id].rooms.push(r.m2);
}

// per-bina dimensions
for (const d of dims) {
  if (!d.p10 || !isGeoref(d.p10)) continue;
  const nb = nearest(d.p10, binasG);
  if (nb.item && nb.d < 7000) {
    perBina[nb.item.id].dim_count++;
    perBina[nb.item.id].dim_values_m.push(d.meas);
  }
}

// per-bina windows / doors (count UNIQUE polyline groups by clustering nearby polys)
function clusterPolys(polys) {
  const clusters = [];
  const used = new Array(polys.length).fill(false);
  for (let i = 0; i < polys.length; i++) {
    if (used[i]) continue;
    const cluster = [i];
    const c0 = { x: (polys[i].bbox.min.x + polys[i].bbox.max.x) / 2, y: (polys[i].bbox.min.y + polys[i].bbox.max.y) / 2 };
    used[i] = true;
    for (let j = i + 1; j < polys.length; j++) {
      if (used[j]) continue;
      const cj = { x: (polys[j].bbox.min.x + polys[j].bbox.max.x) / 2, y: (polys[j].bbox.min.y + polys[j].bbox.max.y) / 2 };
      if (Math.hypot(c0.x - cj.x, c0.y - cj.y) < 600) { cluster.push(j); used[j] = true; }
    }
    clusters.push(cluster.map(k => polys[k]));
  }
  return clusters;
}
const winClusters = clusterPolys(winPolys);
const doorClusters = clusterPolys(doorPolys);
for (const cluster of winClusters) {
  const c = { x: cluster.reduce((s, p) => s + (p.bbox.min.x + p.bbox.max.x) / 2, 0) / cluster.length,
              y: cluster.reduce((s, p) => s + (p.bbox.min.y + p.bbox.max.y) / 2, 0) / cluster.length };
  const nb = nearest(c, binasG);
  if (nb.item && nb.d < 7000) perBina[nb.item.id].windows_logical++;
}
for (const cluster of doorClusters) {
  const c = { x: cluster.reduce((s, p) => s + (p.bbox.min.x + p.bbox.max.x) / 2, 0) / cluster.length,
              y: cluster.reduce((s, p) => s + (p.bbox.min.y + p.bbox.max.y) / 2, 0) / cluster.length };
  const nb = nearest(c, binasG);
  if (nb.item && nb.d < 7000) perBina[nb.item.id].doors_logical++;
}

// per-bina wall + columns + inserts
const wallLines = linesA.filter(l => wallLayerRe.test(l.layer));
for (const l of wallLines) {
  if (!isGeoref(l.s) && !isGeoref(l.e)) continue;
  const mid = { x: (l.s.x + l.e.x) / 2, y: (l.s.y + l.e.y) / 2 };
  const nb = nearest(mid, binasG);
  if (nb.item && nb.d < 7000) {
    perBina[nb.item.id].wall_lines_count++;
    perBina[nb.item.id].wall_lines_len_m += l.len / 1000;
  }
}
for (const p of wallClosed) {
  const c = { x: (p.bbox.min.x + p.bbox.max.x) / 2, y: (p.bbox.min.y + p.bbox.max.y) / 2 };
  const nb = nearest(c, binasG);
  if (nb.item && nb.d < 7000) {
    perBina[nb.item.id].closed_wall_polys++;
    perBina[nb.item.id].closed_wall_perim_m += p.perim_mm / 1000;
  }
}
const colCircles = circles.filter(c => c.r > 60 && c.r < 100);
for (const c of colCircles) {
  if (!isGeoref(c.c)) continue;
  const nb = nearest(c.c, binasG);
  if (nb.item && nb.d < 6000) perBina[nb.item.id].columns++;
}
for (const ins of inserts.filter(i => isGeoref(i.pos))) {
  const nb = nearest(ins.pos, binasG);
  if (nb.item && nb.d < 7000) perBina[nb.item.id].inserts++;
}

for (const b of Object.values(perBina)) {
  b.rooms.sort((a,b) => b - a);
  b.room_total_m2 = +b.rooms.reduce((s, r) => s + r, 0).toFixed(1);
  b.dim_min_m = b.dim_values_m.length ? +Math.min(...b.dim_values_m).toFixed(2) : null;
  b.dim_max_m = b.dim_values_m.length ? +Math.max(...b.dim_values_m).toFixed(2) : null;
  b.wall_lines_len_m = +b.wall_lines_len_m.toFixed(2);
  b.closed_wall_perim_m = +b.closed_wall_perim_m.toFixed(2);
  delete b.dim_values_m;
}

const totals = {
  flat_total_m2: +Object.values(perBina).reduce((s, b) => s + (b.flat_m2 || 0), 0).toFixed(1),
  windows_total: Object.values(perBina).reduce((s, b) => s + b.windows_logical, 0),
  doors_total: Object.values(perBina).reduce((s, b) => s + b.doors_logical, 0),
  columns_total: Object.values(perBina).reduce((s, b) => s + b.columns, 0),
  wall_lines_total_m: +Object.values(perBina).reduce((s, b) => s + b.wall_lines_len_m, 0).toFixed(2),
  closed_wall_perim_total_m: +Object.values(perBina).reduce((s, b) => s + b.closed_wall_perim_m, 0).toFixed(2),
  inserts_in_clusters: Object.values(perBina).reduce((s, b) => s + b.inserts, 0)
};

const out = {
  per_bina: Object.values(perBina).sort((a, b) => a.bina - b.bina),
  totals,
  dimensions_global: {
    total: dims.length,
    georef_valid: dimValuesM.length,
    min_m: dimValuesM[0] || 0,
    max_m: dimValuesM.at(-1) || 0,
    median_m: +(dimValuesM[Math.floor(dimValuesM.length / 2)] || 0).toFixed(2),
    top_value_50mm_buckets: Object.fromEntries(topDimSizes),
    classification: dimClassHist
  },
  windows: {
    total_polys_georef: winPolys.length,
    cluster_count_total: winClusters.length,
    width_histogram_100mm: winWidthHist
  },
  doors: {
    total_polys_georef: doorPolys.length,
    cluster_count_total: doorClusters.length,
    width_histogram_100mm: doorWidthHist
  },
  walls_global: {
    line_count_in_bldgs: linesA.filter(l => wallLayerRe.test(l.layer) && (isGeoref(l.s) || isGeoref(l.e))).length,
    line_total_len_m: +(linesA.filter(l => wallLayerRe.test(l.layer) && (isGeoref(l.s) || isGeoref(l.e))).reduce((s, l) => s + l.len, 0) / 1000).toFixed(2),
    closed_poly_count: wallClosed.length,
    closed_poly_total_perim_m: +(wallClosed.reduce((s, p) => s + p.perim_mm, 0) / 1000).toFixed(2),
    closed_poly_total_area_m2: +(wallClosed.reduce((s, p) => s + p.area_mm2, 0) / 1_000_000).toFixed(2)
  }
};

fs.writeFileSync('stage-report-v3.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
