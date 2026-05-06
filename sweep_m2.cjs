// sweep_m2.cjs — find every label that says "X m" in the dump, regardless
// of layer, and also look for the (a / b) "net (gross)" pattern.
const fs = require('fs');
const lines = fs.readFileSync('stage-dump.txt', 'utf8').split(/\r?\n/);
const all = [];
for (const line of lines) {
  if (!line.startsWith('T ')) continue;
  const layer = (line.match(/layer=(.+?)\s+h=/) || [, ''])[1];
  const pos   = line.match(/pos=\(([-\d.eE+]+),([-\d.eE+]+)\)/);
  const tx    = line.match(/text="(.*)"\s*$/);
  if (!pos || !tx) continue;
  const stripped = tx[1]
    .replace(/\\f[^;]*;/g, '').replace(/\\H[^;]*;/g, '').replace(/\\S[^;]*;/g, '')
    .replace(/\\W[^;]*;/g, '').replace(/\\A\d+;/g, '').replace(/\\p[^;]*;/g, '')
    .replace(/\\[a-zA-Z]+;/g, '').replace(/[{}]/g, '').replace(/\|/g, '')
    .trim();
  // pull every number that precedes m (with or without ²)
  const nums = [...stripped.matchAll(/(-?\d+(?:[.,]\d+)?)/g)].map(m => parseFloat(m[1].replace(',','.')));
  all.push({
    layer, pos: { x: parseFloat(pos[1]), y: parseFloat(pos[2]) },
    text: stripped, nums
  });
}

// Buckets: < 1, 1-5, 5-15, 15-30, 30-50, 50-100, 100-300, > 300
const buckets = {'<1':0,'1-5':0,'5-15':0,'15-30':0,'30-50':0,'50-100':0,'100-300':0,'>300':0};
for (const t of all) {
  for (const n of t.nums) {
    if (n <= 0) continue;
    if (n < 1) buckets['<1']++;
    else if (n < 5) buckets['1-5']++;
    else if (n < 15) buckets['5-15']++;
    else if (n < 30) buckets['15-30']++;
    else if (n < 50) buckets['30-50']++;
    else if (n < 100) buckets['50-100']++;
    else if (n < 300) buckets['100-300']++;
    else buckets['>300']++;
  }
}

// All labels with values 30..150 (flat-size range)
const flatLike = all
  .filter(t => t.nums.some(n => n >= 30 && n <= 150))
  .map(t => ({ layer: t.layer, x: +t.pos.x.toFixed(0), y: +t.pos.y.toFixed(0), text: t.text }));

// Layer histogram for these flat-like labels
const layerHist = {};
for (const t of flatLike) layerHist[t.layer] = (layerHist[t.layer] || 0) + 1;

// What text uses "(...)" net/gross pattern?
const parens = all.filter(t => /\(\s*[\d.,]+/.test(t.text));

// Largest 20 numbers in label set
const allNums = [];
for (const t of all) for (const n of t.nums) if (n > 0) allNums.push({ n, layer: t.layer, text: t.text });
allNums.sort((a, b) => b.n - a.n);

console.log('=== Bucket counts of all numbers in TEXT ===');
console.log(buckets);
console.log('\n=== Layer histogram for labels with values 30..150 ===');
console.log(layerHist);
console.log('\n=== Labels using parentheses (net/gross or annotation) ===');
parens.slice(0, 40).forEach(p => console.log(`${p.layer}\t(${p.x},${p.y})\t${p.text}`));
console.log('\n=== Top 30 largest values seen in TEXT/MTEXT ===');
allNums.slice(0, 30).forEach(x => console.log(`${x.n}\t${x.layer}\t${x.text}`));
console.log('\n=== Total flat-like labels (30..150) ===', flatLike.length);
