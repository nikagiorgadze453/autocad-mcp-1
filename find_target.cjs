// find_target.cjs — locate which "bina" label and which flats sit
// closest to the user-supplied UTM target.
const fs = require('fs');
const lines = fs.readFileSync('stage-dump.txt', 'utf8').split(/\r?\n/);
const TARGET = { x: 475275599.4, y: 4621094871.3 };

const labels = [];
for (const line of lines) {
  if (!line.startsWith('T ')) continue;
  const layer = (line.match(/layer=(.+?)\s+h=/) || [, ''])[1];
  const pos   = line.match(/pos=\(([-\d.eE+]+),([-\d.eE+]+)\)/);
  const tx    = line.match(/text="(.*)"\s*$/);
  if (!pos || !tx) continue;
  const stripped = tx[1]
    .replace(/\\f[^;]*;/g, '').replace(/\\H[^;]*;/g, '').replace(/\\S[^;]*;/g, '')
    .replace(/\\W[^;]*;/g, '').replace(/\\A\d+;/g, '').replace(/\\p[^;]*;/g, '')
    .replace(/\\[a-zA-Z]+;/g, '').replace(/[{}]/g, '').replace(/\|/g, '').trim();
  labels.push({
    layer,
    pos: { x: parseFloat(pos[1]), y: parseFloat(pos[2]) },
    text: stripped
  });
}

const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const binas = labels.filter(l => /bina\s*#/i.test(l.text))
  .map(l => ({ ...l, d_mm: dist2(l.pos, TARGET) }))
  .filter(b => b.pos.x > 1e8) // only georef copy
  .sort((a, b) => a.d_mm - b.d_mm);

console.log('--- buildings in georef coords, sorted by distance to target (in m)');
binas.forEach(b => {
  console.log(`${b.text.padEnd(12)}  pos=(${b.pos.x.toFixed(1)}, ${b.pos.y.toFixed(1)})  d=${(b.d_mm/1000).toFixed(2)} m`);
});

const flatLayer = 'G-Anno-Nplt_Pen_No__142';
const flats = labels.filter(l => l.layer === flatLayer && l.pos.x > 1e8)
  .map(l => ({ ...l, d_mm: dist2(l.pos, TARGET) }))
  .sort((a, b) => a.d_mm - b.d_mm);

console.log('\n--- flat labels (georef copy) closest to target (m):');
flats.forEach(f => {
  console.log(`${f.text.padEnd(12)}  pos=(${f.pos.x.toFixed(1)}, ${f.pos.y.toFixed(1)})  d=${(f.d_mm/1000).toFixed(2)} m`);
});
