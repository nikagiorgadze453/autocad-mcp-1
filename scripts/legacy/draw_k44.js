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
const Text = (x, y, text, height = 200, layer = 'TEXT') => safe('create_text', { x, y, text, height, layer });
const MText = (x, y, text, height = 240, width = 8000, layer = 'TEXT') => safe('create_mtext', { x, y, text, height, width, layer });
const Hatch = (handles, layer = 'COLUMN') => safe('create_hatch', { boundaryHandles: handles, pattern: 'SOLID', scale: 1, angle: 0, layer });
const FilledRect = async (x1, y1, x2, y2, layer = 'COLUMN') => {
  const r = await Rect(x1, y1, x2, y2, layer);
  if (r && r.handle) await Hatch([r.handle], layer);
};

(async () => {
  await send('run_command', { command: '(command "_.ERASE" "_ALL" "")' });
  await new Promise(r => setTimeout(r, 600));

  await send('run_command', { command: '(command "_.-STYLE" "GEO" "Sylfaen.ttf" "0" "1" "0" "N" "N" "N")' });

  await Layer('GRID', 1);
  await Layer('COLUMN', 6);
  await Layer('AXIS-LABEL', 1);
  await Layer('DIM', 3);
  await Layer('TITLE', 7);
  await Layer('TEXT', 7);

  const sheetW = 42000, sheetH = 29700;
  await Rect(0, 0, sheetW, sheetH, 'TITLE');
  await Rect(600, 600, sheetW - 600, sheetH - 600, 'TITLE');
  await Rect(800, 800, sheetW - 800, sheetH - 800, 'TITLE');

  const tb_x1 = sheetW - 8000, tb_x2 = sheetW - 800;
  const tb_y1 = 800,           tb_y2 = 5000;
  await Rect(tb_x1, tb_y1, tb_x2, tb_y2, 'TITLE');
  for (let i = 1; i < 6; i++) {
    const y = tb_y1 + i * (tb_y2 - tb_y1) / 6;
    await Line(tb_x1, y, tb_x2, y, 'TITLE');
  }
  await MText(tb_x1 + 200, tb_y2 - 200, ge(
    'პროექტი:    სამშენებლო ნიმუში\\Pნახაზი:      ფუნდამენტის გეგმა\\Pფურცელი:    კ-44\\Pმასშტაბი:   1:50\\Pთარიღი:     2026-04\\Pშემსრ.:      AI / MCP'
  ), 240, 7000, 'TEXT');

  const orgX = 4500, orgY = 9000;
  const colSpacing = [0, 3600, 3000, 3600, 3000, 3600, 3000, 3600, 3000, 3600, 3000, 3600];
  const rowSpacing = [0, 4800, 4200, 4800];

  let cum = 0; const axesX = colSpacing.map(v => (cum += v, orgX + cum));
  cum = 0;       const axesY = rowSpacing.map(v => (cum += v, orgY + cum));

  const extTop = axesY[axesY.length - 1] + 2200;
  const extBot = axesY[0] - 2200;
  const extLeft = axesX[0] - 2200;
  const extRight = axesX[axesX.length - 1] + 2200;

  for (const x of axesX) await Line(x, extBot, x, extTop, 'GRID');
  for (const y of axesY) await Line(extLeft, y, extRight, y, 'GRID');

  for (let i = 0; i < axesX.length; i++) {
    const name = String(i + 1);
    await Circle(axesX[i], extTop + 700, 500, 'AXIS-LABEL');
    await Text(axesX[i] - 150, extTop + 550, name, 350, 'AXIS-LABEL');
    await Circle(axesX[i], extBot - 700, 500, 'AXIS-LABEL');
    await Text(axesX[i] - 150, extBot - 850, name, 350, 'AXIS-LABEL');
  }
  const rowNames = ['A', 'B', 'C', 'D'];
  for (let j = 0; j < axesY.length; j++) {
    await Circle(extLeft - 700, axesY[j], 500, 'AXIS-LABEL');
    await Text(extLeft - 870, axesY[j] - 160, rowNames[j], 350, 'AXIS-LABEL');
    await Circle(extRight + 700, axesY[j], 500, 'AXIS-LABEL');
    await Text(extRight + 550, axesY[j] - 160, rowNames[j], 350, 'AXIS-LABEL');
  }

  const sz = 250;
  for (const x of axesX) {
    for (const y of axesY) {
      await FilledRect(x - sz, y - sz, x + sz, y + sz, 'COLUMN');
      await Circle(x, y, sz * 1.7, 'COLUMN');
      await Line(x - sz * 1.7, y, x + sz * 1.7, y, 'COLUMN');
      await Line(x, y - sz * 1.7, x, y + sz * 1.7, 'COLUMN');
    }
  }

  const dimY1 = extBot - 2000, dimY2 = dimY1 - 1100;
  await Line(extLeft, dimY1, extRight, dimY1, 'DIM');
  for (const x of axesX) await Line(x, dimY1 - 100, x, dimY1 + 100, 'DIM');
  for (let i = 0; i < axesX.length - 1; i++) {
    const val = axesX[i + 1] - axesX[i];
    await Text((axesX[i] + axesX[i + 1]) / 2 - 350, dimY1 + 150, String(val), 280, 'DIM');
  }
  const totalX = axesX[axesX.length - 1] - axesX[0];
  await Line(axesX[0], dimY2, axesX[axesX.length - 1], dimY2, 'DIM');
  await Line(axesX[0], dimY2 - 100, axesX[0], dimY2 + 100, 'DIM');
  await Line(axesX[axesX.length - 1], dimY2 - 100, axesX[axesX.length - 1], dimY2 + 100, 'DIM');
  await MText((axesX[0] + axesX[axesX.length - 1]) / 2 - 1000, dimY2 - 100, ge(`სულ ${totalX}`), 320, 5000, 'DIM');

  const dimX1 = extLeft - 2000, dimX2 = dimX1 - 1100;
  await Line(dimX1, axesY[0], dimX1, axesY[axesY.length - 1], 'DIM');
  for (const y of axesY) await Line(dimX1 - 100, y, dimX1 + 100, y, 'DIM');
  for (let j = 0; j < axesY.length - 1; j++) {
    const val = axesY[j + 1] - axesY[j];
    await Text(dimX1 - 1300, (axesY[j] + axesY[j + 1]) / 2, String(val), 280, 'DIM');
  }
  const totalY = axesY[axesY.length - 1] - axesY[0];
  await Line(dimX2, axesY[0], dimX2, axesY[axesY.length - 1], 'DIM');
  await Line(dimX2 - 100, axesY[0], dimX2 + 100, axesY[0], 'DIM');
  await Line(dimX2 - 100, axesY[axesY.length - 1], dimX2 + 100, axesY[axesY.length - 1], 'DIM');
  await MText(dimX2 - 2200, (axesY[0] + axesY[axesY.length - 1]) / 2, ge(`სულ ${totalY}`), 320, 5000, 'DIM');

  await MText(4500, 28000, ge('ფუნდამენტის გეგმა  -  კ-44'), 600, 25000, 'TEXT');
  await MText(4500, 27200, ge('რკინაბეტონის სვეტები 500x500, იზოლირებულ ფუნდამენტზე'), 280, 25000, 'TEXT');

  const lx = 4500, ly = 4500;
  await Rect(lx, ly, lx + 10000, ly + 3000, 'TITLE');
  await MText(lx + 200, ly + 2700, ge('ლეგენდა'), 320, 9000, 'TEXT');
  await Circle(lx + 500, ly + 1700, 200, 'COLUMN');
  await FilledRect(lx + 400, ly + 1600, lx + 600, ly + 1800, 'COLUMN');
  await MText(lx + 900, ly + 1850, ge('სვეტი 500x500 მმ'), 240, 9000, 'TEXT');
  await Line(lx + 400, ly + 1100, lx + 700, ly + 1100, 'GRID');
  await MText(lx + 900, ly + 1250, ge('საკოორდინაცო ღერძი (1..12, A..D)'), 240, 9000, 'TEXT');
  await MText(lx + 200, ly + 600, ge('შენიშვნა: ნახაზი შესრულებულია AI-ის მიერ'), 220, 9000, 'TEXT');

  await send('run_command', { command: '_.ZOOM _E' });
  console.log('K-44 plan rebuilt');
})();
