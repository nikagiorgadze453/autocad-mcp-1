#!/usr/bin/env node
// scripts/python/summarize_uni_dumps.js
// Reads C:/Users/PCZONE.GE/Downloads/UNI *.uni-dump.json and produces a
// distilled office knowledge file at memory/uni-reference-extract.json.
//
// Usage: node scripts/python/summarize_uni_dumps.js

import fs from 'fs';
import path from 'path';

const DOWNLOADS = 'C:/Users/PCZONE.GE/Downloads';
const OUT_PATH  = 'C:/Users/PCZONE.GE/autocad-mcp/memory/uni-reference-extract.json';
const MD_OUT    = 'C:/Users/PCZONE.GE/autocad-mcp/memory/uni-reference-extract.md';

const files = fs.readdirSync(DOWNLOADS)
  .filter(f => /^UNI .*\.uni-dump\.json$/i.test(f))
  .sort();

function dropNulls(arr) {
  return (arr || []).filter(x => x !== null);
}

function parseDump(filename) {
  let raw = fs.readFileSync(path.join(DOWNLOADS, filename), 'utf8');

  // AutoCAD encodes Unicode (Georgian) in DXF strings as the literal
  // sequence "\U+XXXX". JSON sees "\U" as an invalid escape, so convert
  // these to real Unicode characters BEFORE parsing.
  raw = raw.replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)));

  // The LISP json-esc already doubles literal "\" -> "\\", which JSON
  // accepts as one backslash. Do NOT add further escaping — we'd just
  // re-break valid pairs.

  return JSON.parse(raw);
}

function fmt(n, p = 2) {
  if (n === undefined || n === null || isNaN(n)) return 'n/a';
  return Number(n).toFixed(p);
}

const result = {
  generated_at: new Date().toISOString(),
  files: [],
  aggregate: {
    layer_universe: {},
    block_universe: {},
    style_universe: {},
    insunits_seen: new Set(),
  }
};

for (const f of files) {
  const d = parseDump(f);
  const stem = f.replace(/\.uni-dump\.json$/i, '');

  const layers = dropNulls(d.layers);
  const blocks = dropNulls(d.blocks);
  const styles = dropNulls(d.styles);
  const counts = dropNulls(d.entity_counts);
  const polys  = dropNulls(d.closed_polys);
  const texts  = dropNulls(d.texts);
  const inserts = dropNulls(d.inserts);
  const dims   = dropNulls(d.dimensions);

  const min = d.extents_min || [0,0,0];
  const max = d.extents_max || [0,0,0];
  const widthMm  = Math.abs(max[0] - min[0]);
  const heightMm = Math.abs(max[1] - min[1]);

  // closed polylines on WALL-like layers as room candidates
  const wallRooms = polys.filter(p =>
    /A-Wall|wall|kedeli|WALL/i.test(p.layer) === false);
  // (filter: NOT walls, i.e. room footprints)

  // top closed polyline areas by descending area
  const polysSorted = [...polys].sort((a,b) => (b.area_mm2||0) - (a.area_mm2||0));
  const top = polysSorted.slice(0, 12).map(p => ({
    layer: p.layer,
    area_m2: +(p.area_mm2 / 1e6).toFixed(2),
  }));

  // total m² of top non-tiny closed polys (rough "rooms" sum, deduped by layer)
  const grossM2 = +(polysSorted
    .filter(p => p.area_mm2 > 1e6)        // > 1 m²
    .reduce((acc, p) => acc + p.area_mm2, 0) / 1e6).toFixed(2);

  // dimensions seen in mm (round to 50mm bins)
  const dimValues = dims
    .map(x => x.measurement)
    .filter(x => x && x > 50)
    .map(x => Math.round(x / 50) * 50);
  const dimHist = {};
  for (const v of dimValues) dimHist[v] = (dimHist[v] || 0) + 1;
  const topDims = Object.entries(dimHist)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 10)
    .map(([mm, n]) => ({ mm: +mm, count: n }));

  // text samples — Georgian content if present
  const ge = (s) => /[\u10A0-\u10FF]/.test(s);
  const georgianTexts = texts
    .map(t => t.text || '')
    .filter(ge)
    .slice(0, 20);

  const summary = {
    file: stem,
    units_insunits: d.units_insunits,
    extents: {
      min, max,
      width_mm: +widthMm.toFixed(0),
      height_mm: +heightMm.toFixed(0),
    },
    layer_count: layers.length,
    layers: layers.map(l => l.name),
    block_count: blocks.length,
    blocks: blocks,
    style_count: styles.length,
    styles: styles,
    entity_count_total: counts.reduce((a,b) => a + (b.count||0), 0),
    entity_counts_top: counts
      .sort((a,b) => b.count - a.count)
      .slice(0, 15),
    closed_polyline_count: polys.length,
    closed_polyline_top_m2: top,
    closed_polyline_total_m2_above_1m2: grossM2,
    dimension_count: dims.length,
    dimension_top_values_mm: topDims,
    text_count: texts.length,
    georgian_text_samples: georgianTexts,
    insert_count: inserts.length,
    insert_block_top: (() => {
      const m = {};
      for (const i of inserts) m[i.name] = (m[i.name]||0) + 1;
      return Object.entries(m)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 15)
        .map(([n,c]) => ({ name: n, count: c }));
    })(),
  };

  // accumulate
  for (const l of layers)
    result.aggregate.layer_universe[l.name] = (result.aggregate.layer_universe[l.name]||0)+1;
  for (const b of blocks)
    result.aggregate.block_universe[b] = (result.aggregate.block_universe[b]||0)+1;
  for (const s of styles)
    result.aggregate.style_universe[s.name] = (result.aggregate.style_universe[s.name]||0)+1;
  result.aggregate.insunits_seen.add(d.units_insunits);

  result.files.push(summary);
}

// finalize aggregates
result.aggregate.insunits_seen = Array.from(result.aggregate.insunits_seen);

// sort universes by frequency desc
function sortMap(m) {
  return Object.entries(m).sort((a,b)=>b[1]-a[1]).reduce((o,[k,v])=>{o[k]=v;return o;},{});
}
result.aggregate.layer_universe = sortMap(result.aggregate.layer_universe);
result.aggregate.block_universe = sortMap(result.aggregate.block_universe);
result.aggregate.style_universe = sortMap(result.aggregate.style_universe);

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));

// Markdown
const md = [];
md.push('# UNI reference extract');
md.push('');
md.push(`Generated: ${result.generated_at}`);
md.push('');
md.push('## Files');
md.push('');
md.push('| File | INSUNITS | Width (m) | Height (m) | Layers | Blocks | Entities | Closed polys | Σ m² (>1) | Dim count |');
md.push('|---|---|---|---|---|---|---|---|---|---|');
for (const f of result.files) {
  md.push(`| ${f.file} | ${f.units_insunits} | ${(f.extents.width_mm/1000).toFixed(2)} | ${(f.extents.height_mm/1000).toFixed(2)} | ${f.layer_count} | ${f.block_count} | ${f.entity_count_total} | ${f.closed_polyline_count} | ${f.closed_polyline_total_m2_above_1m2} | ${f.dimension_count} |`);
}
md.push('');
md.push('## Office-wide layer universe (count = files where layer appears)');
md.push('');
md.push('| Layer | In N files |');
md.push('|---|---|');
for (const [k,v] of Object.entries(result.aggregate.layer_universe).slice(0,40)) {
  md.push(`| \`${k}\` | ${v} |`);
}
md.push('');
md.push('## Per-file detail');
md.push('');
for (const f of result.files) {
  md.push(`### ${f.file}`);
  md.push('');
  md.push(`- Extents: ${(f.extents.width_mm/1000).toFixed(2)} m x ${(f.extents.height_mm/1000).toFixed(2)} m`);
  md.push(`- Layers (${f.layer_count}): ${f.layers.slice(0,20).map(l=>'`'+l+'`').join(', ')}${f.layers.length>20?', ...':''}`);
  md.push(`- Styles: ${f.styles.map(s => `${s.name} -> ${s.font || '(default)'}`).join(', ')}`);
  md.push('');
  md.push(`**Top entity counts:**`);
  md.push('');
  md.push('| Kind | Layer | Count |');
  md.push('|---|---|---|');
  for (const c of f.entity_counts_top.slice(0,10)) {
    md.push(`| ${c.kind} | \`${c.layer}\` | ${c.count} |`);
  }
  md.push('');
  if (f.closed_polyline_top_m2.length) {
    md.push(`**Top closed polylines by m²:**`);
    md.push('');
    md.push('| Layer | m² |');
    md.push('|---|---|');
    for (const p of f.closed_polyline_top_m2) {
      md.push(`| \`${p.layer}\` | ${p.area_m2} |`);
    }
    md.push('');
  }
  if (f.dimension_top_values_mm.length) {
    md.push(`**Most frequent dimensions (50 mm bins):**`);
    md.push('');
    md.push('| Value (mm) | Count |');
    md.push('|---|---|');
    for (const d of f.dimension_top_values_mm) {
      md.push(`| ${d.mm} | ${d.count} |`);
    }
    md.push('');
  }
  if (f.georgian_text_samples.length) {
    md.push(`**Georgian text samples:**`);
    md.push('');
    for (const t of f.georgian_text_samples.slice(0,10)) {
      md.push(`- ${t.replace(/\s+/g,' ').slice(0,120)}`);
    }
    md.push('');
  }
  md.push('---');
  md.push('');
}

fs.writeFileSync(MD_OUT, md.join('\n'));

console.log('Wrote:');
console.log('  ' + OUT_PATH);
console.log('  ' + MD_OUT);
console.log(`Files processed: ${result.files.length}`);
