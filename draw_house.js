import axios from 'axios';

const PLUGIN_URL = 'http://localhost:12345';
const TOKEN = 'default-secret-token';
const FONT = 'Sylfaen';
const ge = (text) => `\\F${FONT}|b0|i0;${text}`;

async function send(command, args) {
  const res = await axios.post(PLUGIN_URL, { command, args }, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    timeout: 30000,
    responseType: 'json'
  });
  return res.data;
}
async function safe(command, args) {
  try { return await send(command, args); } catch (e) { return { error: e.message }; }
}

const Layer = (name, color) => safe('create_layer', { name, color });
const Rect = (x1, y1, x2, y2, layer = '0') => safe('create_rectangle', { x1, y1, x2, y2, layer });
const Line = (sx, sy, ex, ey, layer = '0') => safe('create_line', { startX: sx, startY: sy, endX: ex, endY: ey, layer });
const Circle = (cx, cy, r, layer = '0') => safe('create_circle', { centerX: cx, centerY: cy, radius: r, layer });
const Arc = (cx, cy, r, a1, a2, layer = '0') => safe('create_arc', { centerX: cx, centerY: cy, radius: r, startAngle: a1, endAngle: a2, layer });
const Pline = (pts, closed, layer = '0') => safe('create_polyline', { points: pts, closed, layer });
const Text = (x, y, text, h = 200, layer = 'TEXT') => safe('create_text', { x, y, text, height: h, layer });
const MText = (x, y, text, h = 240, w = 8000, layer = 'TEXT') => safe('create_mtext', { x, y, text, height: h, width: w, layer });
const Hatch = (handles, pattern = 'SOLID', scale = 1, layer = 'WALL') => safe('create_hatch', { boundaryHandles: handles, pattern, scale, angle: 0, layer });

const Wall = async (x1, y1, x2, y2) => {
  const r = await Rect(x1, y1, x2, y2, 'WALL');
  if (r && r.handle) await Hatch([r.handle], 'SOLID', 1, 'WALL');
};

(async () => {
  await send('run_command', { command: '(command "_.ERASE" "_ALL" "")' });
  await new Promise(r => setTimeout(r, 800));
  await send('run_command', { command: '(command "_.-STYLE" "GEO" "Sylfaen.ttf" "0" "1" "0" "N" "N" "N")' });

  await Layer('WALL', 7);
  await Layer('WALL-INNER', 8);
  await Layer('DOOR', 4);
  await Layer('WINDOW', 5);
  await Layer('FURN', 3);
  await Layer('FIX', 3);
  await Layer('DIM', 2);
  await Layer('TEXT', 1);
  await Layer('GRID', 6);

  // House outer dims (mm)
  const W = 13000, H = 10000;
  const ow = 200; // outer wall thickness
  const iw = 120; // inner wall thickness

  // Outer walls (4 sides)
  await Wall(0, 0, W, ow);                // bottom
  await Wall(0, H - ow, W, H);           // top
  await Wall(0, 0, ow, H);               // left
  await Wall(W - ow, 0, W, H);           // right

  // Major horizontal division at y = 5000 separating bottom (living/dining/kitchen) from top (bedrooms)
  const yMid = 5000;
  await Wall(ow, yMid, W - ow, yMid + iw);

  // Bottom zone walls
  // vertical wall at x = 7800 splitting living/dining from kitchen
  await Wall(7800, ow, 7800 + iw, yMid);

  // Top zone walls (bedrooms)
  // hallway runs along the bottom of top zone for 800mm height
  const hallY1 = yMid + iw;
  const hallY2 = yMid + iw + 1400; // 1.4m corridor

  // wall above corridor
  await Wall(ow, hallY2, W - ow, hallY2 + iw);

  // Vertical walls between top rooms (above corridor)
  await Wall(3800, hallY2 + iw, 3800 + iw, H - ow); // br1 | br2
  await Wall(8200, hallY2 + iw, 8200 + iw, H - ow); // br2 | master/bath
  await Wall(11000, hallY2 + iw, 11000 + iw, H - ow); // master | ensuite

  // Bath 2 next to bedroom 2 (in master zone, between 8200 and 11000 there's area; bath is above master? Let's redesign)
  // Better: 8200..11000 is bath2 + master side; let's put bath2 at 8200..11000 wide x partial height
  // Add small wall to separate small area for bath2 inside (skip to keep simple)

  // Inside corridor walls -> none; corridor is open between yMid+iw and hallY2

  // Doors (arc swings + opening) - punch openings shown as missing wall + arc
  // Front entry on bottom wall around x = 1500..2400
  // We'll just draw door arcs on top of the existing walls (they look like cuts)
  const doors = [
    // [hingeX, hingeY, radius, startAngle, endAngle] (degrees)
    { hx: 2000, hy: ow,  r: 900, a1: 0, a2: 90, label: 'შესასვლელი', lx: 1500, ly: -700 },          // front entry, swing inward
    { hx: 7800, hy: 1500, r: 900, a1: 90, a2: 180, label: '' },                                      // living-kitchen door
    { hx: ow + 1000, hy: yMid, r: 800, a1: 270, a2: 360, label: '' },                                // living to corridor
    // bedroom doors from corridor
    { hx: 2500, hy: hallY2 + iw, r: 800, a1: 180, a2: 270, label: '' },                              // br1
    { hx: 5800, hy: hallY2 + iw, r: 800, a1: 180, a2: 270, label: '' },                              // br2
    { hx: 9500, hy: hallY2 + iw, r: 800, a1: 180, a2: 270, label: '' },                              // master
    { hx: 11800, hy: hallY2 + iw, r: 700, a1: 180, a2: 270, label: '' }                              // ensuite
  ];
  for (const d of doors) {
    await Arc(d.hx, d.hy, d.r, d.a1, d.a2, 'DOOR');
    // door leaf line at start angle
    const a1 = (d.a1 * Math.PI) / 180;
    await Line(d.hx, d.hy, d.hx + d.r * Math.cos(a1), d.hy + d.r * Math.sin(a1), 'DOOR');
  }

  // Windows: pairs of parallel lines on outer walls
  const windows = [
    // bottom wall
    { x1: 3500, y1: 0, x2: 5500, y2: ow },
    { x1: 9500, y1: 0, x2: 11500, y2: ow },
    // top wall (bedroom windows)
    { x1: 1200, y1: H - ow, x2: 3000, y2: H },
    { x1: 5200, y1: H - ow, x2: 7600, y2: H },
    { x1: 9000, y1: H - ow, x2: 10800, y2: H },
    // left wall
    { x1: 0, y1: 2200, x2: ow, y2: 3800 },
    { x1: 0, y1: 6500, x2: ow, y2: 8500 },
    // right wall
    { x1: W - ow, y1: 1500, x2: W, y2: 3000 },
    { x1: W - ow, y1: 6500, x2: W, y2: 8000 }
  ];
  for (const w of windows) {
    // window frame outline
    await Rect(w.x1, w.y1, w.x2, w.y2, 'WINDOW');
    // dashed inner line representing glass
    if (w.x2 - w.x1 > w.y2 - w.y1) {
      const my = (w.y1 + w.y2) / 2;
      await Line(w.x1, my, w.x2, my, 'WINDOW');
    } else {
      const mx = (w.x1 + w.x2) / 2;
      await Line(mx, w.y1, mx, w.y2, 'WINDOW');
    }
  }

  // Furniture - simple rectangles with labels
  // Living room sofa (left bottom)
  await Rect(500, 500, 3000, 1200, 'FURN');
  await MText(500, 1500, ge('სავარძელი'), 200, 3000, 'TEXT');
  // Coffee table
  await Rect(1100, 1900, 2400, 2700, 'FURN');
  // Dining table
  await Rect(4200, 1500, 6800, 3500, 'FURN');
  await MText(4500, 4000, ge('სასადილო'), 220, 3000, 'TEXT');
  // Dining chairs (small rectangles)
  for (const cx of [4500, 5200, 5900, 6500]) {
    await Rect(cx, 1100, cx + 500, 1400, 'FURN');
    await Rect(cx, 3600, cx + 500, 3900, 'FURN');
  }

  // Kitchen counters (L-shape) along right & top (of bottom zone)
  await Rect(8000, 4500, 12800, 4900, 'FURN'); // top counter
  await Rect(12200, 1500, 12800, 4900, 'FURN'); // right counter
  await Rect(8000, 1500, 9000, 1900, 'FURN'); // small island top
  await MText(9500, 3000, ge('სამზარეულო'), 240, 3000, 'TEXT');
  // Sink
  await Rect(10500, 4600, 11500, 4900, 'FURN');
  // Stove
  await Rect(12300, 2300, 12800, 3300, 'FURN');

  // Bedrooms
  // BR1 (top-left)
  // Bed
  await Rect(500, 8200, 2200, 9700, 'FURN');
  // pillow
  await Line(500, 9300, 2200, 9300, 'FURN');
  await MText(2400, 9000, ge('საძინებელი 1'), 240, 3000, 'TEXT');
  // wardrobe
  await Rect(500, 7100, 1700, 7600, 'FURN');

  // BR2 (middle-top)
  await Rect(5000, 8200, 7000, 9700, 'FURN');
  await Line(5000, 9300, 7000, 9300, 'FURN');
  await MText(5300, 7800, ge('საძინებელი 2'), 240, 3000, 'TEXT');

  // Master Bedroom (right-top)
  await Rect(8800, 8000, 10800, 9700, 'FURN');
  await Line(8800, 9300, 10800, 9300, 'FURN');
  await MText(8500, 7700, ge('მთავარი საძინებელი'), 240, 4000, 'TEXT');

  // Ensuite bath (top-right corner)
  // Toilet
  await Rect(11200, 9200, 11800, 9700, 'FIX');
  await Circle(11500, 9450, 220, 'FIX');
  // Sink (vanity)
  await Rect(12200, 9200, 12800, 9700, 'FIX');
  await Circle(12500, 9450, 200, 'FIX');
  // Bathtub
  await Rect(11200, 7200, 12800, 8800, 'FIX');
  await Rect(11400, 7400, 12600, 8600, 'FIX');
  await MText(11200, 7000, ge('აბაზანა'), 200, 2500, 'TEXT');

  // Bathroom 2 - placed in middle of the top floor (between BR2 and Master) - actually our layout has wall at 8200, so put bath in 7200..8200 strip
  // Reuse area between 7000..8200, 7000..hallY2+iw zone? small
  // Put bath2 in lower-right portion of top zone:
  await Rect(7100, 6750, 8100, 7700, 'FIX'); // bathtub
  await MText(7100, 6500, ge('აბაზანა 2'), 200, 2000, 'TEXT');

  // Living room label
  await MText(1500, 3500, ge('მისაღები'), 350, 4000, 'TEXT');

  // Corridor label
  await MText(5800, hallY1 + 350, ge('დერეფანი'), 220, 3000, 'TEXT');

  // Entry hall label
  await MText(1700, 200, ge('შესასვლელი'), 200, 2500, 'TEXT');

  // Outer dimensions
  // bottom dim line
  const dy = -2000;
  await Line(0, dy, W, dy, 'DIM');
  await Line(0, dy - 100, 0, dy + 100, 'DIM');
  await Line(W, dy - 100, W, dy + 100, 'DIM');
  await MText(W / 2 - 1500, dy - 100, ge(`სიგრძე ${W} მმ`), 320, 6000, 'DIM');
  // left dim line
  const dx = -2000;
  await Line(dx, 0, dx, H, 'DIM');
  await Line(dx - 100, 0, dx + 100, 0, 'DIM');
  await Line(dx - 100, H, dx + 100, H, 'DIM');
  await MText(dx - 2500, H / 2, ge(`სიგანე ${H} მმ`), 320, 6000, 'DIM');

  // Title and title block
  await MText(0, H + 1500, ge('სახლის გეგმა  -  ერთსართულიანი'), 600, 25000, 'TEXT');
  await MText(0, H + 800, ge('ფართი ≈ 130 მ²,  3 საძინებელი,  2 აბაზანა,  მისაღები + სამზარეულო'), 280, 25000, 'TEXT');

  // Title block on right side outside the house
  const tbX1 = W + 2000, tbY1 = 500, tbX2 = W + 9000, tbY2 = 5000;
  await Rect(tbX1, tbY1, tbX2, tbY2, 'TEXT');
  await MText(tbX1 + 200, tbY2 - 200, ge(
    'პროექტი:    საცხოვრებელი სახლი\\Pნახაზი:      სართულის გეგმა\\Pფურცელი:    A-01\\Pმასშტაბი:   1:50\\Pთარიღი:     2026-04\\Pშემსრ.:      AI / MCP'
  ), 260, 7000, 'TEXT');

  // Legend
  const lx = -3500, ly = -6000;
  await Rect(lx, ly, lx + 9000, ly + 3500, 'TEXT');
  await MText(lx + 200, ly + 3300, ge('აღნიშვნები'), 320, 9000, 'TEXT');
  // wall sample
  await Rect(lx + 300, ly + 2400, lx + 1300, ly + 2600, 'WALL');
  await Hatch([(await Rect(lx + 300, ly + 2400, lx + 1300, ly + 2600, 'WALL')).handle], 'SOLID', 1, 'WALL').catch(() => {});
  await MText(lx + 1500, ly + 2700, ge('კედელი'), 240, 9000, 'TEXT');
  await Arc(lx + 600, ly + 1700, 400, 0, 90, 'DOOR');
  await MText(lx + 1500, ly + 2000, ge('კარი (ღერძით)'), 240, 9000, 'TEXT');
  await Rect(lx + 300, ly + 1100, lx + 1300, ly + 1300, 'WINDOW');
  await Line(lx + 300, ly + 1200, lx + 1300, ly + 1200, 'WINDOW');
  await MText(lx + 1500, ly + 1300, ge('ფანჯარა'), 240, 9000, 'TEXT');
  await Rect(lx + 300, ly + 500, lx + 1300, ly + 700, 'FURN');
  await MText(lx + 1500, ly + 700, ge('ავეჯი'), 240, 9000, 'TEXT');

  await send('run_command', { command: '_.ZOOM _E' });
  console.log('House plan drawn');
})();
