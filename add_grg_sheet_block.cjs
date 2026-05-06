// add_grg_sheet_block.cjs
// Adds a GRG-style frame and six-row Georgian title block for the red masterplan.

const axios = require("axios");

const URL = process.env.AUTOCAD_PLUGIN_URL || "http://localhost:12345/";
const TOKEN = process.env.MCP_AUTOCAD_TOKEN || "default-secret-token";

const boundary = [
  [477484.533, 4618658.309],
  [477448.207, 4618654.773],
  [477365.422, 4618647.239],
  [477258.223, 4618636.674],
  [477201.259, 4618631.321],
  [477139.308, 4618625.368],
  [477134.898, 4618664.28],
  [477129.791, 4618703.649],
  [477125.581, 4618734.707],
  [477122.276, 4618762.458],
  [477119.28, 4618786.704],
  [477118.765, 4618792.177],
  [477149.4, 4618796.184],
  [477189.578, 4618801.444],
  [477277.169, 4618812.655],
  [477399.965, 4618828.346],
  [477481.487, 4618839.13],
  [477523.443, 4618845.04],
  [477525.814, 4618826.275],
  [477535.616, 4618746.019],
  [477536.547, 4618739.033],
  [477496.078, 4618732.386],
  [477497.157, 4618725.52],
  [477489.078, 4618724.249],
  [477488.798, 4618726.028],
  [477443.508, 4618720.945],
  [477443.431, 4618687.149],
  [477449.519, 4618681.585],
  [477455.729, 4618679.028],
  [477481.345, 4618682.633],
];

const AX0 = [
  boundary[0][0] - boundary[5][0],
  boundary[0][1] - boundary[5][1],
];
const AX_LEN = Math.hypot(AX0[0], AX0[1]);
const AX = [AX0[0] / AX_LEN, AX0[1] / AX_LEN];
const AY = [-AX[1], AX[0]];
const ORIGIN = boundary[5];
const ANGLE_DEG = (Math.atan2(AX[1], AX[0]) * 180) / Math.PI;

function ge(text) {
  return `\\FSylfaen|b0|i0;${text}`;
}

function local(pt) {
  const dx = pt[0] - ORIGIN[0];
  const dy = pt[1] - ORIGIN[1];
  return {
    u: dx * AX[0] + dy * AX[1],
    v: dx * AY[0] + dy * AY[1],
  };
}

function world(u, v) {
  return {
    x: ORIGIN[0] + u * AX[0] + v * AY[0],
    y: ORIGIN[1] + u * AX[1] + v * AY[1],
  };
}

async function call(command, args) {
  const response = await axios.post(
    URL,
    { command, args },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${TOKEN}`,
      },
      timeout: 60000,
    },
  );
  return response.data;
}

async function safeCall(command, args) {
  try {
    return await call(command, args);
  } catch (error) {
    console.warn(`[warn] ${command}:`, error.response?.data || error.message);
    return null;
  }
}

async function layer(name, color, lineWeight) {
  await safeCall("create_layer", { name, color, lineWeight });
}

async function poly(points, layerName) {
  return safeCall("create_polyline", {
    points: points.map((p) => ({ x: p.x, y: p.y })),
    closed: true,
    layer: layerName,
  });
}

async function line(a, b, layerName) {
  await safeCall("create_line", {
    startX: a.x,
    startY: a.y,
    endX: b.x,
    endY: b.y,
    layer: layerName,
  });
}

async function mtext(u, v, text, height, width, layerName, rotation = ANGLE_DEG) {
  const p = world(u, v);
  await safeCall("create_mtext", {
    x: p.x,
    y: p.y,
    text: ge(text),
    height,
    width,
    rotation,
    layer: layerName,
  });
}

function rect(minU, minV, maxU, maxV) {
  return [
    world(minU, minV),
    world(maxU, minV),
    world(maxU, maxV),
    world(minU, maxV),
  ];
}

async function main() {
  await layer("TITLE", 7, "LineWeight025");
  await layer("TEXT", 7, "LineWeight018");

  const locals = boundary.map(local);
  const minU = Math.min(...locals.map((p) => p.u)) - 32;
  const maxU = Math.max(...locals.map((p) => p.u)) + 150;
  const minV = Math.min(...locals.map((p) => p.v)) - 36;
  const maxV = Math.max(...locals.map((p) => p.v)) + 38;

  await poly(rect(minU, minV, maxU, maxV), "TITLE");
  await poly(rect(minU + 5, minV + 5, maxU - 5, maxV - 5), "TITLE");
  await poly(rect(minU + 9, minV + 9, maxU - 9, maxV - 9), "TITLE");

  const tbW = 118;
  const tbH = 72;
  const tbMinU = maxU - tbW - 10;
  const tbMaxU = maxU - 10;
  const tbMinV = minV + 10;
  const tbMaxV = tbMinV + tbH;
  await poly(rect(tbMinU, tbMinV, tbMaxU, tbMaxV), "TITLE");
  for (let i = 1; i < 6; i++) {
    const y = tbMinV + (tbH / 6) * i;
    await line(world(tbMinU, y), world(tbMaxU, y), "TITLE");
  }
  await line(world(tbMinU + 35, tbMinV), world(tbMinU + 35, tbMaxV), "TITLE");

  const rows = [
    ["პროექტი:", "საცხოვრებელი გენგეგმა"],
    ["ნახაზი:", "გენერალური გეგმა"],
    ["ფურცელი:", "FZ-ახალი"],
    ["მასშტაბი:", "1:1000"],
    ["თარიღი:", "2026-05"],
    ["შემსრულებელი:", "AutoCAD MCP"],
  ];
  for (let i = 0; i < rows.length; i++) {
    const y = tbMaxV - 9 - i * (tbH / 6);
    await mtext(tbMinU + 3, y, rows[i][0], 1.25, 30, "TEXT");
    await mtext(tbMinU + 39, y, rows[i][1], 1.25, 72, "TEXT");
  }

  await mtext(
    (minU + maxU - tbW) / 2 - 62,
    maxV - 25,
    "საპროექტო ტერიტორიის გენერალური გეგმა",
    3.2,
    180,
    "TEXT",
  );
  await mtext(
    (minU + maxU - tbW) / 2 - 64,
    maxV - 35,
    "საცხოვრებელი განაშენიანება, გზები, პარკინგი, გამწვანება",
    1.55,
    190,
    "TEXT",
  );

  await safeCall("run_command", {
    command: '(command "_.ZOOM" "_W" "477070,4618590" "477720,4618890") (princ)',
  });
  console.log("[grg-sheet] title block and frame added");
}

main().catch((error) => {
  console.error("[grg-sheet] ERROR:", error.response?.data || error.message);
  process.exit(1);
});
