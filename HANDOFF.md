# HANDOFF — paste this into a new chat

> **How to use:** start a new chat in Cursor with the workspace
> `C:\Users\PCZONE.GE\autocad-mcp` open, then attach this file with
> `@HANDOFF.md`. Combined with `AGENTS.md` and `.cursor/rules/*.mdc`
> the new chat will have full context.

**Recent work (rules, skills, headless Python, MCP tools):** read **§9**
below first if you are continuing that thread.

---

## 1. Environment (already installed and working)

| Component | Version / Path |
|---|---|
| Node.js | installed, on PATH |
| .NET SDK | 8.0 + 10.0 (`winget`) |
| AutoCAD | Architecture 2027 — `C:\Program Files\Autodesk\AutoCAD 2027\` |
| MCP server | `C:\Users\PCZONE.GE\autocad-mcp\dist\index.js` |
| .NET plugin | `C:\Users\PCZONE.GE\autocad-mcp\autocad-plugin\bin\Debug\net10.0-windows\AutoCAD.MCP.Plugin.dll` |
| Plugin target | `net10.0-windows`, refs from AutoCAD 2027 folder |
| Plugin port | `http://localhost:12345` |
| Shared token | `MCP_AUTOCAD_TOKEN=default-secret-token` |

`mcp.json` entry already in `C:\Users\PCZONE.GE\.cursor\mcp.json`:

```json
"autocad": {
  "command": "node",
  "args": ["C:\\Users\\PCZONE.GE\\autocad-mcp\\dist\\index.js"],
  "env": {
    "AUTOCAD_PLUGIN_URL": "http://localhost:12345",
    "MCP_AUTOCAD_TOKEN": "default-secret-token",
    "AUTOCAD_CONSOLE_PATH": "C:\\Program Files\\Autodesk\\AutoCAD 2027\\accoreconsole.exe",
    "AUTOCAD_SCRIPTS_DIR": "C:\\Users\\PCZONE.GE\\autocad-mcp\\scripts"
  }
}
```

## 2. Bring-up checklist before any AutoCAD work

1. AutoCAD 2027 must be open with **a drawing already on screen**.
2. In AutoCAD command line: `NETLOAD` → pick the plugin DLL above.
3. AutoCAD should print: `[MCP] Server listening on http://localhost:12345/`
4. From this chat, call any AutoCAD MCP tool. If you get `ECONNREFUSED`,
   the user needs to redo `NETLOAD` (most common cause: AutoCAD opened a
   different document and the plugin context was dropped).

## 3. Confirmed bugs and their workarounds

| Symptom | Cause | Workaround |
|---|---|---|
| Georgian text shows as `?` | PowerShell mangles UTF-8 in the HTTP body | Use a Node.js script (`axios.post`) — see `send_georgian.js` |
| Georgian still `?` even from Node | Current text style font has no Georgian glyphs | Prepend MText with `\FSylfaen|b0|i0;` |
| `measure_area` on Hatch → `eNotApplicable` | Plugin querying area on Hatch entity crashes | Don't query hatches — measure the parent rectangle/polyline instead |
| MCP commands hang for 30+ s | AutoCAD has a modal dialog open ("Save changes?", file picker, …) | Tell the user to look at AutoCAD and click the dialog |
| Plugin "connection lost" after `OPEN` / `NEW` | AutoCAD changed active document | User re-runs `NETLOAD` |
| Many sequential `create_*` calls time out | HTTP queue saturated by AutoCAD's single command thread | Write a single `.lsp` file in `scripts/` and call **`run_lsp_script`** instead |
| Huge inline LISP string in `run_command` times out | Same as above — too long for single HTTP call | Save as `scripts/<name>.lsp` and use `run_lsp_script` |

## 4. Patterns that work

### 4.1 Initialize a new drawing

```lisp
(setvar "CMDECHO" 0)
(setvar "OSMODE" 0)
(setvar "INSUNITS" 4)
(setvar "MEASUREMENT" 1)
(command "_.-STYLE" "GEO" "Sylfaen.ttf" "0" "1" "0" "N" "N" "N")
(command "_.-LAYER" "_M" "WALL"  "_C" "7" "" "")
(command "_.-LAYER" "_M" "WALL-INNER" "_C" "8" "" "")
(command "_.-LAYER" "_M" "DOOR"  "_C" "4" "" "")
(command "_.-LAYER" "_M" "WINDOW" "_C" "5" "" "")
(command "_.-LAYER" "_M" "FURN"  "_C" "3" "" "")
(command "_.-LAYER" "_M" "FIX"   "_C" "6" "" "")
(command "_.-LAYER" "_M" "GRID"  "_C" "1" "" "")
(command "_.-LAYER" "_M" "DIM"   "_C" "2" "" "")
(command "_.-LAYER" "_M" "TEXT"  "_C" "7" "" "")
(command "_.-LAYER" "_M" "TITLE" "_C" "7" "" "")
```

### 4.2 Send Georgian via Node (UTF-8 safe)

```js
const axios = require('axios');
const URL = 'http://localhost:12345/mcp';
const TOKEN = 'default-secret-token';
const send = (tool, args) =>
  axios.post(URL, { tool, arguments: args }, {
    headers: { 'Content-Type':'application/json; charset=utf-8',
               'Authorization': `Bearer ${TOKEN}` }
  });
const ge = t => `\\FSylfaen|b0|i0;${t}`;
await send('create_mtext', { x: 4500, y: 28000,
  text: ge('ფუნდამენტის გეგმა  -  კ-44'),
  height: 600, width: 25000, layer: 'TEXT' });
```

### 4.3 Big drawing via single LISP file

```js
// 1. write scripts/<name>.lsp
// 2. one MCP call:
await send('run_lsp_script', { file: '<name>.lsp' });
```

This is the **fastest and most reliable** path for >20 entities or any
3D work. AutoCAD processes everything in one command stream.

### 4.4 Insert a reference DWG as xref

```lisp
(command "_.-XATTACH"
  "C:/Users/PCZONE.GE/Downloads/wetransfer_03_xref_saproeqto_2026-04-29_1038/03_xref_saproeqto/xref_topo.dwg"
  "0,0,0" 1 1 0)
```

## 5. What has been built so far in this project

| File | Purpose |
|---|---|
| `scripts/house3d.lsp` | 3D house: walls (BOX), floor, roof, SW iso view, conceptual visual style. Run with `run_lsp_script`. |
| `send_georgian.js` | Node script that re-labels a drawing's MText handles with Sylfaen-encoded Georgian |
| `draw_house_3d.js` / `draw_house_3d_v2.js` | First attempts at 3D house from Node (replaced by `house3d.lsp` for speed) |
| `draw_2bed.js` | Full 2-bedroom 2D plan: walls (filled), doors, windows, furniture, fixtures, dimensions, Georgian labels |

We have validated that:
- Drawing primitives (line, circle, rectangle, polyline, arc, hatch).
- 3D primitives (BOX, EXTRUDE, visual styles).
- Block creation, layer creation, MText, dim styles.
- `run_command` (single LISP), `run_lsp_script` (file LISP).
- xref attach via LISP.

## 6. Conventions enforced by `.cursor/rules/*.mdc`

- All numeric coords in **mm**.
- All user-facing text in **Georgian** with Sylfaen.
- Standard **layer set** + colors.
- Standard **wall thicknesses** and **room minimums** (СНиП / Neufert).
- Standard **title block** with 6 fields.
- Sheet codes follow the existing project nomenclature (`კ-…`, `A-…`,
  `FZ-…`, `MZL…`, `CZ…`, `CI…`).

## 7. Reference library locations (raw documents)

- Tbilisi ordinances + Neufert + Raumpilot + СНиП + NCS 3.1 :
  `C:\Users\PCZONE.GE\Downloads\wetransfer_03_xref_saproeqto_2026-04-29_1038\kanonmdebloba\`
- Multi-building site xref project :
  `…\03_xref_saproeqto\` and `…\04_Xref_saproeqto\`
- GRG (general plan) sheet set + 32 PDF sheets :
  `C:\Users\PCZONE.GE\Downloads\wetransfer_19_xref_grg_2026-04-29_1051\`
  (master `GRG to PDF.dwg`, xrefs in `19_xref_grg\`).

Full per-file index is in `.cursor/rules/03-references.mdc`.

## 8. Next-step ideas (none done yet)

- Parse `14-39_konsolodirebuli.pdf` for K-1/K-2/K-3 coefficients,
  setbacks, max heights → bake into `.cursor/rules/04-tbilisi-zoning.mdc`.
- Add `scripts/init-drawing.lsp` (the §4.1 block) so every new drawing
  starts the same.
- Add `scripts/title-block-A1.lsp` for one-call A1 title-block insertion.
- Create a `block-library/` of reusable Georgian-labelled blocks
  (door, window, toilet, sink, bath, kitchen counter, etc.).

---

## 9. Summary for another agent — what was added / changed (extended session)

This section is for anyone picking up the repo **without** the full chat
history. It covers office rules, skills, headless tooling, MCP
extensions, and installs.

### 9.1 Stage plan analysis pipeline (Drawing1 / georeferenced clusters)

- **LISP dumps:** `scripts/dump-stage.lsp`, `scripts/dump-stage-deep.lsp`
  — full modelspace snapshots to text (handles, layers, bbox, dims,
  polylines, inserts).
- **Node parsers:** `analyze_stage.cjs`, `sweep_m2.cjs`, `find_target.cjs`,
  `analyze_v2.cjs`, `analyze_v3.cjs` — classify walls/doors/windows,
  per-`bina` aggregation, dimension values (watch `DIMLFAC`: dims may be
  in metres while drawing units are mm).
- **Reports:** `STAGE_PLAN_REPORT.md` (English), `STAGE_PLAN_REPORT_GE.docx`
  (Georgian via `generate_report_docx.cjs` + `docx` npm package).
- **Gotcha:** drawings often contain **two copies** of geometry (local +
  UTM-mm); analysis for real-world coords must use the georeferenced copy.
- **Gotcha:** if direct MCP calls return HTTP 500, a modal dialog in
  AutoCAD may be blocking; `run_lsp_script` / `run_command` with loaded
  `.lsp` files is more reliable.

### 9.2 Cursor rules (always-on guidance)

New files under `.cursor/rules/` (YAML frontmatter + `alwaysApply: true`):

| File | Topic |
|---|---|
| `05-typology-bina.mdc` | A/B/C apartment typology, cluster geometry, validation thresholds |
| `06-grg-coefficients.mdc` | K1, K2, K2-1/FAR, K3, Tbilisi FZ table, setbacks, reporting rows |
| `07-lisp-recipes.mdc` | Copy-paste LISP snippets (Sylfaen, layers, xref, areas, plot) |
| `08-sheet-codes.mdc` | Sheet codes (`ა-`, `კ-`, `FZ-`, `MZL-`, `CI*`, …), xref expectations |
| `09-snip-neufert.mdc` | СНиП + Neufert distilled (rooms, stairs, parking, accessibility) |
| `10-cyrillic-purge.mdc` | Legacy layer rename + Arial `c204` MText migration procedure |
| `11-validation.mdc` | Seven-stage validation pipeline + failure JSON format |
| `12-external-libraries.mdc` | Curated third-party repos (Lee Mac, ezdxf, CAD_to_GIS, PyRx, …) |

Existing rules `00`–`04` stay authoritative for Georgian text, title
block, units/layers, references, MCP workflow.

### 9.3 Cursor skills (invoke by name when relevant)

Under `.cursor/skills/<name>/SKILL.md`:

| Skill | Purpose |
|---|---|
| `analyze-stage-plan` | Dump → parse → reports (MD + Georgian DOCX) |
| `draw-bina-b-type` | Parametric B-type flat via `scripts/templates/bina-b-type.lsp` |
| `generate-fz-sheet` | GRG FZ skeleton via `scripts/templates/fz-sheet.lsp` |
| `remap-cyrillic-layers` | Layer remap + optional font migration |
| `compute-grg-k` | K-coefficients via `scripts/utilities/compute-grg-k.lsp` |
| `validate-and-issue-pdf` | Full validation + PDF naming convention |
| `steal-from-template` | Lee Mac Steal wrapper — import styles/blocks from reference DWGs |
| `dxf-headless-batch` | Batch DXF ops without AutoCAD (`ezdxf_batch.py`) |
| `cad-to-gis` | CAD layers → GeoJSON/SHP/GPKG (`cad_to_gis.py`) |

### 9.4 `scripts/` layout (beyond legacy root `.lsp` files)

```
scripts/
  templates/     bina-b-type.lsp, fz-sheet.lsp
  utilities/     load-sylfaen.lsp, layer-remap-to-standard.lsp,
                 compute-grg-k.lsp, steal-from-template.lsp,
                 dwg-to-dxf-batch.lsp   (DWG→DXF using AutoCAD; ODA optional)
  validators/    check-min-rooms.lsp, check-title-block.lsp
  python/        ezdxf_batch.py, cad_to_gis.py
  vendor/        README.md; lee-mac/Steal.lsp (downloaded, often gitignored);
                 autocad-lisp-toolkit/ (cloned MIT donor repo)
```

`AGENTS.md` lists skills, scripts tree, definition-of-done checklists, and
MCP tool inventory — keep it in sync when adding tools.

### 9.5 MCP server (`src/index.ts`) — new high-level tools

Implemented in TypeScript (some forward to AutoCAD plugin; two are
**pure subprocess**, no AutoCAD):

| Tool | Behaviour |
|---|---|
| `analyze_stage_plan` | `run_lsp_script` on `dump-stage-deep.lsp`, then optional `node analyze_v3.cjs` + `generate_report_docx.cjs` |
| `compute_grg_metrics` | Loads `compute-grg-k.lsp`, runs `(c:GrgK <floors>)`, reads `grg-k-report.json`, optional FZ limit check |
| `migrate_layers_to_standard` | Backup + `layer-remap-to-standard.lsp` + optional font swap + purge |
| `audit_dwg_headless` | `python scripts/python/ezdxf_batch.py` (audit / optional purge / summary) |
| `cad_to_shapefile` | `python scripts/python/cad_to_gis.py` — default **`geojson`**, one file per CAD layer |

JSON tool descriptors live under the Cursor MCP cache folder
(`…/mcps/user-autocad/tools/*.json`) — mirror changes there if the IDE
does not auto-sync from the server.

### 9.6 AutoCAD .NET plugin (`autocad-plugin/CommandProcessor.cs`)

Stub `switch` cases + stub methods for `analyze_stage_plan`,
`compute_grg_metrics`, `migrate_layers_to_standard` — real orchestration
is still in the Node MCP server until ported in-process.

### 9.7 Python stack (installed on this machine for headless work)

- **`requirements.txt`** at repo root pins: `ezdxf`, `fiona`, `shapely`,
  `pyproj`, etc.
- **Install:** `pip install -r requirements.txt`
- **Why fiona, not raw `pip install gdal`:** GDAL often fails to build on
  Windows + Python 3.12; fiona bundles a working GDAL for this stack.
- **ODA File Converter:** **not required** if you convert DWG→DXF using
  AutoCAD (`SAVEAS` / `DXFOUT`) or `scripts/utilities/dwg-to-dxf-batch.lsp`.
  ODA is only for **fully headless** DWG ingestion without AutoCAD.
  (It is **free** from Open Design Alliance but registration-gated.)

### 9.8 Third-party files actually on disk

- **`scripts/vendor/lee-mac/Steal.lsp`** — Lee Mac Steal v1.8 (from
  `https://www.lee-mac.com/lisp/StealV1-8.lsp`). Path expected by
  `steal-from-template.lsp`. Often **gitignored** — see
  `scripts/vendor/README.md`.
- **`scripts/vendor/autocad-lisp-toolkit/`** — shallow clone of
  `vjspab/autocad-lisp-toolkit` (MIT urban-planning LISP donors).

### 9.9 `.gitignore` additions worth knowing

- `temp/*.dxf`, `temp/gis_out/` — smoke-test artifacts
- `scripts/vendor/lee-mac/` — Lee Mac redistribution policy
- `scripts/vendor/autocad-lisp-toolkit/.git/` — keep clone out of git if desired
- Python caches / `.venv/`

### 9.10 Known limitations / bugs fixed along the way

- **`ezdxf_batch.py` `purge`:** updated for ezdxf 1.4 (`is_any_layout` vs
  old `is_layout`); avoid unicode arrows in `print()` on Windows cp1252.
- **`cad_to_gis.py`:** GeoJSON default; **one file per layer** for
  `geojson` / `shp` / `gpkg` (avoids Fiona multi-layer GPKG NULL-pointer
  on Windows). Merge with `ogrmerge.py` if a single multi-layer GPKG is
  required.
- **Plugin `dotnet build`:** may fail to copy DLL to `bin/` if AutoCAD
  still has the old DLL loaded — close AutoCAD and rebuild.

---
*End of handoff. New chat: open `C:\Users\PCZONE.GE\autocad-mcp` as
workspace, attach `AGENTS.md` and this file with `@`, and you're back.*
