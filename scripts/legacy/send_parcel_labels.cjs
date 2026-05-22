// send_parcel_labels.cjs - Georgian labels for site-2bldg-parcel.lsp
// Coordinates in meters around the parcel centroid (CX, CY).

const axios = require('axios');
const URL   = process.env.AUTOCAD_PLUGIN_URL || 'http://localhost:12345/';
const TOKEN = process.env.MCP_AUTOCAD_TOKEN  || 'default-secret-token';

const CX = 477796.965;
const CY = 4611601.226;

const ge = (t) => `\\FSylfaen|b0|i0;${t}`;

async function call(command, args) {
  const r = await axios.post(URL, { command, args }, {
    headers: { 'Content-Type':'application/json; charset=utf-8',
               'Authorization': `Bearer ${TOKEN}` },
    timeout: 30000,
  });
  return r.data;
}
const m = (x, y, text, h, w, layer) =>
  call('create_mtext', { x, y, text: ge(text), height: h, width: w, layer });

(async () => {
  // Building labels (block centers)
  await m(CX - 5, CY - 12, 'ბლოკი ა\\P8 სართული\\P12 × 20 = 240 მ²\\Ph = 24.0 მ',
          1.2, 12, 'S-TEXT');
  await m(CX - 5, CY + 18, 'ბლოკი ბ\\P10 სართული\\P12 × 20 = 240 მ²\\Ph = 30.0 მ',
          1.2, 12, 'S-TEXT');

  // Entrance labels
  await m(CX - 1.5, CY - 26.5, 'შესასვლელი',  0.7, 8, 'S-TEXT');
  await m(CX - 1.5, CY +  3.5, 'შესასვლელი',  0.7, 8, 'S-TEXT');

  // Driveway / parking labels
  await m(CX + 11, CY - 32, 'შემოსასვლელი',                       0.8, 6, 'S-TEXT');
  await m(CX + 11, CY + 31, 'გასასვლელი',                          0.8, 6, 'S-TEXT');
  await m(CX + 17, CY,      'სატრანსპორტო გზა\\P6.0 მ',           0.9, 8, 'S-TEXT');
  await m(CX + 22, CY - 18, 'ავტოსადგომი 12 ადგ.\\P(ზედაპირული)\\P+ მიწისქვეშა',
                                                                    0.8, 12, 'S-TEXT');

  // Drawing title above buildings
  await m(CX - 25, CY + 38, 'გენერალური გეგმა',                    2.5, 50, 'S-TEXT');
  await m(CX - 25, CY + 33, 'ორი საცხოვრებელი კორპუსი — 8 და 10 სართული',
                                                                    1.3, 50, 'S-TEXT');

  // Zone label below buildings
  await m(CX - 25, CY - 38,
    'ზონა: სზ-5 — საცხოვრებელი ზონა, თბილისის ორდინანსი 14-39',
    1.2, 60, 'S-TEXT');

  // Data table (TX1 = CX+60, TY1 = CY-35, TY2 = CY+35, 9 rows of ~7.78m each)
  const TX1 = CX + 60;
  const TY1 = CY - 35;
  const TY2 = CY + 35;
  const RH  = (TY2 - TY1) / 9;
  const trY = (i) => TY1 + i * RH;
  const colA = TX1 + 1;
  const colB = TX1 + 26;
  const colC = TX1 + 39;

  // Title row (top, row index 8)
  await m(TX1 + 5, TY2 - 0.8,
    'ტექნიკურ-ეკონომიკური მაჩვენებლები',
    1.3, 45, 'S-TABLE');

  const trow = async (rowIdx, l, v, mx) => {
    const yc = trY(rowIdx) + 1;
    await m(colA, yc, l,  1.0, 24, 'S-TABLE');
    await m(colB, yc, v,  1.0, 12, 'S-TABLE');
    await m(colC, yc, mx, 1.0, 10, 'S-TABLE');
  };

  await trow(7, 'მაჩვენებელი',           'ფაქტიური',  'ნორმატიული');
  await trow(6, 'ნაკვეთის ფართი',        '14 470 მ²', '—');
  await trow(5, 'ბლოკი ა — 8 სართული',   '240 მ²',    'h = 24 მ');
  await trow(4, 'ბლოკი ბ — 10 სართული',  '240 მ²',    'h = 30 მ');
  await trow(3, 'სრული აშენების ფართი',  '4 320 მ²',  '—');
  await trow(2, 'K1  გადაფარვა',         '0.033',     '≤ 0.50');
  await trow(1, 'K2  ინტენსივობა',       '0.299',     '≤ 3.50');
  await trow(0, 'K3  გამწვანება',        '~ 0.93',    '≥ 0.20');

  console.log('[parcel-labels] done');
})().catch(e => {
  console.error('[parcel-labels] ERROR:', e.response?.status, e.response?.data || e.message);
  process.exit(1);
});
