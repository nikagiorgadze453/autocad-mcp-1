// send_site_labels.cjs
// Adds all Georgian labels to the site plan via the AutoCAD plugin.
// Uses create_mtext / create_text directly (no LISP, no command-line),
// so UTF-8 stays intact and there's no risk of a stuck command prompt.

const axios = require('axios');
const URL   = process.env.AUTOCAD_PLUGIN_URL || 'http://localhost:12345/';
const TOKEN = process.env.MCP_AUTOCAD_TOKEN  || 'default-secret-token';

const ge = (t) => `\\FSylfaen|b0|i0;${t}`;

async function call(command, args) {
  const r = await axios.post(URL, { command, args }, {
    headers: {
      'Content-Type':  'application/json; charset=utf-8',
      'Authorization': `Bearer ${TOKEN}`,
    },
    timeout: 60000,
  });
  return r.data;
}

const m = (x, y, text, h, w, layer) =>
  call('create_mtext', { x, y, text: ge(text), height: h, width: w, layer });

const t = (x, y, text, h, layer) =>
  call('create_text',  { x, y, text, height: h, layer });

(async () => {
  // ---------------- BUILDING LABELS ----------------
  await m(10000, 15000,
    'ბლოკი ა\\P8 სართული\\P12 x 20 = 240 მ²\\Pსიმაღლე 24.0 მ',
    600, 10000, 'S-TEXT');

  await m(10000, 45000,
    'ბლოკი ბ\\P10 სართული\\P12 x 20 = 240 მ²\\Pსიმაღლე 30.0 მ',
    600, 10000, 'S-TEXT');

  // entrances
  await m( 9200,  3500, 'შესასვლელი', 350, 4000, 'S-TEXT');
  await m( 9200, 33500, 'შესასვლელი', 350, 4000, 'S-TEXT');

  // ---------------- ROAD / PARKING LABELS ----------------
  await m(20800,  3000, 'შემოსასვლელი',                400, 5000, 'S-TEXT');
  await m(20800, 56500, 'გასასვლელი',                   400, 5000, 'S-TEXT');
  await m(19500, 30000, 'სატრანსპორტო გზა\\P6.0 მ',    450, 5000, 'S-TEXT');
  await m(25500, 30000, 'ავტოსადგომი\\P12 ადგ. (ზედაპირული)\\P+ მიწისქვეშა',
                                                        400, 5000, 'S-TEXT');
  await m( 6000, 30000, 'შიდა ეზო\\Pგამწვანება',       500, 8000, 'S-TEXT');

  // sidewalk + street
  await m(13000, -1000, 'ქვეითთა ბილიკი 2.0 მ',         300, 6000, 'S-TEXT');
  await m(13500, -3500, 'ქუჩა',                         700, 6000, 'S-TEXT');

  // zone label below table
  await m(  500, -10000,
    'ზონა: სზ-5 (საცხოვრებელი ზონა — თბილისის ორდინანსი 14-39)',
    600, 30000, 'S-TEXT');

  // ---------------- DRAWING TITLE ----------------
  await m(  500, 67000,  'გენერალური გეგმა',                                    1200, 30000, 'S-TEXT');
  await m(  500, 64500,  'ორი საცხოვრებელი კორპუსი — ავტოგზა და ავტოსადგომი',  500, 30000, 'S-TEXT');

  // ---------------- TITLE BLOCK CARTOUCHE ----------------
  // Coords match site-2bldg.lsp: OFX=-10000 OFY=-15000, A2 sheet 118800x84000
  // cartouche: TBX1 = (-10000+118800-2000) - 30000 = 76800 ; TBX2 = 106800
  // TBY1 = -13000 ; TBY2 = 67000 ; row height = 13333.3
  const TBX1 = 76800, TBX2 = 106800;
  const TBY1 = -13000, TBY2 = 67000;
  const RH = (TBY2 - TBY1) / 6;
  const TBL = TBX1 + 800;

  // top-down rows
  // Row 6 (top): project
  let yTop = TBY2 - 1500;
  await m(TBL, yTop,        'პროექტი:',                                          600, 28000, 'S-TEXT');
  await m(TBL, yTop - 1500, 'ორი საცხოვრებელი კორპუსი 8 და 10 სართული',         500, 28000, 'S-TEXT');

  // Row 5: drawing
  yTop = TBY1 + 5 * RH - 1500;
  await m(TBL, yTop,        'ნახაზი:',                                           600, 28000, 'S-TEXT');
  await m(TBL, yTop - 1500, 'გენერალური გეგმა — ავტოგზა, ავტოსადგომი',          500, 28000, 'S-TEXT');

  // Row 4: sheet
  yTop = TBY1 + 4 * RH - 1500;
  await m(TBL, yTop,        'ფურცელი:',                                          600, 28000, 'S-TEXT');
  await m(TBL, yTop - 3500, 'FZ-01',                                              900, 28000, 'S-TEXT');

  // Row 3: scale
  yTop = TBY1 + 3 * RH - 1500;
  await m(TBL, yTop,        'მასშტაბი:',                                         600, 28000, 'S-TEXT');
  await m(TBL, yTop - 3500, '1:200',                                              900, 28000, 'S-TEXT');

  // Row 2: date
  yTop = TBY1 + 2 * RH - 1500;
  await m(TBL, yTop,        'თარიღი:',                                           600, 28000, 'S-TEXT');
  await m(TBL, yTop - 3500, '2026-04',                                            900, 28000, 'S-TEXT');

  // Row 1: drawn by
  yTop = TBY1 + 1 * RH - 1500;
  await m(TBL, yTop,        'შემსრულებელი:',                                     600, 28000, 'S-TEXT');
  await m(TBL, yTop - 3500, 'autocad-mcp',                                        700, 28000, 'S-TEXT');

  // ---------------- TEC TABLE (K1, K2, K3) ----------------
  // Coords match site-2bldg.lsp: TX1=35000 TX2=75000 TY1=-10000 TY2=18000
  const TX1 = 35000, TX2 = 75000, TY1 = -10000, TY2 = 18000;
  const TXC1 = TX1 + 22000, TXC2 = TX1 + 32000;
  const RH2 = (TY2 - TY1) / 9;
  const trY = (i) => TY1 + i * RH2;

  await m((TX1 + TX2) / 2 - 18000, TY2 - 1500,
    'ტექნიკურ-ეკონომიკური მაჩვენებლები',
    700, 38000, 'S-TABLE');

  const trow = async (yc, l, v, mx) => {
    await m(TX1  + 500, yc + 200, l,  500, 21000, 'S-TABLE');
    await m(TXC1 + 500, yc + 200, v,  500,  9000, 'S-TABLE');
    await m(TXC2 + 500, yc + 200, mx, 500,  7500, 'S-TABLE');
  };

  await trow(trY(7), 'მაჩვენებელი',           'ფაქტიური',  'ნორმატიული');
  await trow(trY(6), 'ნაკვეთის ფართი',        '1800 მ²',   '—');
  await trow(trY(5), 'ბლოკი ა — 8 სართული',   '240 მ²',    'h = 24 მ');
  await trow(trY(4), 'ბლოკი ბ — 10 სართული',  '240 მ²',    'h = 30 მ');
  await trow(trY(3), 'სრული აშენების ფართი',  '4320 მ²',   '—');
  await trow(trY(2), 'K1  გადაფარვა',         '0.27',      '≤ 0.50');
  await trow(trY(1), 'K2  ინტენსივობა',       '2.40',      '≤ 3.50');
  await trow(TY1,    'K3  გამწვანება',        '0.38',      '≥ 0.20');

  // ---------------- LEGEND ----------------
  const LX1 = 35000, LY1 = 22000, LX2 = 75000, LY2 = 50000;
  await m((LX1 + LX2) / 2 - 18000, LY2 - 1500,
    'აღნიშვნები',
    700, 38000, 'S-TABLE');

  const lg = async (yc, txt) =>
    m(LX1 + 1500, yc, txt, 450, 38000, 'S-TABLE');

  await lg(LY2 -  4500, '■ რუხი — საცხოვრებელი შენობა (ცემენტ-ბეტონი)');
  await lg(LY2 -  7500, '■ ცისფერი — სატრანსპორტო გზა (ასფალტი 6.0 მ)');
  await lg(LY2 - 10500, '■ ლურჯი — ავტოსადგომი (2.5 × 5.0 მ)');
  await lg(LY2 - 13500, '■ მწვანე — გამწვანება და ხეები');
  await lg(LY2 - 16500, '■ წერტილოვანი — ქვეითთა ბილიკი');
  await lg(LY2 - 19500, '----- წყვეტილი ხაზი — ნაგებობის ხაზი (setback)');
  await lg(LY2 - 22500, 'ცენტრალური ქუჩიდან შესასვლელი — სამხრეთიდან');

  console.log('[labels] done');
})().catch(e => {
  console.error('[labels] ERROR:', e.response?.status, e.response?.data || e.message);
  process.exit(1);
});
