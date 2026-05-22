// build_site_direct.cjs
// Build the entire site plan via direct plugin DB calls (no LISP / command line).
// Nothing here can be hijacked by a stranded SAVEAS or any other prompt.
//
//   Block A: 8-storey, 12 x 20 m   (CX-6, CY-25) -> (CX+6, CY-5)
//   Block B: 10-storey, 12 x 20 m  (CX-6, CY+5)  -> (CX+6, CY+25)
//   Driveway 6 m wide              (CX+10, CY-30) -> (CX+16, CY+30)
//   12 surface parking bays
//   Trees, sidewalks, dimensions

const axios = require('axios');
const URL   = process.env.AUTOCAD_PLUGIN_URL || 'http://localhost:12345/';
const TOKEN = process.env.MCP_AUTOCAD_TOKEN  || 'default-secret-token';

const CX = 477796.965;
const CY = 4611601.226;

async function call(command, args) {
  const r = await axios.post(URL, { command, args }, {
    headers: { 'Content-Type':  'application/json; charset=utf-8',
               'Authorization': `Bearer ${TOKEN}` },
    timeout: 30000,
  });
  return r.data;
}

const layer = (name, color) => call('create_layer', { name, color: String(color) });
const rect  = (x1, y1, x2, y2, lay) =>
  call('create_rectangle', { x1, y1, x2, y2, layer: lay });
const line  = (sx, sy, ex, ey, lay) =>
  call('create_line', { startX: sx, startY: sy, endX: ex, endY: ey, layer: lay });
const circle = (x, y, r, lay) =>
  call('create_circle', { x, y, radius: r, layer: lay });
const text   = (x, y, s, h, lay) =>
  call('create_text', { x, y, text: s, height: h, layer: lay });
const dimL   = (x1, y1, x2, y2, offset, orient, lay) =>
  call('add_linear_dimension', { x1, y1, x2, y2, offset, orientation: orient, layer: lay });
const hatch  = (handles, pattern, scale, angle, lay) =>
  call('create_hatch', {
    boundaryHandles: handles, pattern, scale, angle, layer: lay,
  });

(async () => {
  // 1. Layers (idempotent — plugin no-ops if exists)
  await layer('S-BLDG',      7);
  await layer('S-ROAD',      9);
  await layer('S-ROAD-LINE', 7);
  await layer('S-PARKING',   5);
  await layer('S-PARK-NUM',  2);
  await layer('S-SIDEWALK',  8);
  await layer('S-TREE',      92);
  await layer('S-DIM',       2);

  // ============== BUILDINGS ==============
  // Block A
  const AX1 = CX - 6, AY1 = CY - 25, AX2 = CX + 6, AY2 = CY - 5;
  const aRect = await rect(AX1, AY1, AX2, AY2, 'S-BLDG');
  const aHandle = aRect.handle;
  // entry recess on south face
  await rect(CX - 0.5, AY1 - 0.6, CX + 0.5, AY1, 'S-BLDG');

  // Block B
  const BX1 = CX - 6, BY1 = CY + 5, BX2 = CX + 6, BY2 = CY + 25;
  const bRect = await rect(BX1, BY1, BX2, BY2, 'S-BLDG');
  const bHandle = bRect.handle;
  await rect(CX - 0.5, BY1 - 0.6, CX + 0.5, BY1, 'S-BLDG');

  // Hatch the building footprints (ANSI31, scale 0.06)
  if (aHandle) await hatch([aHandle], 'ANSI31', 0.06, 45, 'S-BLDG');
  if (bHandle) await hatch([bHandle], 'ANSI31', 0.06, 45, 'S-BLDG');

  // ============== DRIVEWAY ==============
  const RX1 = CX + 10, RX2 = CX + 16, RY1 = CY - 30, RY2 = CY + 30;
  const roadRect = await rect(RX1, RY1, RX2, RY2, 'S-ROAD');
  if (roadRect.handle)
    await hatch([roadRect.handle], 'ANSI37', 0.12, 0, 'S-ROAD');

  // dashed centerline (since we can't easily use linetype DASHED via DB,
  // we'll fake it with short-line segments)
  const cx = (RX1 + RX2) / 2;
  for (let y = RY1 + 1; y < RY2 - 1; y += 2) {
    await line(cx, y, cx, y + 1, 'S-ROAD-LINE');
  }

  // ============== SIDEWALKS ==============
  // entry walks from driveway to each building
  await rect(AX2, AY1 - 0.2, RX1, AY1 + 1.8, 'S-SIDEWALK');
  await rect(BX2, BY1 - 0.2, RX1, BY1 + 1.8, 'S-SIDEWALK');

  // ============== PARKING ==============
  // West-row middle court (3 bays, 2.5w x 5d, opening east)
  const bayW = async (x, y) => {
    await rect(x, y, x + 2.5, y + 5, 'S-PARKING');
    // chevron
    await line(x + 1.25, y + 4.5, x + 0.75, y + 4.0, 'S-PARKING');
    await line(x + 1.25, y + 4.5, x + 1.75, y + 4.0, 'S-PARKING');
  };
  // East-row (5 deep x 2.5 wide, opening west)
  const bayE = async (x, y) => {
    await rect(x, y, x + 5, y + 2.5, 'S-PARKING');
    await line(x + 4.5, y + 1.25, x + 4.0, y + 0.75, 'S-PARKING');
    await line(x + 4.5, y + 1.25, x + 4.0, y + 1.75, 'S-PARKING');
  };

  // 3 bays in middle court, west of driveway
  await bayW(CX + 6.5, CY - 3.5);
  await bayW(CX + 6.5, CY - 1.0);
  await bayW(CX + 6.5, CY + 1.5);

  // 9 bays along east edge of driveway
  await bayE(RX2, CY - 30); await bayE(RX2, CY - 27.5);
  await bayE(RX2, CY - 25); await bayE(RX2, CY - 22.5);
  await bayE(RX2, CY - 12.5); await bayE(RX2, CY - 10);
  await bayE(RX2, CY - 7.5);
  await bayE(RX2, CY + 17.5); await bayE(RX2, CY + 20);

  // numbered text 1..12
  const pnum = (x, y, n) => text(x, y, String(n), 0.6, 'S-PARK-NUM');
  await pnum(CX + 7.6, CY - 1.4,  1);
  await pnum(CX + 7.6, CY + 1.1,  2);
  await pnum(CX + 7.6, CY + 3.6,  3);
  await pnum(RX2 + 2.3, CY - 28.7,  4);
  await pnum(RX2 + 2.3, CY - 26.2,  5);
  await pnum(RX2 + 2.3, CY - 23.7,  6);
  await pnum(RX2 + 2.3, CY - 21.2,  7);
  await pnum(RX2 + 2.3, CY - 11.2,  8);
  await pnum(RX2 + 2.3, CY -  8.7,  9);
  await pnum(RX2 + 2.3, CY -  6.2, 10);
  await pnum(RX2 + 2.3, CY + 18.8, 11);
  await pnum(RX2 + 2.3, CY + 21.3, 12);

  // ============== TREES ==============
  const tree = async (x, y) => {
    await circle(x, y, 0.8,  'S-TREE');
    await circle(x, y, 0.25, 'S-TREE');
  };
  await tree(CX - 12, CY - 25); await tree(CX - 12, CY - 15);
  await tree(CX - 12, CY -  5); await tree(CX - 12, CY +  5);
  await tree(CX - 12, CY + 15); await tree(CX - 12, CY + 25);
  await tree(CX +  3, CY);      await tree(CX -  3, CY);

  // ============== DIMENSIONS ==============
  // Block A south face length and east face height
  await dimL(AX1, AY1, AX2, AY1, 4, 'H', 'S-DIM');
  await dimL(AX1, AY1, AX1, AY2, 4, 'V', 'S-DIM');
  // Block B north face length and east face height
  await dimL(BX1, BY2, BX2, BY2, 4, 'H', 'S-DIM');
  await dimL(BX1, BY1, BX1, BY2, 4, 'V', 'S-DIM');
  // Gap between buildings
  await dimL(AX2, AY2, AX2, BY1, 1.5, 'V', 'S-DIM');
  // Driveway width
  await dimL(RX1, RY1, RX2, RY1, 4, 'H', 'S-DIM');

  console.log('[build] done');
})().catch(e => {
  console.error('[build] ERROR:', e.response?.status, e.response?.data || e.message);
  process.exit(1);
});
