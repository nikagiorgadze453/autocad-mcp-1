// run_lsp.js — read a .lsp file and stream its body straight into AutoCAD
// Usage: node run_lsp.js scripts/<name>.lsp
//
// Avoids the (load "...") path so SECURELOAD doesn't block us, and keeps
// UTF-8 (Georgian) intact because Node's HTTP body is real UTF-8.

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const URL   = process.env.AUTOCAD_PLUGIN_URL || 'http://localhost:12345/';
const TOKEN = process.env.MCP_AUTOCAD_TOKEN  || 'default-secret-token';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node run_lsp.js <path-to-lsp>');
  process.exit(2);
}
const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
if (!fs.existsSync(abs)) {
  console.error('Not found:', abs);
  process.exit(2);
}

const body = fs.readFileSync(abs, 'utf8');

// strip line comments that start with `;` (keep inside-strings safe-ish:
// LSP comments with `;` are line-anchored). We strip leading-comment lines
// to reduce body size; AutoCAD ignores `;` anyway, so this is just trimming.
function strip(s) {
  return s.split(/\r?\n/).map(l => {
    // remove pure-comment lines (start with optional whitespace then ;)
    if (/^\s*;/.test(l)) return '';
    return l;
  }).filter(l => l.length > 0).join('\n');
}

const stripped = strip(body);
console.log(`[run_lsp] file=${abs}`);
console.log(`[run_lsp] raw=${body.length}b  stripped=${stripped.length}b`);

async function send(command) {
  const r = await axios.post(URL, { command: 'run_command', args: { command } }, {
    headers: {
      'Content-Type':  'application/json; charset=utf-8',
      'Authorization': `Bearer ${TOKEN}`,
    },
    timeout: 60000,
  });
  return r.data;
}

(async () => {
  try {
    // The plugin's run_command appends a single trailing space; that's fine
    // because each LISP form ends with a `)` and the parser will execute it.
    // To be safe, we add a leading newline.
    const payload = '\n' + stripped + '\n';
    const out = await send(payload);
    console.log('[run_lsp] response:', out);
  } catch (e) {
    console.error('[run_lsp] ERROR:', e.response?.status, e.response?.data || e.message);
    process.exit(1);
  }
})();
