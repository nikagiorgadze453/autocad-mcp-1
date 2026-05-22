# INSTALL — AutoCAD MCP Georgian Architecture Pack

Three supported clients, all idempotent installers.

---

## 1. Prerequisites (any client)

| Required | Version | Why |
|---|---|---|
| Windows 10 / 11 | — | AutoCAD + .NET plugin |
| Node.js | ≥ 18 | MCP server |
| AutoCAD | 2026 / 2027 | live drawing target |
| PowerShell | 7+ | install scripts |
| Python | 3.10+ | headless / GIS (optional) |
| .NET SDK | 8.0 | rebuild the AutoCAD plugin (optional) |

```powershell
node --version    # >= 18
pwsh --version    # 7+
python --version  # >= 3.10
```

---

## 2. Clone + build

```powershell
git clone https://github.com/nikagiorgadze453/autocad-mcp-1.git
cd autocad-mcp-1
npm install
npm run build
```

This produces `dist/index.js` — the MCP server entry point.

Optional (GIS / headless DWG):

```powershell
pip install -r requirements.txt
```

---

## 3. Choose your AI client

### 3a. Cursor

```powershell
npm run install:cursor
```

What this does:

1. Copies `.cursor/rules/*.mdc` → `~/.cursor/rules/`
2. Copies `.cursor/skills/*` → `~/.cursor/skills/`
3. Adds `autocad-mcp` to `~/.cursor/mcp.json`

Restart Cursor. Verify:

- Open chat → MCP Tools panel shows `autocad-mcp` with 45+ tools.
- Type any prompt → rules from `.cursor/rules` appear in the system
  context automatically.

### 3b. Claude Code

```powershell
npm run install:claude-code
```

What this does:

1. Copies `CLAUDE.md` → `~/.claude/CLAUDE.md` (user-level brief).
2. Runs `claude mcp add autocad-mcp ... -- node dist/index.js` (if
   `claude` CLI is on PATH).

Restart Claude Code. Verify:

```powershell
claude mcp list
# autocad-mcp  active
```

Also, the project-level `CLAUDE.md` in the repo loads automatically
when you start Claude Code inside this folder.

### 3c. OpenAI Codex / Copilot Workspace / Cline / Continue

Any tool that reads **`AGENTS.md`** at session start will pick up the
office rules. For MCP support, add the server manually to that tool's
config — the binary path is `dist/index.js`.

Example (Cline):

```json
{
  "mcpServers": {
    "autocad-mcp": {
      "command": "node",
      "args": ["C:/Users/PCZONE.GE/autocad-mcp/dist/index.js"],
      "env": {
        "AUTOCAD_PLUGIN_URL": "http://localhost:12345",
        "MCP_AUTOCAD_TOKEN": "default-secret-token",
        "AUTOCAD_SCRIPTS_DIR": "C:/Users/PCZONE.GE/autocad-mcp/scripts"
      }
    }
  }
}
```

---

## 4. AutoCAD plugin (live drawing mode)

For interactive drawing the MCP server talks to a .NET plugin loaded
in AutoCAD:

```powershell
cd autocad-plugin
dotnet build -c Release
```

Then in AutoCAD:

1. `NETLOAD` command.
2. Select `autocad-plugin/bin/Release/net8.0-windows/AutoCAD.MCP.Plugin.dll`.
3. Set the token env var **before launching AutoCAD**:
   ```powershell
   setx MCP_AUTOCAD_TOKEN "default-secret-token"
   ```
4. Wait for the log line: `[MCP] Server listening on http://localhost:12345/`.

You can now drive AutoCAD from any AI client via the MCP tools.

---

## 5. Verify the installation

Open a new chat in your AI client and ask:

> ბ ტიპის ბინა დახაზე (draw a B-type apartment)

The AI should:

1. Look up rule `05-typology-bina.mdc` for the spec.
2. Load `scripts/utilities/load-sylfaen.lsp`.
3. Create the standard 11 layers.
4. Generate the apartment using `scripts/templates/bina-b-type.lsp`.
5. Run `validate_drawing` and `compute_metrics`.

If any step fails, re-run the installer with `-Force`.

---

## 6. Updating

```powershell
git pull
npm install
npm run build
npm run install:cursor     # or install:claude-code
npm run sync-rules         # warns if CLAUDE.md is stale
```

The installers are idempotent — re-running is always safe.

---

## 7. Uninstall

```powershell
# Cursor
Remove-Item ~\.cursor\rules\0?-* -ErrorAction SilentlyContinue
Remove-Item ~\.cursor\skills\analyze-stage-plan,~\.cursor\skills\draw-bina-b-type -Recurse -ErrorAction SilentlyContinue
# edit ~\.cursor\mcp.json to remove the autocad-mcp entry

# Claude Code
claude mcp remove autocad-mcp --scope user
Remove-Item ~\.claude\CLAUDE.md
```

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `claude` CLI not found | Install from https://claude.com/code |
| `pwsh` not found | Install PowerShell 7+ (`winget install Microsoft.PowerShell`) |
| Georgian renders as `?` | You used PowerShell to send text — use a `.lsp` instead |
| MCP shows 0 tools | Check `~/.cursor/mcp.json` path matches `dist/index.js` |
| AutoCAD plugin "Connection refused" | Plugin not loaded — run `NETLOAD` |
| `ezdxf` errors on DWG | Install ODA File Converter OR use `dwg-to-dxf-batch.lsp` in AutoCAD |
