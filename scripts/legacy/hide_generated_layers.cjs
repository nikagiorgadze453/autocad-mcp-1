const axios = require("axios");

const URL = process.env.AUTOCAD_PLUGIN_URL || "http://localhost:12345/";
const TOKEN = process.env.MCP_AUTOCAD_TOKEN || "default-secret-token";

async function post(command, args) {
  return axios.post(
    URL,
    { command, args },
    { headers: { Authorization: `Bearer ${TOKEN}` }, timeout: 60000 },
  );
}

(async () => {
  const response = await post("get_layers", {});
  const layers = response.data.layers || response.data;
  let hidden = 0;
  for (const layer of layers) {
    if (/^(NGRG-|BEST-)/.test(layer.name)) {
      await post("set_layer_properties", { name: layer.name, isOff: true });
      hidden += 1;
    }
  }
  await post("run_command", {
    command: '(command "_.ZOOM" "_W" "476315,4618110" "476765,4618475") (princ)',
  });
  console.log(`hidden-generated-layers=${hidden}`);
})().catch((error) => {
  console.error(error.response?.data || error.message);
  process.exit(1);
});
