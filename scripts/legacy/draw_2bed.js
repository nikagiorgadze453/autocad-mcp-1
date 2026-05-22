import axios from 'axios';

const PLUGIN_URL = 'http://localhost:12345';
const TOKEN = 'default-secret-token';
const FONT = 'Sylfaen';
const ge = (text) => `\\F${FONT}|b0|i0;${text}`;

async function send(command, args) {
  return (await axios.post(PLUGIN_URL, { command, args }, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    timeout: 30000,
    responseType: 'json'
  })).data;
}
async function safe(c, a) { try { return await send(c, a); } catch (e) { return { error: e.message }; } }

const Layer = (n, c) => safe('create_layer', { name: n, color: c });
const Rect = (x1,y1,x2,y2,layer='0') => safe('create_rectangle', { x1, y1, x2, y2, layer });
const Line = (sx,sy,ex,ey,layer='0') => safe('create_line', { startX: sx, startY: sy, endX: ex, endY: ey, layer });
const Circle = (cx,cy,r,layer='0') => safe('create_circle', { centerX: cx, centerY: cy, radius: r, layer });
const Arc = (cx,cy,r,a1,a2,layer='0') => safe('create_arc', { centerX: cx, centerY: cy, radius: r, startAngle: a1, endAngle: a2, layer });
const MText = (x,y,t,h=240,w=8000,layer='TEXT') => safe('create_mtext', { x, y, text: t, height: h, width: w, layer });
const Hatch = (handles, pattern='SOLID', layer='WALL') => safe('create_hatch', { boundaryHandles: handles, pattern, scale: 1, angle: 0, layer });
const Wall = async (x1,y1,x2,y2) => {
  const r = await Rect(x1,y1,x2,y2,'WALL');
  if (r && r.handle) await Hatch([r.handle],'SOLID','WALL');
};

(async () => {
  await send('run_command', { command: '(command "_.ERASE" "_ALL" "")' });
  await new Promise(r => setTimeout(r, 600));
  await send('run_command', { command: '(command "_.PLAN" "")' });
  await send('run_command', { command: '(command "_.VSCURRENT" "_2D")' });
  await send('run_command', { command: '(command "_.-STYLE" "GEO" "Sylfaen.ttf" "0" "1" "0" "N" "N" "N")' });

  await Layer('WALL', 7);
  await Layer('DOOR', 4);
  await Layer('WINDOW', 5);
  await Layer('FURN', 3);
  await Layer('FIX', 6);
  await Layer('DIM', 2);
  await Layer('TEXT', 1);

  // 9000 x 7000 mm 2-bedroom house, simple
  const W = 9000, H = 7000, ow = 200, iw = 120;

  // outer walls
  await Wall(0, 0, W, ow);
  await Wall(0, H - ow, W, H);
  await Wall(0, 0, ow, H);
  await Wall(W - ow, 0, W, H);

  // horizontal divider at y=4000 (bedrooms top, living bottom)
  await Wall(ow, 4000, W - ow, 4000 + iw);

  // vertical between two bedrooms at x=4500
  await Wall(4500, 4000 + iw, 4500 + iw, H - ow);

  // bathroom partition: separate small bath in bottom right
  await Wall(6000, ow, 6000 + iw, 4000);
  await Wall(6000 + iw, 2200, W - ow, 2200 + iw);

  // door swing arcs (open spaces in wall, indicated by arcs)
  // entry door bottom front (around x = 1500..2400)
  await Arc(2000, ow, 900, 0, 90, 'DOOR');
  await Line(2000, ow, 2900, ow, 'DOOR');

  // bedroom 1 door (left) from common area, hinge at x=2000, y=4000+iw
  await Arc(2000, 4000 + iw, 800, 270, 360, 'DOOR');
  await Line(2000, 4000 + iw, 2000, 4000 + iw - 800, 'DOOR');

  // bedroom 2 door
  await Arc(5500, 4000 + iw, 800, 270, 360, 'DOOR');
  await Line(5500, 4000 + iw, 5500, 4000 + iw - 800, 'DOOR');

  // bathroom door
  await Arc(6000 + iw, 1500, 700, 0, 90, 'DOOR');
  await Line(6000 + iw, 1500, 6700, 1500, 'DOOR');

  // windows
  const winRects = [
    [3000, 0, 4500, ow],
    [7200, 0, 8500, ow],
    [800, H - ow, 2400, H],
    [3000, H - ow, 4400, H],
    [5500, H - ow, 7000, H],
    [W - ow, 4500, W, 6000],
    [0, 1500, ow, 3000]
  ];
  for (const [x1,y1,x2,y2] of winRects) {
    await Rect(x1, y1, x2, y2, 'WINDOW');
    if (x2-x1 > y2-y1) await Line(x1, (y1+y2)/2, x2, (y1+y2)/2, 'WINDOW');
    else await Line((x1+x2)/2, y1, (x1+x2)/2, y2, 'WINDOW');
  }

  // bedroom 1 (top-left): bed
  await Rect(400, 5500, 2000, 6800, 'FURN');
  await Line(400, 6500, 2000, 6500, 'FURN');
  await MText(400, 5300, ge('საძინებელი 1'), 280, 3000, 'TEXT');
  // wardrobe
  await Rect(400, 4400, 1800, 4900, 'FURN');

  // bedroom 2 (top-right): bed
  await Rect(5000, 5500, 6800, 6800, 'FURN');
  await Line(5000, 6500, 6800, 6500, 'FURN');
  await MText(5000, 5300, ge('საძინებელი 2'), 280, 3000, 'TEXT');
  // wardrobe
  await Rect(7200, 4400, 8600, 4900, 'FURN');

  // Living/dining area (bottom-left) center label
  await MText(1500, 2700, ge('მისაღები'), 380, 4000, 'TEXT');
  // sofa
  await Rect(400, 2900, 2800, 3700, 'FURN');
  // coffee table
  await Rect(1100, 1900, 2200, 2600, 'FURN');
  // dining table + chairs (right of living)
  await Rect(3800, 1500, 5500, 3000, 'FURN');
  for (const cx of [3900, 4500, 5100]) {
    await Rect(cx, 1100, cx + 400, 1400, 'FURN');
    await Rect(cx, 3100, cx + 400, 3400, 'FURN');
  }

  // Kitchen counters (above dining or along right of living, here small in bottom)
  // Add small kitchen strip along bottom-right of living, x 4000..6000
  await Rect(400, 200, 3500, 600, 'FURN'); // counter under entry-area
  await MText(500, 700, ge('სამზარეულო'), 240, 3000, 'TEXT');
  // sink
  await Rect(1200, 250, 1700, 550, 'FURN');
  // stove
  await Rect(2500, 250, 3000, 600, 'FURN');

  // Bathroom (right strip, between y=200 and 2200)
  // toilet
  await Rect(6300, 1700, 6800, 2100, 'FIX');
  await Circle(6550, 1900, 180, 'FIX');
  // sink
  await Rect(6300, 600, 6800, 1100, 'FIX');
  await Circle(6550, 850, 200, 'FIX');
  // bathtub
  await Rect(7200, 250, 8800, 2000, 'FIX');
  await Rect(7400, 450, 8600, 1800, 'FIX');
  await MText(6300, 250, ge('აბაზანა'), 240, 2500, 'TEXT');

  // Entry
  await MText(2000, 200, ge('შესასვლელი'), 220, 2500, 'TEXT');

  // outer dimensions
  const dy = -1500;
  await Line(0, dy, W, dy, 'DIM');
  await Line(0, dy - 100, 0, dy + 100, 'DIM');
  await Line(W, dy - 100, W, dy + 100, 'DIM');
  await MText(W / 2 - 1500, dy - 200, ge(`სიგრძე ${W} მმ`), 280, 5000, 'DIM');
  const dx = -1500;
  await Line(dx, 0, dx, H, 'DIM');
  await Line(dx - 100, 0, dx + 100, 0, 'DIM');
  await Line(dx - 100, H, dx + 100, H, 'DIM');
  await MText(dx - 2000, H / 2, ge(`სიგანე ${H} მმ`), 280, 5000, 'DIM');

  // title
  await MText(0, H + 1300, ge('ორ-საძინებლიანი სახლის გეგმა'), 500, 22000, 'TEXT');
  await MText(0, H + 700, ge('ფართი ≈ 63 მ²,  ზევიდან ხედი (1:50)'), 260, 22000, 'TEXT');

  // legend
  const lx = W + 1500, ly = 0;
  await Rect(lx, ly, lx + 6500, ly + 3500, 'TEXT');
  await MText(lx + 200, ly + 3300, ge('აღნიშვნები'), 320, 6500, 'TEXT');
  await Rect(lx + 300, ly + 2400, lx + 1300, ly + 2600, 'WALL');
  await Hatch([(await Rect(lx + 300, ly + 2400, lx + 1300, ly + 2600, 'WALL')).handle], 'SOLID', 'WALL').catch(() => {});
  await MText(lx + 1500, ly + 2700, ge('კედელი'), 240, 5000, 'TEXT');
  await Arc(lx + 600, ly + 1700, 350, 0, 90, 'DOOR');
  await MText(lx + 1500, ly + 2000, ge('კარი'), 240, 5000, 'TEXT');
  await Rect(lx + 300, ly + 1100, lx + 1300, ly + 1300, 'WINDOW');
  await Line(lx + 300, ly + 1200, lx + 1300, ly + 1200, 'WINDOW');
  await MText(lx + 1500, ly + 1300, ge('ფანჯარა'), 240, 5000, 'TEXT');
  await Rect(lx + 300, ly + 500, lx + 1300, ly + 700, 'FURN');
  await MText(lx + 1500, ly + 700, ge('ავეჯი'), 240, 5000, 'TEXT');

  await send('run_command', { command: '_.ZOOM _E' });
  console.log('Two-bedroom house plan drawn');
})();
