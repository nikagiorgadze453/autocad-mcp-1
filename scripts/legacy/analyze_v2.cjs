// analyze_v2.cjs — fix wall/door/column detection and add per-bina geometry
const fs = require('fs');
const lines = fs.readFileSync('stage-dump-deep.txt', 'utf8').split(/\r?\n/);
const TARGET = { x: 475275599.4, y: 4621094871.3 };

// reuse parsers
function parsePos(s) { const m = s && s.match(/\(([-\d.eE+]+),([-\d.eE+]+)\)/); return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null; }
function parseBBox(s) { const m = s && s.match(/\(([-\d.eE+]+),([-\d.eE+]+)\)-\(([-\d.eE+]+),([-\d.eE+]+)\)/); return m ? { min:{x:parseFloat(m[1]),y:parseFloat(m[2])}, max:{x:parseFloat(m[3]),y:parseFloat(m[4])} } : null; }
function getLayer(line) { const m = line.match(/layer=(.+?)\s+h=[0-9A-Fa-f]+/); return m ? m[1] : ''; }
function stripMText(raw) {
  return (raw || '').replace(/\\f[^;]*;/g, '').replace(/\\H[^;]*;/g, '')
    .replace(/\\S[^;]*;/g, '').replace(/\\W[^;]*;/g, '').replace(/\\A\d+;/g, '')
    .replace(/\\p[^;]*;/g, '').replace(/\\[a-zA-Z]+;/g, '')
    .replace(/[{}]/g, '').replace(/\|/g, ' ').trim();
}

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
    const a = parseFloat((line.match(/area=([-\d.eE+]+)/) || [, '0'])[1]);
    if (c) circles.push({ layer, c: { x: parseFloat(c[1]), y: parseFloat(c[2]) }, r, area_mm2: a });
  }
  if (line.startsWith('T ')) {
    const ty = line.split(' ')[2];
    const layer = getLayer(line);
    const pos = parsePos((line.match(/pos=\([^)]+\)/) || [''])[0]);
    const txm = line.match(/text="(.*)"\s*$/);
    const stripped = txm ? stripMText(txm[1]) : '';
    if (pos) texts.push({ ty, layer, pos, text: stripped });
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
    const meas = parseFloat((line.match(/meas=([-\d.eE+]+)/) || [, '0'])[1]);
    const tx = (line.match(/text="(.*?)"\s+p10=/) || [, ''])[1];
    const p10 = parsePos((line.match(/p10=\([^)]+\)/) || [''])[0]);
    dims.push({ ty, layer, meas, text: tx, p10 });
  }
}

const isGeoref = p => p && p.x > 1e8;

// ---- bina labels in georef
const binaLabels = texts.filter(t => /bina\s*#/i.test(t.text)).map(t => ({
  ...t, id: parseInt((t.text.match(/#\s*(\d+)/) || [, '0'])[1], 10)
}));
const binasG = binaLabels.filter(b => isGeoref(b.pos));

// ---- nearest helper
function nearest(p, list) {
  let best = null, bd = Infinity;
  for (const it of list) {
    const d = Math.hypot(p.x - it.pos.x, p.y - it.pos.y);
    if (d < bd) { bd = d; best = it; }
  }
  return { item: best, d: bd };
}

// ---- per bina aggregation with proper layer matching
const perBina = {};
for (const b of binasG) perBina[b.id] = {
  bina: b.id, pos: b.pos,
  d_target_m: +(Math.hypot(b.pos.x - TARGET.x, b.pos.y - TARGET.y) / 1000).toFixed(2),
  flat_m2: null, rooms: [],
  // walls: lines on Bearing or A-Wall layers
  wall_lines_count: 0, wall_lines_len_m: 0, wall_polys_perim_m: 0,
  // doors / windows: closed polylines on kar-panjara, Doors layers
  doors: 0, windows: 0,
  // columns: small circles on structural layer
  columns: 0,
  // furniture inserts
  inserts: 0,
  insert_blocks: {},
  // dimension count
  dim_count: 0,
  // bbox of all entities assigned (footprint)
  footprint_bbox: { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity }
};

function expandFootprint(b, x, y) {
  if (x < b.footprint_bbox.minx) b.footprint_bbox.minx = x;
  if (y < b.footprint_bbox.miny) b.footprint_bbox.miny = y;
  if (x > b.footprint_bbox.maxx) b.footprint_bbox.maxx = x;
  if (y > b.footprint_bbox.maxy) b.footprint_bbox.maxy = y;
}

// flat labels
const flatLabels = texts.filter(t => t.layer === 'G-Anno-Nplt_Pen_No__142' && /^[\d.]+\s*m/.test(t.text)).map(t => ({ ...t, m2: parseFloat(t.text) }));
const flatsG = flatLabels.filter(f => isGeoref(f.pos));
for (const f of flatsG) {
  const nb = nearest(f.pos, binasG);
  if (nb.item) perBina[nb.item.id].flat_m2 = f.m2;
}

// room labels (on Pen_No__7 + on New_G-Anno layer if present)
const roomLabels = texts.filter(t =>
  /G-Anno-Nplt_Pen_No__7$/.test(t.layer) && /^[\d.]+\s*m/.test(t.text)
).map(t => ({ ...t, m2: parseFloat(t.text) }));
const newRoomLabels = texts.filter(t =>
  /^New_G-Anno-Nplt_Pen_No__/.test(t.layer) && /^[\d.]+\s*m/.test(t.text)
).map(t => ({ ...t, m2: parseFloat(t.text) }));
const allRooms = roomLabels.concat(newRoomLabels);
const roomsG = allRooms.filter(r => isGeoref(r.pos));
for (const r of roomsG) {
  if (r.m2 < 1) continue; // skip the 0.6 m² wall callouts
  const nb = nearest(r.pos, binasG);
  if (nb.item && nb.d < 8000) perBina[nb.item.id].rooms.push(r.m2);
}

// walls: LINE on Bearing/A-Wall layers
const wallLayerRe = /(Bearing|A-Wall)/i;
const wallLines = linesA.filter(l => wallLayerRe.test(l.layer));
for (const l of wallLines) {
  if (!isGeoref(l.s) && !isGeoref(l.e)) continue;
  const mid = { x: (l.s.x + l.e.x) / 2, y: (l.s.y + l.e.y) / 2 };
  const nb = nearest(mid, binasG);
  if (nb.item && nb.d < 7000) {
    const b = perBina[nb.item.id];
    b.wall_lines_count++;
    b.wall_lines_len_m += l.len / 1000;
    expandFootprint(b, l.s.x, l.s.y);
    expandFootprint(b, l.e.x, l.e.y);
  }
}

// walls polyline perimeters too
const wallPolys = polylines.filter(p => wallLayerRe.test(p.layer) && p.closed && p.bbox);
for (const p of wallPolys) {
  const c = { x: (p.bbox.min.x + p.bbox.max.x) / 2, y: (p.bbox.min.y + p.bbox.max.y) / 2 };
  if (!isGeoref(c)) continue;
  const nb = nearest(c, binasG);
  if (nb.item && nb.d < 7000) {
    perBina[nb.item.id].wall_polys_perim_m += p.perim_mm / 1000;
    expandFootprint(perBina[nb.item.id], p.bbox.min.x, p.bbox.min.y);
    expandFootprint(perBina[nb.item.id], p.bbox.max.x, p.bbox.max.y);
  }
}

// doors: closed polylines on Doors_* or kar-panjara layers
const doorLayerRe = /(Doors|kar-panjara)/i;
const doorPolys = polylines.filter(p => doorLayerRe.test(p.layer) && p.bbox);
for (const p of doorPolys) {
  const c = { x: (p.bbox.min.x + p.bbox.max.x) / 2, y: (p.bbox.min.y + p.bbox.max.y) / 2 };
  if (!isGeoref(c)) continue;
  const nb = nearest(c, binasG);
  if (nb.item && nb.d < 7000) {
    if (/Doors/i.test(p.layer)) perBina[nb.item.id].doors++;
    else perBina[nb.item.id].windows++;
  }
}

// columns: ARC + small CIRCLES on bearing-related layers
const colCircles = circles.filter(c => c.r > 60 && c.r < 100); // r=77 hits
for (const c of colCircles) {
  if (!isGeoref(c.c)) continue;
  const nb = nearest(c.c, binasG);
  if (nb.item && nb.d < 7000) perBina[nb.item.id].columns++;
}

// inserts
for (const ins of inserts.filter(i => isGeoref(i.pos))) {
  const nb = nearest(ins.pos, binasG);
  if (nb.item && nb.d < 7000) {
    const b = perBina[nb.item.id];
    b.inserts++;
    b.insert_blocks[ins.block] = (b.insert_blocks[ins.block] || 0) + 1;
  }
}

// dimensions
for (const d of dims) {
  if (!d.p10 || !isGeoref(d.p10)) continue;
  const nb = nearest(d.p10, binasG);
  if (nb.item && nb.d < 7000) perBina[nb.item.id].dim_count++;
}

// finalise per_bina
for (const b of Object.values(perBina)) {
  b.rooms.sort((a, b) => b - a);
  b.room_total_m2 = +b.rooms.reduce((s, r) => s + r, 0).toFixed(1);
  b.wall_lines_len_m = +b.wall_lines_len_m.toFixed(2);
  b.wall_polys_perim_m = +b.wall_polys_perim_m.toFixed(2);
  if (b.footprint_bbox.minx === Infinity) b.footprint_bbox = null;
  else {
    b.footprint_bbox.size_m = {
      x: +((b.footprint_bbox.maxx - b.footprint_bbox.minx) / 1000).toFixed(2),
      y: +((b.footprint_bbox.maxy - b.footprint_bbox.miny) / 1000).toFixed(2)
    };
  }
}

// ---- detailed dimension analysis: histogram + horizontal vs vertical
const dimMeas = dims.filter(d => d.meas > 0).map(d => d.meas);
dimMeas.sort((a, b) => a - b);
const dimMin = dimMeas[0] || 0;
const dimMax = dimMeas.at(-1) || 0;
const dimMedian = dimMeas[Math.floor(dimMeas.length / 2)] || 0;
const dimMean = dimMeas.reduce((s, x) => s + x, 0) / Math.max(dimMeas.length, 1);

// dimension value histogram bucketed by 100mm
const dimHist = {};
for (const d of dimMeas) {
  const k = Math.round(d / 100) * 100;
  dimHist[k] = (dimHist[k] || 0) + 1;
}
const topDims = Object.entries(dimHist).sort((a, b) => b[1] - a[1]).slice(0, 30);

// ---- door / window total counts, sizes
const doorPolysG = doorPolys.filter(p => p.bbox && isGeoref({ x: (p.bbox.min.x+p.bbox.max.x)/2, y: 0 }));
const windowPolysG = doorPolysG.filter(p => /kar-panjara/i.test(p.layer));
const doorOnlyG = doorPolysG.filter(p => /^Doors/i.test(p.layer));
function bboxSize(p) { return { w: p.bbox.max.x - p.bbox.min.x, h: p.bbox.max.y - p.bbox.min.y }; }
const windowSizes = windowPolysG.map(bboxSize).filter(s => s.w > 200 && s.h > 200 && s.w < 4000 && s.h < 3000);
const doorSizes = doorOnlyG.map(bboxSize).filter(s => s.w > 200 && s.h > 200 && s.w < 2000 && s.h < 3000);

// ---- summary
const out = {
  per_bina: Object.values(perBina).sort((a, b) => a.bina - b.bina),
  totals: {
    flat_total_m2: +Object.values(perBina).reduce((s, b) => s + (b.flat_m2 || 0), 0).toFixed(1),
    wall_lines_m: +Object.values(perBina).reduce((s, b) => s + b.wall_lines_len_m, 0).toFixed(2),
    wall_polys_m: +Object.values(perBina).reduce((s, b) => s + b.wall_polys_perim_m, 0).toFixed(2),
    columns_total: Object.values(perBina).reduce((s, b) => s + b.columns, 0),
    doors_total: Object.values(perBina).reduce((s, b) => s + b.doors, 0),
    windows_total: Object.values(perBina).reduce((s, b) => s + b.windows, 0),
    inserts_total_in_clusters: Object.values(perBina).reduce((s, b) => s + b.inserts, 0),
    dims_total_in_clusters: Object.values(perBina).reduce((s, b) => s + b.dim_count, 0),
    rooms_labelled: Object.values(perBina).reduce((s, b) => s + b.rooms.length, 0)
  },
  dimensions_global: {
    total_dims: dims.length,
    valid_meas: dimMeas.length,
    min_mm: dimMin, max_mm: dimMax,
    median_mm: +dimMedian.toFixed(1), mean_mm: +dimMean.toFixed(1),
    top_value_buckets_mm: Object.fromEntries(topDims)
  },
  doors_windows: {
    door_polys_count_total: doorOnlyG.length,
    window_polys_count_total: windowPolysG.length,
    typical_window_widths_mm: [...new Set(windowSizes.map(s => Math.round(s.w / 50) * 50))].sort((a, b) => a - b),
    typical_window_heights_mm: [...new Set(windowSizes.map(s => Math.round(s.h / 50) * 50))].sort((a, b) => a - b),
    typical_door_widths_mm: [...new Set(doorSizes.map(s => Math.round(s.w / 50) * 50))].sort((a, b) => a - b)
  },
  text_inventory: {
    bina_labels: binasG.map(b => ({ id: b.id, text: b.text })),
    other_labels: [...new Set(texts.filter(t => !/^[\d.]+\s*m/.test(t.text) && !/bina\s*#/i.test(t.text) && t.text.length > 2).map(t => t.text))].slice(0, 50)
  }
};

fs.writeFileSync('stage-report-v2.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
