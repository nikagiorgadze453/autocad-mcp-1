// copy_reference_handles_from_dump.cjs
// Copies source reference masterplan polylines by explicit handles from parcel-v2.txt.

const fs = require("fs");
const axios = require("axios");

const URL = process.env.AUTOCAD_PLUGIN_URL || "http://localhost:12345/";
const TOKEN = process.env.MCP_AUTOCAD_TOKEN || "default-secret-token";
const DUMP = "C:/Users/PCZONE.GE/autocad-mcp/parcel-v2.txt";

const source = {
  minX: 477080,
  minY: 4618585,
  maxX: 477700,
  maxY: 4618900,
  cx: 477327.656,
  cy: 4618735.204,
};
const target = { cx: 476538.393, cy: 4618297.161 };
const factor = 0.87;

async function call(command, args) {
  const response = await axios.post(
    URL,
    { command, args },
    {
      headers: { Authorization: `Bearer ${TOKEN}` },
      timeout: 120000,
    },
  );
  return response.data;
}

function parseBlocks() {
  const text = fs.readFileSync(DUMP, "utf8");
  return text.split(/\n(?=\[\d+\] )/g).flatMap((block) => {
    const header = block.match(
      /^\[(\d+)\] layer=(.*?)\s+h=([0-9A-F]+)\s+closed=(\d+)\s+nverts=(\d+)\s+bbox=\(([-\d.]+),([-\d.]+)\s+-\s+([-\d.]+),([-\d.]+)\)/m,
    );
    if (!header) return [];
    const [, index, layer, handle, closed, nverts, minX, minY, maxX, maxY] = header;
    return [
      {
        index: Number(index),
        layer,
        handle,
        closed: closed === "1",
        nverts: Number(nverts),
        bbox: {
          minX: Number(minX),
          minY: Number(minY),
          maxX: Number(maxX),
          maxY: Number(maxY),
        },
      },
    ];
  });
}

function intersects(a, b) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

function isSourceEntity(entity) {
  if (!entity.closed) return false;
  if (!intersects(entity.bbox, source)) return false;
  const layer = entity.layer.toUpperCase();
  if (layer === "TITLE" || layer === "TEXT" || layer.includes("NGRG-") || layer.includes("BEST-")) {
    return false;
  }
  return true;
}

function extractHandles(response) {
  const candidates = [
    response?.handles,
    response?.newHandles,
    response?.copiedHandles,
    response?.result?.handles,
    response?.result?.newHandles,
    response?.entities,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.map(String);
  }
  return [];
}

async function main() {
  const entities = parseBlocks().filter(isSourceEntity);
  const handles = entities.map((entity) => entity.handle);
  if (!handles.length) throw new Error("No source handles found in parcel-v2.txt");

  const deltaX = target.cx - source.cx;
  const deltaY = target.cy - source.cy;
  const copied = [];
  for (let i = 0; i < handles.length; i += 80) {
    const chunk = handles.slice(i, i + 80);
    const response = await call("copy_entities", { handles: chunk, deltaX, deltaY });
    copied.push(...extractHandles(response));
  }

  if (copied.length) {
    for (let i = 0; i < copied.length; i += 80) {
      const chunk = copied.slice(i, i + 80);
      await call("scale_entities", {
        handles: chunk,
        baseX: target.cx,
        baseY: target.cy,
        factor,
      });
    }
  }

  await call("run_command", {
    command:
      '(command "_.-LAYER" "_M" "COPY-NOTE" "_C" "7" "" "") (command "_.TEXT" "_J" "_ML" "476360,4618450" "2.5" "0" "Copied/scaled from reference masterplan") (command "_.ZOOM" "_W" "476315,4618110" "476765,4618475") (princ)',
  });

  fs.writeFileSync(
    "C:/Users/PCZONE.GE/autocad-mcp/copy-reference-masterplan-report.txt",
    [
      "method=explicit_handles_from_parcel_dump",
      `sourceHandles=${handles.length}`,
      `copiedHandles=${copied.length}`,
      `scale=${factor}`,
      `deltaX=${deltaX.toFixed(3)}`,
      `deltaY=${deltaY.toFixed(3)}`,
      `sourceEntityIndexes=${entities.map((e) => e.index).join(",")}`,
      "",
    ].join("\n"),
    "utf8",
  );
  console.log(`[copy-reference-handles] source=${handles.length} copied=${copied.length}`);
}

main().catch((error) => {
  console.error("[copy-reference-handles] ERROR:", error.response?.data || error.message);
  process.exit(1);
});
