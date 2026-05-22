# AGENTS.md — autocad-mcp

> **The canonical instruction file for any AI coding agent working in
> this repository.** Cursor, Claude Code, OpenAI Codex, Copilot
> Workspace, and Cline all read this file at session start. Keep it
> tool-agnostic — no Cursor-only or Claude-only syntax.

This project drives **Autodesk AutoCAD 2026 / 2027** from any AI agent
through the `autocad-mcp` Model Context Protocol server. It encodes the
office standard for **Georgian / Tbilisi residential and urban-planning
projects** — units, layers, typologies, GRG coefficients, and the legal
toolkit (ordinance 14-39 + amendments, СНиП 2.07.01-89, Neufert).

## TL;DR for any new agent

1. **Units are millimeters.** Always. Never meters, never centimeters.
2. **User-facing text is Georgian.** Use Sylfaen font via inline override
   `\\FSylfaen|b0|i0;...` in every MText.
3. **Never send Georgian over PowerShell** — it downgrades to `?`. Use
   Node.js or write `.lsp` files instead.
4. Prefer `run_lsp_script` over many `run_command` calls. Per-command
   HTTP round-trips kill performance.
5. Drawings must pass the **7-stage validation pipeline** before issue.
6. The office has a fixed **A / B / C apartment typology** — do not
   invent new sizes.
7. The Tbilisi GRG limits (K-1 / K-2-1 / K-3) come from ordinance 14-39
   and amendments — read the PDFs before quoting numbers.

---

## Rules — the canonical knowledge base

These 14 rule files together encode the office standard. Read them on
demand; they are also auto-loaded by Cursor and mirrored to `CLAUDE.md`
for Claude Code.

| File | Topic |
|---|---|
| `.cursor/rules/00-georgian-text.mdc` | Sylfaen font, MText override, Georgian glossary |
| `.cursor/rules/01-title-block.mdc`   | 6-row Georgian title block, sheet codes, paper sizes |
| `.cursor/rules/02-units-dims.mdc`    | mm units, wall thicknesses, openings, 11-layer set |
| `.cursor/rules/03-references.mdc`    | Index of legislation, standards, reference DWGs (xref sets) |
| `.cursor/rules/04-autocad-mcp-workflow.mdc` | MCP tool usage, validation order |
| `.cursor/rules/05-typology-bina.mdc` | A (~45 m²) / B (~65 m²) / C (~85 m²) apartment specs |
| `.cursor/rules/06-grg-coefficients.mdc` | K-1 / K-2-1 / K-3 / FAR, Tbilisi 14-39 thresholds |
| `.cursor/rules/07-lisp-recipes.mdc`  | 18 copy-paste LISP recipes (R01-R18) |
| `.cursor/rules/08-sheet-codes.mdc`   | Sheet code map (ა-, კ-, FZ-, MZL-, CI*, CT*, CV*, CZ*) |
| `.cursor/rules/09-snip-neufert.mdc`  | СНиП 2.07.01-89 + Neufert minima (rooms, stairs, doors) |
| `.cursor/rules/10-cyrillic-purge.mdc` | Migrate legacy `_Pen_No__N` layers + `\fArial\|c204` text |
| `.cursor/rules/11-validation.mdc`    | 7-stage validation pipeline |
| `.cursor/rules/12-external-libraries.mdc` | Curated 3rd-party libs (Lee Mac, ezdxf, fiona, PyRx, IFC) |
| `.cursor/rules/13-uni-reference-works.mdc` | UNI A2-A4 / B1-B4 — real office DWG reference set |

**For Claude Code** these are mirrored into a single `CLAUDE.md` at the
repo root. Keep both in sync via `npm run sync-rules`.

---

## Working agreements (the hard rules)

1. **Always millimeters**, never meters.
2. **All user-facing text is Georgian** unless told otherwise.
3. **Use Node.js, not PowerShell**, for any HTTP call that contains
   non-ASCII text (Georgian, Cyrillic). PowerShell on Windows uses
   cp1252 and drops everything else.
4. Prefer **`run_lsp_script`** with a single `.lsp` file in `scripts/`
   for any drawing that has more than ~20 commands — it is much faster
   and avoids per-command HTTP timeouts.
5. Before drawing, **load the Georgian text style once**:
   ```
   (load "C:/Users/PCZONE.GE/autocad-mcp/scripts/utilities/load-sylfaen.lsp")
   ```
6. Create the standard 11 layers from `02-units-dims.mdc` at the start
   of every new drawing.
7. Save under a meaningful Georgian or transliterated name, e.g.
   `kedlebi-fundament-k44.dwg`, not `Drawing1.dwg`.
8. **Never commit secrets.** No PATs, no client emails, no `.env` files.

---

## How to consult reference material

- **Legislation & standards (PDF):**
  `C:\Users\PCZONE.GE\Downloads\wetransfer_03_xref_saproeqto_*\kanonmdebloba\`
  — Tbilisi ordinances `14-39`, `41`, `57`, `59`, `4-13`, accessibility
  `N41`, Soviet code `СНиП 2.07.01-89`, NCS 3.1, Neufert, Raumpilot.
- **Reference DWGs (xref sets):**
  `C:\Users\PCZONE.GE\Downloads\wetransfer_03_xref_saproeqto_*\03_xref_saproeqto\`
  and `wetransfer_19_xref_grg_*\19_xref_grg\` — topography, cadastre,
  buildings, roads, zoning, designed overlays.
- **Real office works (UNI set):**
  `C:\Users\PCZONE.GE\Downloads\UNI A2-A4.dwg`, `UNI B1-B4.dwg` — see
  rule `13-uni-reference-works.mdc`.

For DWG references, attach them as **xrefs** rather than copying
geometry:
```
(command "_.-XATTACH" "C:/path/to/xref.dwg" "0,0,0" "1" "1" "0")
```

---

## Skills (invoke explicitly with the name)

The skills system is Cursor-native; for Claude Code see
`docs/CLAUDE_CODE_SETUP.md` — equivalent slash commands are documented
there.

| Skill | What it does |
|---|---|
| `analyze-stage-plan` | Deep analysis + Georgian DOCX report of a stage plan |
| `draw-bina-b-type` | Generates the standard B-type (~65 m²) flat |
| `generate-fz-sheet` | Generates a GRG sheet skeleton (FZ-/MZL-/CI*) |
| `remap-cyrillic-layers` | Migrates legacy layers to the project standard |
| `compute-grg-k` | Computes K-1 / K-2-1 / K-3 against ordinance 14-39 |
| `validate-and-issue-pdf` | Runs the 7-stage pipeline and emits a PDF |
| `steal-from-template` | Imports blocks/layers/styles from a reference DWG via Lee Mac's Steal.lsp |
| `dxf-headless-batch` | Batch DXF/DWG ops (audit, purge, layer rename, font swap) via ezdxf — no AutoCAD required |
| `cad-to-gis` | DXF/DWG → Shapefile / GeoPackage with EPSG reprojection |
| `extract-rooms` | Per-room polygons + m² via shapely polygonisation + Latin→Mkhedruli label matching |
| `extract-blocks` | Builds a stand-alone block library from any DWG (`outputDir/*.dwg` + `index.json`) |
| `compute-insolation` | Per-room direct-sunlight hours for the СНиП 2.07.01-89 §6 daylight check |

---

## Scripts folder

`scripts/` is whitelisted in `mcp.json` via `AUTOCAD_SCRIPTS_DIR`.
Anything saved there can be invoked with the `run_lsp_script` MCP tool.

```
scripts/
├── install/                      one-command setup for end users
│   ├── install-cursor.ps1        copies rules+skills to user's .cursor/
│   ├── install-cursor.sh         macOS / Linux equivalent
│   ├── install-claude-code.ps1   writes ~/.claude/CLAUDE.md, runs claude mcp add
│   ├── install-claude-code.sh    macOS / Linux equivalent
│   └── sync-rules.ps1            CLAUDE.md drift check vs .cursor/rules
├── templates/                    parametric generators
│   ├── bina-b-type.lsp           2BR ~65 m² apartment
│   └── fz-sheet.lsp              GRG sheet skeleton (A0)
├── utilities/                    helpers
│   ├── load-sylfaen.lsp          text style + units bootstrap
│   ├── layer-remap-to-standard.lsp  legacy → standard layers
│   ├── compute-grg-k.lsp         K-coefficients
│   ├── steal-from-template.lsp   Lee Mac Steal wrapper
│   ├── dwg-to-dxf-batch.lsp      AutoCAD-side DWG→DXF for ezdxf
│   ├── uni-dump.lsp + .scr       headless analyzer for the UNI reference set
│   └── git-push-with-token.ps1   PAT push helper
├── validators/                   quality gates
│   ├── check-min-rooms.lsp       СНиП minima
│   └── check-title-block.lsp     title block presence
├── python/                       headless / GIS adapters
│   ├── ezdxf_batch.py            audit, purge, rename, font swap
│   ├── cad_to_gis.py             DXF → Shapefile / GeoPackage
│   └── summarize_uni_dumps.js    distil UNI dumps into memory/
├── vendor/                       third-party (license-aware)
│   ├── README.md                 how to populate each entry
│   ├── lee-mac/                  Steal.lsp etc (git-ignored)
│   └── autocad-lisp-toolkit/     MIT donor scripts (git-ignored)
├── legacy/                       frozen one-off Node scripts (see README)
└── extract_context.lsp           context extractor
```

> **Top-level `analyze_v3.cjs` and `generate_report_docx.cjs`** are
> deliberately kept at the repo root — `src/index.ts` invokes them
> by relative path (cwd-rooted) from the `analyze_stage_plan` MCP
> tool.

Add new scripts into the right subfolder and document them above.

---

## Definition of Done

A drawing is "done" only when **every** check below passes for the
sheet's drawing type.

### Architectural plan (`ა-NN`)

- [ ] All 11 standard layers exist (rule 02)
- [ ] Walls 600 / 400 / 100 / 80 (rules 02, 05)
- [ ] Doors / windows from the standard schedule (rule 05 + 02)
- [ ] All rooms ≥ СНиП minima (rule 09)
- [ ] Glazing ≥ 1/8 of room area (rule 09)
- [ ] All labels in Georgian on Sylfaen (rule 00)
- [ ] Title block present + 6 rows filled (rule 01)
- [ ] Sheet code matches `ა-NN` convention (rule 08)
- [ ] `validate_drawing` + `compute_metrics` pass

### Foundation plan (`ფნ-NN`)

- [ ] All architectural plan items, plus:
- [ ] Footing depth ≥ frost line (≥ 600 mm in Tbilisi)
- [ ] Reinforcement ratio ≥ 0.3 % (Eurocode)
- [ ] Underlay layer + waterproofing labelled

### GRG sheet (`FZ-N`, `MZL-…`, `CI*`, `CT*`, `CV*`, `CZ*`)

- [ ] All architectural plan items, plus:
- [ ] Required xrefs attached (rule 08)
- [ ] K-1 / K-2-1 / K-3 computed and within FZ thresholds (rule 06)
- [ ] 7-row K-coefficient table inside title block area
- [ ] PDF named `GRG to PDF-<CODE>.pdf`

### Layer remap

- [ ] `layer-remap-report.txt` exists
- [ ] No `_Pen_No__N` layer remains
- [ ] No `\fArial|c204` MText override remains (unless intentional Russian)
- [ ] Purge run

---

## Common workflows

| User intent | First skill / rule |
|---|---|
| "Analyze the stage plan / give me total m²" | `analyze-stage-plan` |
| "Draw a 2BR flat / B-type" | `draw-bina-b-type` |
| "Make a GRG sheet for FZ-3" | `generate-fz-sheet` |
| "Clean up the legacy layers" | `remap-cyrillic-layers` |
| "What's the FAR / K1 of this parcel?" | `compute-grg-k` |
| "Validate / issue PDF" | `validate-and-issue-pdf` |
| "Bring layers / blocks / styles from another DWG" | `steal-from-template` |
| "Audit / purge / rename layers in N drawings" | `dxf-headless-batch` |
| "Send the cadastre to QGIS / make a shapefile" | `cad-to-gis` |
| "Use a UNI plan as the starting point" | `steal-from-template` + xref UNI Bx |
| "How many m² is each room / apartment?" | `extract-rooms` |
| "Build a block library from this DWG" | `extract-blocks` |
| "Do these rooms get enough sunlight? / СНиП §6 check" | `compute-insolation` |

---

## MCP tool inventory (high-level)

| Tool | Purpose |
|---|---|
| `run_command` | run any AutoCAD/LISP expression |
| `run_lsp_script` | run a `.lsp` file from `scripts/` |
| `execute_script_file` | run a `.scr` headless |
| `query_entities` / `count_entities` | inspect modelspace |
| `get_entity_properties` | DXF data on a single entity |
| `get_drawing_extents` / `zoom_extents` | view ops |
| `get_layers` / `list_blocks` | layer + block tables |
| `validate_drawing` / `validate_layout_quick` | checks |
| `compute_metrics` | room / area / glazing metrics |
| `analyze_stage_plan` | wraps the analyze-stage-plan skill |
| `compute_grg_metrics` | wraps the compute-grg-k skill |
| `migrate_layers_to_standard` | wraps the remap skill |
| `audit_dwg_headless` | wraps `scripts/python/ezdxf_batch.py audit` (no AutoCAD needed) |
| `cad_to_shapefile` | wraps `scripts/python/cad_to_gis.py` (no AutoCAD needed) |
| `extract_rooms` | polygonises walls + matches Georgian / Latin room labels → per-room m² |
| `extract_blocks` | exports every user block in a DWG to `outputDir/<name>.dwg` + index.json |
| `compute_insolation` | per-room sunlight hours for the СНиП 2.07.01-89 §6 daylight check |
| `export_to_image` / `batch_export` | screenshots, PDF |

Full schemas and 45+ geometry/modify/layer tools are listed in `README.md`.

---

## Sharing & distribution

Three install paths (see `docs/INSTALL.md` for the full guide):

| Audience | How |
|---|---|
| **Cursor users** | `npm run install:cursor` — copies rules + skills + MCP into `.cursor/` |
| **Claude Code users** | `npm run install:claude-code` — writes `CLAUDE.md` + registers MCP |
| **Any architect / studio** | Clone the GitHub repo, follow `README.md` |

The Cursor / Claude Code installs are **idempotent** — safe to re-run
after any rules update.

---

## Tool-specific notes

### Cursor
- Rules in `.cursor/rules/*.mdc` are auto-loaded.
- Skills live in `.cursor/skills/<name>/SKILL.md`.
- MCP servers configured in `.cursor/mcp.json` or workspace `mcp.json`.

### Claude Code
- Read `CLAUDE.md` at the repo root (mirror of these rules).
- MCP servers configured in `~/.claude/mcp.json` or via
  `claude mcp add autocad-mcp ...`.
- Skills are exposed as **slash commands** — see
  `docs/CLAUDE_CODE_SETUP.md`.

### OpenAI Codex / Copilot Workspace
- Read this `AGENTS.md` file at session start (industry standard).
- MCP server runs the same way; client config varies by tool.

### Cline / Continue
- Point them at this `AGENTS.md` via their custom-instructions field.
- MCP integration is direct via the `@modelcontextprotocol/sdk` server
  binary.

---

## License

MIT for code. Reference PDFs (Neufert, Raumpilot, etc) are **not**
redistributed — they live outside this repo by design.
