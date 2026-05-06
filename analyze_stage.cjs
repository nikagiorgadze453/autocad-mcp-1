// analyze_stage.cjs
// Parse stage-dump.txt and produce a per-flat / per-room m² report.
//
// Convention observed in the dump:
//   Layer G-Anno-Nplt_Pen_No__142 (cyan)  -> FLAT TOTAL m²  (e.g. 85.6 m²)
//   Layer G-Anno-Nplt_Pen_No__7   (white) -> ROOM m²         (e.g. 12.1 m²)
//   Layer G-Anno-Nplt_Pen_No__151          -> hatch only (no text)
// MText is wrapped: {\fArial|b0|i0|c204|p0;XX.X m{\H0.66x;\S2^ ;}}
// We extract the leading number, the layer, and the position.

const fs = require('fs');
const path = require('path');

const dumpPath = path.join(__dirname, 'stage-dump.txt');
const lines = fs.readFileSync(dumpPath, 'utf8').split(/\r?\n/);

const head = {
  dwg: '', insunits: '', extmin: '', extmax: '', total: 0
};
const TARGET = { x: 475275599.4, y: 4621094871.3 }; // user-supplied coord

const mtexts = [];
const inserts = [];
const polylineAreas = [];

for (const line of lines) {
  if (line.startsWith('DWG=')) head.dwg = line.slice(4);
  else if (line.startsWith('INSUNITS=')) head.insunits = line.slice(9);
  else if (line.startsWith('EXTMIN=')) head.extmin = line.slice(7);
  else if (line.startsWith('EXTMAX=')) head.extmax = line.slice(7);
  else if (line.startsWith('TOTAL=')) head.total = parseInt(line.slice(6), 10);

  // T 6044 MTEXT layer=G-Anno-Nplt_Pen_No__7 h=52A5 pos=(126750.878,68961.476) text="..."
  if (line.startsWith('T ') && /MTEXT|TEXT/.test(line)) {
    const layerMatch = line.match(/layer=([^\s]+(?:\s+[^\s=]+)*?)\s+h=/);
    const handleMatch = line.match(/h=([0-9A-Fa-f]+)/);
    const posMatch = line.match(/pos=\(([-\d.eE+]+),([-\d.eE+]+)\)/);
    const textMatch = line.match(/text="(.*)"\s*$/);
    if (!textMatch || !posMatch) continue;
    const raw = textMatch[1];
    // strip MText formatting; pull the first numeric value
    const stripped = raw
      .replace(/\\f[^;]*;/g, '')
      .replace(/\\H[^;]*;/g, '')
      .replace(/\\S[^;]*;/g, '')
      .replace(/\\W[^;]*;/g, '')
      .replace(/\\A\d+;/g, '')
      .replace(/\\p[^;]*;/g, '')
      .replace(/\\[a-zA-Z]+;/g, '')
      .replace(/[{}]/g, '')
      .replace(/\\\|/g, '')
      .replace(/\|/g, '');
    const m2Match = stripped.match(/(-?\d+(?:[.,]\d+)?)\s*m/);
    const num = m2Match ? parseFloat(m2Match[1].replace(',', '.')) : null;
    mtexts.push({
      layer: layerMatch ? layerMatch[1] : '',
      handle: handleMatch ? handleMatch[1] : '',
      pos: { x: parseFloat(posMatch[1]), y: parseFloat(posMatch[2]) },
      text: stripped.trim(),
      num
    });
  }

  // B 6029 INSERT layer=... h=... block=Kitchen Layout 26_8 pos=(...,...)
  if (line.startsWith('B ') && line.includes('INSERT')) {
    const layerMatch = line.match(/layer=(.+?)\s+h=/);
    const blockMatch = line.match(/block=(.+?)\s+pos=/);
    const posMatch = line.match(/pos=\(([-\d.eE+]+),([-\d.eE+]+)\)/);
    if (posMatch) {
      inserts.push({
        layer: layerMatch ? layerMatch[1] : '',
        block: blockMatch ? blockMatch[1].trim() : '',
        pos: { x: parseFloat(posMatch[1]), y: parseFloat(posMatch[2]) }
      });
    }
  }

  // P 5904 LWPOLYLINE layer=... h=... closed=1 area=12345.6 perim=...
  if (line.startsWith('P ') && line.includes('LWPOLYLINE')) {
    const layerMatch = line.match(/layer=(.+?)\s+h=/);
    const closedMatch = line.match(/closed=([01])/);
    const areaMatch = line.match(/area=([-\d.eE+]+)/);
    if (closedMatch && closedMatch[1] === '1' && areaMatch) {
      polylineAreas.push({
        layer: layerMatch ? layerMatch[1] : '',
        area_mm2: parseFloat(areaMatch[1])
      });
    }
  }
}

// --- Filter out the small annotation labels (0.6 m, 3.6 m etc are window/door
// thickness callouts, not flats). Real apartment-size labels live on
// G-Anno-Nplt_Pen_No__142 ; room labels on G-Anno-Nplt_Pen_No__7.
const flatLayer = 'G-Anno-Nplt_Pen_No__142';
const roomLayer = 'G-Anno-Nplt_Pen_No__7';

const flats = mtexts.filter(m => m.layer === flatLayer && m.num != null && m.num > 20);
const rooms = mtexts.filter(m => m.layer === roomLayer && m.num != null && m.num > 0);

// Sort flats by Y descending then X ascending (top-left to bottom-right)
flats.sort((a, b) => b.pos.y - a.pos.y || a.pos.x - b.pos.x);

// Group flats by approximate row (Y bucket of 8 m = 8000 mm)
function groupByRow(items, bucket = 8000) {
  const rows = [];
  for (const it of items) {
    let added = false;
    for (const row of rows) {
      if (Math.abs(row[0].pos.y - it.pos.y) < bucket) { row.push(it); added = true; break; }
    }
    if (!added) rows.push([it]);
  }
  rows.forEach(r => r.sort((a, b) => a.pos.x - b.pos.x));
  return rows;
}
const flatRows = groupByRow(flats);

const totalFlatM2 = flats.reduce((s, f) => s + f.num, 0);
const totalRoomM2 = rooms.reduce((s, r) => s + r.num, 0);

// --- Distance from each flat label to the user's target coord (UTM mm)
const inserts_kitchen = inserts.filter(i => /Kitchen/i.test(i.block));
const inserts_dining  = inserts.filter(i => /Dining/i.test(i.block));
const inserts_other   = inserts.filter(i => !/Kitchen|Dining/i.test(i.block));

// --- Block usage
const blockCount = new Map();
for (const ins of inserts) blockCount.set(ins.block, (blockCount.get(ins.block) || 0) + 1);
const blockSummary = [...blockCount.entries()].sort((a,b) => b[1] - a[1]);

// --- Layer area
const layerArea = new Map();
for (const p of polylineAreas) layerArea.set(p.layer, (layerArea.get(p.layer) || 0) + p.area_mm2);

const out = {
  drawing: head,
  target_coord: TARGET,
  flat_totals: {
    count: flats.length,
    grand_total_m2: +totalFlatM2.toFixed(2),
    items: flats.map(f => ({
      m2: f.num,
      pos: { x: +f.pos.x.toFixed(1), y: +f.pos.y.toFixed(1) },
      handle: f.handle
    }))
  },
  flat_rows: flatRows.map((row, idx) => ({
    row: idx + 1,
    y_avg_mm: +(row.reduce((s, r) => s + r.pos.y, 0) / row.length).toFixed(0),
    flats: row.map(r => r.num),
    sum_m2: +row.reduce((s, r) => s + r.num, 0).toFixed(2)
  })),
  rooms: {
    count: rooms.length,
    grand_total_m2: +totalRoomM2.toFixed(2),
    histogram: rooms.reduce((h, r) => { const k = r.num.toFixed(1); h[k] = (h[k] || 0) + 1; return h; }, {})
  },
  inserts: {
    total: inserts.length,
    kitchens: inserts_kitchen.length,
    dining: inserts_dining.length,
    other: inserts_other.length,
    by_block: Object.fromEntries(blockSummary)
  },
  closed_polylines: {
    count: polylineAreas.length,
    sum_area_m2: +(polylineAreas.reduce((s, p) => s + p.area_mm2, 0) / 1_000_000).toFixed(1),
    by_layer_m2: Object.fromEntries(
      [...layerArea.entries()]
        .map(([k, v]) => [k, +(v / 1_000_000).toFixed(1)])
        .sort((a, b) => b[1] - a[1])
    )
  }
};

console.log(JSON.stringify(out, null, 2));
fs.writeFileSync(path.join(__dirname, 'stage-report.json'), JSON.stringify(out, null, 2));
