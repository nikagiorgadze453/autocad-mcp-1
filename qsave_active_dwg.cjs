const axios = require("axios");

const URL = process.env.AUTOCAD_PLUGIN_URL || "http://localhost:12345/";
const TOKEN = process.env.MCP_AUTOCAD_TOKEN || "default-secret-token";

axios
  .post(
    URL,
    { command: "run_command", args: { command: '(command "_.QSAVE") (princ)' } },
    { headers: { Authorization: `Bearer ${TOKEN}` }, timeout: 60000 },
  )
  .then((response) => console.log(JSON.stringify(response.data)))
  .catch((error) => {
    console.error(error.response?.data || error.message);
    process.exit(1);
  });
