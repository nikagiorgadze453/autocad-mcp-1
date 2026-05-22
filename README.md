# AutoCAD MCP — Georgian Architecture Pack

> **AI-driven AutoCAD automation for Tbilisi residential and urban-planning
> projects.** Built for Georgian architects who use Cursor, Claude Code,
> or any MCP-compatible AI client.

This pack turns AutoCAD 2026 / 2027 into an AI-controlled drafting
partner. It knows:

- ✅ **Georgian text** (Sylfaen font, UTF-8, MText overrides)
- ✅ **Tbilisi GRG ordinance 14-39** + amendments (41, 57, 59, 4-13)
- ✅ **К-1 / К-2-1 / К-3 coefficients** by functional zone
- ✅ **СНиП 2.07.01-89** room minima + Neufert ergonomics
- ✅ **N41** accessibility rules
- ✅ The office's **A / B / C apartment typologies** (45 / 65 / 85 m²)
- ✅ A **7-stage validation pipeline** before any PDF goes out
- ✅ Layer migration from legacy Soviet-era DWGs (`_Pen_No__N` → standard)
- ✅ CAD ↔ GIS bridge for QGIS / cadastre work
- ✅ 45+ MCP tools wrapping geometry, query, layer, dimension, export

---

## Quick start

### Option A — Cursor

```powershell
git clone https://github.com/nikagiorgadze453/autocad-mcp-1.git
cd autocad-mcp-1
npm install
npm run build
npm run install:cursor
```

Restart Cursor. You'll see `autocad-mcp` under **MCP Tools**, and 14
office rules will auto-load in every chat.

### Option B — Claude Code

```powershell
git clone https://github.com/nikagiorgadze453/autocad-mcp-1.git
cd autocad-mcp-1
npm install
npm run build
npm run install:claude-code
```

This writes `~/.claude/CLAUDE.md` and registers the MCP server via
`claude mcp add`. Restart Claude Code.

### Option C — macOS / Linux

```bash
git clone https://github.com/nikagiorgadze453/autocad-mcp-1.git
cd autocad-mcp-1
npm install && npm run build
# for Cursor:
bash scripts/install/install-cursor.sh
# for Claude Code:
bash scripts/install/install-claude-code.sh
```

---

## Prerequisites

- **Node.js** ≥ 18
- **AutoCAD 2026** (Windows) for live drawing
- **PowerShell 7+** on Windows (or bash on macOS/Linux)
- **Python 3.10+** for headless GIS / batch ops (optional)
- **.NET 8.0 SDK** if you want to rebuild the AutoCAD plugin (optional)

Python dependencies for the GIS bridge:

```bash
pip install -r requirements.txt
```

---

## How it works

```
┌─────────────┐    MCP    ┌──────────────────┐    HTTP   ┌──────────────┐
│  AI client  │ ────────► │  autocad-mcp     │ ────────► │  AutoCAD     │
│ (Cursor /   │           │  Node MCP server │           │  + .NET      │
│  Claude)    │ ◄──────── │  + 45 tools      │ ◄──────── │  plugin      │
└─────────────┘           └──────────────────┘           └──────────────┘
                                  │
                                  │ subprocess
                                  ▼
                          ┌──────────────────┐
                          │  ezdxf / fiona   │  headless DWG / GIS
                          │  (no AutoCAD)    │
                          └──────────────────┘
```

The AI client talks to a Node MCP server. The server can either:

1. Issue HTTP calls to a **.NET plugin** loaded into a running AutoCAD
   session (interactive mode).
2. Run **`accoreconsole.exe`** scripts against `.dwg` files (headless).
3. Shell out to **Python adapters** (`ezdxf`, `fiona`, `shapely`,
   `pyproj`) for batch / GIS work that needs no AutoCAD at all.

---

## What an architect can ask for

Example prompts that work out of the box:

| Prompt | What happens |
|---|---|
| "Draw a B-type apartment, mirror it" | Generates a 65 m² 2BR with Sylfaen labels |
| "Make a GRG sheet for FZ-3" | A0 sheet skeleton with title block + xref slots |
| "What's the FAR of this parcel?" | Computes K-1 / K-2-1 / K-3 and checks vs 14-39 |
| "Clean up this legacy DWG" | Remaps `_Pen_No__N` layers + Arial→Sylfaen |
| "Export the cadastre to shapefile" | DXF/DWG → SHP/GeoPackage with EPSG:32638 |
| "Audit all 50 DWGs in this folder" | Headless ezdxf audit, no AutoCAD running |
| "Validate and issue PDF" | Runs the 7-stage pipeline, exports `GRG to PDF-<CODE>.pdf` |

Each of these maps to a **skill** (`.cursor/skills/<name>/SKILL.md`)
which the AI follows step-by-step.

---

## Files you should know about

| File | Purpose |
|---|---|
| `AGENTS.md` | The canonical brief for any AI agent (Cursor / Claude / Codex / Cline) |
| `CLAUDE.md` | Self-contained Claude Code mirror (rules inlined) |
| `.cursor/rules/*.mdc` | 14 office rule files (auto-loaded in Cursor) |
| `.cursor/skills/*/SKILL.md` | 9 skill workflows |
| `scripts/install/` | One-command installers for Cursor + Claude Code |
| `scripts/templates/` | Parametric generators (B-type apartment, GRG sheet) |
| `scripts/utilities/` | Helpers (Sylfaen loader, layer remap, K-coefficients) |
| `scripts/validators/` | Quality gates (room minima, title block) |
| `scripts/python/` | Headless adapters (ezdxf, cad_to_gis) |
| `src/index.ts` | MCP server source |
| `autocad-plugin/` | .NET plugin for live AutoCAD sessions |
| `cursor-plugin.json` | Cursor plugin manifest |
| `requirements.txt` | Python dependencies |

---

## The office rules (auto-loaded)

| Rule | Topic |
|---|---|
| 00 | Georgian text — Sylfaen, MText override, glossary |
| 01 | 6-row title block + paper sizes |
| 02 | mm units, wall thicknesses, openings, 11-layer set |
| 03 | Index of legislation, standards, reference DWGs |
| 04 | MCP workflow + validation order |
| 05 | A / B / C apartment typology (45 / 65 / 85 m²) |
| 06 | GRG K-coefficients + Tbilisi 14-39 thresholds |
| 07 | 18 LISP recipes (R01–R18) |
| 08 | Sheet codes (ა-, კ-, FZ-, MZL-, CI*) |
| 09 | СНиП + Neufert quick reference |
| 10 | Cyrillic / legacy layer purge procedure |
| 11 | 7-stage validation pipeline |
| 12 | Curated 3rd-party libs (Lee Mac, ezdxf, fiona, PyRx, IFC) |
| 13 | UNI A2-A4 / B1-B4 — real office DWG reference set |

---

## License

MIT — see `LICENSE`. Reference PDFs (Neufert, Raumpilot, СНиП,
ordinance 14-39) are **not** bundled — they live outside this repo. The
office maintains them locally.

Lee Mac scripts and other 3rd-party LISP are vendored under
`scripts/vendor/` with their original license terms — see
`scripts/vendor/README.md`.

---

## Contributing

This is the **internal toolkit of a Georgian architecture office**
made public so other studios can adopt it. PRs that match the spirit
of the rules (Georgian-first, mm-first, 14-39-aware) are welcome.

Open an issue on [GitHub](https://github.com/nikagiorgadze453/autocad-mcp-1)
if you find something wrong or want a new skill.

---

## Credits

Built on top of:

- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)
- [Lee Mac's Steal.lsp](https://www.lee-mac.com/steal.html)
- [ezdxf](https://github.com/mozman/ezdxf) (MIT) — headless DXF/DWG
- [fiona / shapely / pyproj](https://github.com/Toblerity/Fiona) — GIS layer
- The Tbilisi architecture community
