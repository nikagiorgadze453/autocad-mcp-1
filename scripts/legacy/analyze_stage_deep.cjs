// analyze_stage_deep.cjs — exhaustive analysis of stage-dump-deep.txt
const fs = require('fs');
const path = require('path');

const TARGET = { x: 475275599.4, y: 4621094871.3 };
const lines = fs.readFileSync('stage-dump-deep.txt', 'utf8').split(/\r?\n/);

const head = {};
const linesA = [], polylines = [], circles = [], arcs = [],
              texts  = [], inserts = [], dims = [], hatches = [], regions = [], other = [];

function parsePos(s) {
  const m = s && s.match(/\(([-\d.eE+]+),([-\d.eE+]+)\)/);
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null;
}
function parseBBox(s) {
  const m = s && s.match(/\(([-\d.eE+]+),([-\d.eE+]+)\)-\(([-\d.eE+]+),([-\d.eE+]+)\)/);
  return m ? {
    min: { x: parseFloat(m[1]), y: parseFloat(m[2]) },
    max: { x: parseFloat(m[3]), y: parseFloat(m[4]) }
  } : null;
}
function stripMText(raw) {
  return (raw || '')
    .replace(/\\f[^;]*;/g, '')
    .replace(/\\H[^;]*;/g, '')
    .replace(/\\S[^;]*;/g, '')
    .replace(/\\W[^;]*;/g, '')
    .replace(/\\A\d+;/g, '')
    .replace(/\\p[^;]*;/g, '')
    .replace(/\\[a-zA-Z]+;/g, '')
    .replace(/[{}]/g, '')
    .replace(/\\\|/g, '')
    .replace(/\|/g, ' ')
    .trim();
}

// fast field extractors using "key=value" tokens
function getField(line, key) {
  // captures up to next space-letter-equal or end of line
  const re = new RegExp(`\\b${key}=("([^"]*)"|([^\\s]+))`);
  const m = line.match(re);
  if (!m) return null;
  return m[2] != null ? m[2] : m[3];
}
function getLayer(line) {
  // layer ends before " h=" hex token
  const m = line.match(/layer=(.+?)\s+h=[0-9A-Fa-f]+/);
  return m ? m[1] : '';
}

for (const line of lines) {
  if (line.startsWith('DWG=')) head.dwg = line.slice(4);
  else if (line.startsWith('INSUNITS=')) head.insunits = line.slice(9);
  else if (line.startsWith('EXTMIN=')) head.extmin = line.slice(7);
  else if (line.startsWith('EXTMAX=')) head.extmax = line.slice(7);
  else if (line.startsWith('TOTAL=')) head.total = parseInt(line.slice(6), 10);

  // L i LINE layer=... h=... s=(x,y) e=(x,y) len=...
  if (line.startsWith('L ') && line.includes(' LINE ')) {
    const layer = getLayer(line);
    const sMatch = line.match(/s=\(([-\d.eE+]+),([-\d.eE+]+)\)/);
    const eMatch = line.match(/e=\(([-\d.eE+]+),([-\d.eE+]+)\)/);
    const lenMatch = line.match(/len=([-\d.eE+]+)/);
    if (sMatch && eMatch) {
      linesA.push({
        layer,
        s: { x: parseFloat(sMatch[1]), y: parseFloat(sMatch[2]) },
        e: { x: parseFloat(eMatch[1]), y: parseFloat(eMatch[2]) },
        len: lenMatch ? parseFloat(lenMatch[1]) : 0
      });
    }
  }
  // P i LWPOLYLINE layer=... closed=0/1 npts=N area=A perim=P bbox=(x,y)-(x,y)
  if (line.startsWith('P ')) {
    const layer = getLayer(line);
    const closed = /closed=1/.test(line);
    const np = (line.match(/npts=(\d+)/) || [, 0])[1];
    const am = (line.match(/area=([-\d.eE+]+)/) || [, 0])[1];
    const pm = (line.match(/perim=([-\d.eE+]+)/) || [, 0])[1];
    const bb = parseBBox(line);
    polylines.push({
      layer, closed,
      npts: parseInt(np, 10),
      area_mm2: parseFloat(am),
      perim_mm: parseFloat(pm),
      bbox: bb
    });
  }
  // C i CIRCLE layer=... c=(x,y) r=R area=A
  if (line.startsWith('C ') && line.includes(' CIRCLE ')) {
    const layer = getLayer(line);
    const c = (line.match(/c=\(([-\d.eE+]+),([-\d.eE+]+)\)/));
    const r = (line.match(/r=([-\d.eE+]+)/) || [, 0])[1];
    const a = (line.match(/area=([-\d.eE+]+)/) || [, 0])[1];
    if (c) circles.push({
      layer,
      c: { x: parseFloat(c[1]), y: parseFloat(c[2]) },
      r: parseFloat(r),
      area_mm2: parseFloat(a)
    });
  }
  // A i ARC layer=... c=(x,y) r=R a1=... a2=...
  if (line.startsWith('A ') && line.includes(' ARC ')) {
    const layer = getLayer(line);
    const c = line.match(/c=\(([-\d.eE+]+),([-\d.eE+]+)\)/);
    const r = (line.match(/r=([-\d.eE+]+)/) || [, 0])[1];
    if (c) arcs.push({
      layer, c: { x: parseFloat(c[1]), y: parseFloat(c[2]) }, r: parseFloat(r)
    });
  }
  // T i TEXT|MTEXT layer=... pos=(...) hgt=... text="..."
  if (line.startsWith('T ')) {
    const ty = line.split(' ')[2];
    const layer = getLayer(line);
    const pos = parsePos((line.match(/pos=([^\s]+)/) || [, ''])[1]);
    const hg = parseFloat((line.match(/hgt=([-\d.eE+]+)/) || [, '0'])[1]);
    const txm = line.match(/text="(.*)"\s*$/);
    const raw = txm ? txm[1] : '';
    const stripped = stripMText(raw);
    if (pos) texts.push({ ty, layer, pos, height: hg, text: stripped, raw });
  }
  // B i INSERT layer=... block="..." pos=(...) sx= sy= rot=
  if (line.startsWith('B ')) {
    const layer = getLayer(line);
    const blkM = line.match(/block="([^"]*)"/);
    const pos = parsePos((line.match(/pos=\([^)]+\)/) || [''])[0]);
    const sx = parseFloat((line.match(/sx=([-\d.eE+]+)/) || [, '1'])[1]);
    const sy = parseFloat((line.match(/sy=([-\d.eE+]+)/) || [, '1'])[1]);
    const rot = parseFloat((line.match(/rot=([-\d.eE+]+)/) || [, '0'])[1]);
    if (pos && blkM) inserts.push({ layer, block: blkM[1], pos, sx, sy, rot });
  }
  // D i DIMENSION layer=... meas=... text="..."
  if (line.startsWith('D ')) {
    const layer = getLayer(line);
    const ty = line.split(' ')[2];
    const meas = parseFloat((line.match(/meas=([-\d.eE+]+)/) || [, '0'])[1]);
    const tx = (line.match(/text="(.*?)"\s+p10=/) || [, ''])[1];
    const p10 = parsePos((line.match(/p10=\([^)]+\)/) || [''])[0]);
    const p13 = parsePos((line.match(/p13=\([^)]+\)/) || [''])[0]);
    const p14 = parsePos((line.match(/p14=\([^)]+\)/) || [''])[0]);
    dims.push({ ty, layer, meas, text: tx, p10, p13, p14 });
  }
  if (line.startsWith('H ')) {
    const layer = getLayer(line);
    const a = parseFloat((line.match(/area=([-\d.eE+]+)/) || [, '0'])[1]);
    hatches.push({ layer, area_mm2: a || 0 });
  }
  if (line.startsWith('R ')) {
    const layer = getLayer(line);
    const a = parseFloat((line.match(/area=([-\d.eE+]+)/) || [, '0'])[1]);
    regions.push({ layer, area_mm2: a || 0 });
  }
}

// ---- normalise positions: file has both local (~100k mm) and georef
// (~475M mm) copies. Treat anything with x>1e8 as 'georef', else 'local'.
const isGeoref = p => p && p.x > 1e8;

// ---- master classification
const flatLabels = texts.filter(t => t.layer === 'G-Anno-Nplt_Pen_No__142' && /^[\d.]+\s*m/.test(t.text)).map(t => ({
  ...t, m2: parseFloat(t.text)
}));
const roomLabels = texts.filter(t => t.layer === 'G-Anno-Nplt_Pen_No__7' && /^[\d.]+\s*m/.test(t.text)).map(t => ({
  ...t, m2: parseFloat(t.text)
}));
const binaLabels = texts.filter(t => /bina\s*#/.test(t.text)).map(t => ({
  ...t, id: parseInt((t.text.match(/#\s*(\d+)/) || [, '0'])[1], 10)
}));

// ---- per bina assignment of nearby flat-area labels (georef copy only)
const binasG = binaLabels.filter(b => isGeoref(b.pos));
const flatsG = flatLabels.filter(f => isGeoref(f.pos));
const roomsG = roomLabels.filter(r => isGeoref(r.pos));

function nearest(label, list) {
  let best = null, bd = Infinity;
  for (const it of list) {
    const d = Math.hypot(label.pos.x - it.pos.x, label.pos.y - it.pos.y);
    if (d < bd) { bd = d; best = it; }
  }
  return { item: best, d: bd };
}

// flat-label -> nearest bina
const flatToBina = flatsG.map(f => {
  const nb = nearest(f, binasG);
  return { flat: f.m2, pos: f.pos, bina: nb.item ? nb.item.id : null, d_mm: nb.d };
}).sort((a, b) => a.bina - b.bina);

// room-label -> nearest bina
const roomToBina = roomsG.map(r => {
  const nb = nearest(r, binasG);
  return { room: r.m2, pos: r.pos, bina: nb.item ? nb.item.id : null, d_mm: nb.d };
});

// ---- per bina aggregations
const perBina = {};
for (const b of binasG) {
  perBina[b.id] = {
    bina: b.id, pos: b.pos,
    distance_to_target_m: +(Math.hypot(b.pos.x - TARGET.x, b.pos.y - TARGET.y) / 1000).toFixed(2),
    flat_m2: null, room_areas_m2: [],
    inserts: [], wall_len_mm: 0, columns: 0
  };
}
for (const fb of flatToBina) if (perBina[fb.bina]) perBina[fb.bina].flat_m2 = fb.flat;
for (const rb of roomToBina) if (perBina[rb.bina] && rb.d_mm < 8000)
  perBina[rb.bina].room_areas_m2.push(rb.room);

// inserts and walls per bina (assign to nearest bina)
const insertsG = inserts.filter(ins => isGeoref(ins.pos));
for (const ins of insertsG) {
  const nb = nearest({ pos: ins.pos }, binasG);
  if (nb.item && nb.d < 8000) {
    perBina[nb.item.id].inserts.push({ block: ins.block, layer: ins.layer });
  }
}
// walls = LINE entities on layers containing 'A-Wall' or 'WALL'
const wallLayers = new Set();
for (const ln of linesA) {
  if (/wall/i.test(ln.layer)) wallLayers.add(ln.layer);
}
const wallLines = linesA.filter(ln => /wall/i.test(ln.layer));
for (const ln of wallLines) {
  if (!isGeoref(ln.s) && !isGeoref(ln.e)) continue;
  const mid = { x: (ln.s.x + ln.e.x) / 2, y: (ln.s.y + ln.e.y) / 2 };
  const nb = nearest({ pos: mid }, binasG);
  if (nb.item && nb.d < 8000) {
    perBina[nb.item.id].wall_len_mm += ln.len;
  }
}
// columns = small CIRCLEs (r ≈ 40 or 75 mm) on the structural-circle layer
const colCircles = circles.filter(c => /Pen_No__1_Pen_No__7/.test(c.layer) && c.r >= 35 && c.r <= 80 && isGeoref(c.c));
for (const c of colCircles) {
  const nb = nearest({ pos: c.c }, binasG);
  if (nb.item && nb.d < 6000) {
    perBina[nb.item.id].columns++;
  }
}

// ---- door/window inserts (block name patterns)
const doorPattern = /door|kar|porta/i;
const windowPattern = /window|panjar|panjara|fanjar/i;
const doorInserts = inserts.filter(i => doorPattern.test(i.block) || doorPattern.test(i.layer));
const windowInserts = inserts.filter(i => windowPattern.test(i.block) || windowPattern.test(i.layer));

// ---- block-name catalog
const blockHist = new Map();
for (const ins of inserts) blockHist.set(ins.block, (blockHist.get(ins.block) || 0) + 1);

// ---- layer histogram (entities per layer)
const layerHist = new Map();
for (const arr of [linesA, polylines, circles, arcs, texts, inserts, dims, hatches, regions]) {
  for (const it of arr) layerHist.set(it.layer, (layerHist.get(it.layer) || 0) + 1);
}

// ---- closed polyline area by layer (mm² → m²)
const polyAreaByLayer = new Map();
for (const p of polylines) {
  if (!p.closed || !p.bbox) continue;
  polyAreaByLayer.set(p.layer, (polyAreaByLayer.get(p.layer) || 0) + p.area_mm2);
}

// ---- dimension chains: histogram of measurements
const dimHist = {};
for (const d of dims) {
  if (!d.meas || d.meas <= 0) continue;
  const k = Math.round(d.meas / 100) * 100; // bucket to 100mm
  dimHist[k] = (dimHist[k] || 0) + 1;
}

// ---- georg text samples
const georgianTexts = texts.filter(t => /[\u10A0-\u10FF]/.test(t.text));
const transliteratedTexts = texts.filter(t =>
  /\b(bina|warmosaxviTi|mijna|gegma|farTi|sartuli|bedroom|kveda)\b/i.test(t.text)
);

// ---- summary output
const out = {
  drawing: {
    file: head.dwg, units: 'mm (INSUNITS=4)',
    extmin: head.extmin, extmax: head.extmax, total_entities: head.total
  },
  target_coord: TARGET,
  global: {
    lines: linesA.length,
    polylines_total: polylines.length,
    polylines_closed: polylines.filter(p => p.closed).length,
    circles: circles.length,
    arcs: arcs.length,
    texts: texts.length,
    inserts: inserts.length,
    dims: dims.length,
    hatches: hatches.length,
    regions: regions.length
  },
  flats: {
    count_unique_per_copy: flatsG.length,
    items_georef_only: flatToBina,
    sum_m2_per_copy: +flatToBina.reduce((s, f) => s + f.flat, 0).toFixed(2)
  },
  per_bina: Object.values(perBina).map(b => ({
    bina: b.bina,
    distance_to_target_m: b.distance_to_target_m,
    flat_m2: b.flat_m2,
    room_count_labelled: b.room_areas_m2.length,
    room_sum_m2: +b.room_areas_m2.reduce((s, r) => s + r, 0).toFixed(2),
    rooms: b.room_areas_m2.sort((x, y) => y - x),
    wall_total_len_mm: +b.wall_len_mm.toFixed(0),
    wall_total_len_m: +(b.wall_len_mm / 1000).toFixed(2),
    columns: b.columns,
    insert_count: b.inserts.length,
    insert_blocks: b.inserts.reduce((h, i) => { h[i.block] = (h[i.block] || 0) + 1; return h; }, {})
  })).sort((a, b) => a.bina - b.bina),
  rooms: {
    histogram_per_copy: roomsG.reduce((h, r) => { const k = r.m2.toFixed(1); h[k] = (h[k] || 0) + 1; return h; }, {}),
    total_per_copy: roomsG.length,
    sum_m2_per_copy: +roomsG.reduce((s, r) => s + r.m2, 0).toFixed(2)
  },
  doors_windows: {
    door_inserts: doorInserts.length,
    window_inserts: windowInserts.length,
    door_blocks: [...new Set(doorInserts.map(i => i.block))],
    window_blocks: [...new Set(windowInserts.map(i => i.block))]
  },
  walls: {
    wall_layers: [...wallLayers],
    wall_line_count: wallLines.length,
    wall_total_length_m: +(wallLines.reduce((s, l) => s + l.len, 0) / 1000).toFixed(2),
    wall_total_length_m_georef_only: +(wallLines.filter(l => isGeoref(l.s) || isGeoref(l.e))
      .reduce((s, l) => s + l.len, 0) / 1000).toFixed(2)
  },
  structural_grid: {
    column_layers: [...new Set(circles.map(c => c.layer))],
    columns_in_georef: colCircles.length,
    columns_local_copy: circles.filter(c => /Pen_No__1_Pen_No__7/.test(c.layer) && c.r >= 35 && c.r <= 80 && !isGeoref(c.c)).length,
    radius_histogram: circles.reduce((h, c) => { const k = c.r.toFixed(0); h[k] = (h[k] || 0) + 1; return h; }, {})
  },
  dimensions: {
    total: dims.length,
    measurement_histogram_top: Object.fromEntries(
      Object.entries(dimHist).sort((a, b) => b[1] - a[1]).slice(0, 30)
    )
  },
  layers_top_by_entity_count: Object.fromEntries(
    [...layerHist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50)
  ),
  closed_polyline_area_by_layer_m2: Object.fromEntries(
    [...polyAreaByLayer.entries()].map(([k, v]) => [k, +(v / 1_000_000).toFixed(2)])
      .sort((a, b) => b[1] - a[1]).slice(0, 30)
  ),
  blocks_by_count: Object.fromEntries([...blockHist.entries()].sort((a, b) => b[1] - a[1])),
  text_samples: {
    georgian: georgianTexts.slice(0, 20).map(t => t.text),
    transliterated: [...new Set(transliteratedTexts.map(t => t.text))].slice(0, 30)
  }
};

fs.writeFileSync('stage-report-deep.json', JSON.stringify(out, null, 2));
// short summary to stdout
console.log(JSON.stringify({
  global: out.global,
  per_bina_short: out.per_bina.map(b => ({
    bina: b.bina, flat: b.flat_m2, dist: b.distance_to_target_m,
    rooms: b.rooms, wall_m: b.wall_total_len_m, cols: b.columns, inserts: b.insert_count
  })),
  walls: out.walls,
  structural_grid: out.structural_grid,
  dims_total: out.dimensions.total,
  doors_windows: out.doors_windows,
  closed_poly_top10_layers_m2: Object.fromEntries(
    Object.entries(out.closed_polyline_area_by_layer_m2).slice(0, 10)
  ),
  layers_top10: Object.fromEntries(Object.entries(out.layers_top_by_entity_count).slice(0, 10)),
  text_samples: out.text_samples
}, null, 2));
