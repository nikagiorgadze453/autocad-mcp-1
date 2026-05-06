# AGENTS.md — autocad-mcp

This project drives AutoCAD 2027 from Cursor / Claude through the
`autocad-mcp` MCP server. Read these files before doing anything:

- `.cursor/rules/00-georgian-text.mdc` — how to render Georgian
- `.cursor/rules/01-title-block.mdc`   — sheet title block format
- `.cursor/rules/02-units-dims.mdc`    — units, wall thicknesses, layers
- `.cursor/rules/03-references.mdc`    — index of legislation, standards, and reference DWGs
- `.cursor/rules/04-autocad-mcp-workflow.mdc` — MCP workflow
- `.cursor/rules/05-typology-bina.mdc` — A / B / C apartment types
- `.cursor/rules/06-grg-coefficients.mdc` — K-coefficients + Tbilisi 14-39
- `.cursor/rules/07-lisp-recipes.mdc`  — copy-paste LISP snippets
- `.cursor/rules/08-sheet-codes.mdc`   — sheet code map (FZ-/MZL-/CI*)
- `.cursor/rules/09-snip-neufert.mdc`  — СНиП 2.07.01-89 + Neufert
- `.cursor/rules/10-cyrillic-purge.mdc` — layer migration procedure
- `.cursor/rules/11-validation.mdc`    — validation pipeline
- `.cursor/rules/12-external-libraries.mdc` — curated 3rd-party libs index

## Working agreements

1. **Always millimeters**, never meters.
2. **All user-facing text is Georgian** unless told otherwise.
3. **Use Node.js, not PowerShell**, for any HTTP call that contains
   non-ASCII text (Georgian, Cyrillic).
4. Prefer **`run_lsp_script`** with a single `.lsp` file in `scripts/`
   for any drawing that has more than ~20 commands — it is much faster
   and avoids per-command HTTP timeouts.
5. Before drawing, **load the Georgian text style once**:
   ```
   (load "C:/Users/PCZONE.GE/autocad-mcp/scripts/utilities/load-sylfaen.lsp")
   ```
6. Create the standard layers from `02-units-dims.mdc` once at the start
   of every new drawing.
7. Save under a meaningful Georgian or transliterated name, e.g.
   `kedlebi-fundament-k44.dwg`.

## How to consult reference material

- The PDF/DWG library lives outside this folder
  (`C:\Users\PCZONE.GE\Downloads\wetransfer_03_xref_saproeqto_*` and
  `C:\Users\PCZONE.GE\Downloads\wetransfer_19_xref_grg_*`).
- You can `Read` the PDFs directly when the user asks for something
  governed by the Tbilisi ordinances or by Neufert / Raumpilot.
- For DWG-based references, attach them as **xrefs** rather than copying
  geometry: `(command "_.-XATTACH" path 0 0 0 1 1 0)`.

## Skills (invoke explicitly with the name)

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

## Scripts folder

`scripts/` is whitelisted in `mcp.json` via `AUTOCAD_SCRIPTS_DIR`.
Anything saved there can be invoked with the `run_lsp_script` MCP tool.
The folder is now organised:

```
scripts/
├── templates/                    # parametric generators
│   ├── bina-b-type.lsp           # 2BR ~65 m² apartment
│   └── fz-sheet.lsp              # GRG sheet skeleton (A0)
├── utilities/                    # one-off helpers
│   ├── load-sylfaen.lsp          # text style + units bootstrap
│   ├── layer-remap-to-standard.lsp # legacy → standard layers
│   ├── compute-grg-k.lsp         # K-coefficients
│   └── steal-from-template.lsp   # Lee Mac Steal wrapper (vendored)
├── validators/                   # quality gates
│   ├── check-min-rooms.lsp       # СНиП minima
│   └── check-title-block.lsp     # title block presence
├── python/                       # headless / GIS adapters
│   ├── ezdxf_batch.py            # audit, purge, rename, font swap
│   └── cad_to_gis.py             # DXF → Shapefile / GeoPackage
├── vendor/                       # third-party (license-aware)
│   ├── README.md                 # how to populate each entry
│   ├── lee-mac/                  # Steal.lsp etc (git-ignored)
│   └── autocad-lisp-toolkit/     # MIT donor scripts
├── house3d.lsp                   # legacy demo (3D house)
├── dump-stage.lsp                # legacy snapshot
├── dump-stage-deep.lsp           # exhaustive snapshot
└── extract_context.lsp           # context extractor
```

Add new ones into the right subfolder and document them above.

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
| "Draw a 3D house" | `scripts/house3d.lsp` (no skill yet) |

## MCP tool inventory (high-level)

| Tool | Purpose |
|---|---|
| `run_command` | run any AutoCAD/LISP expression |
| `run_lsp_script` | run a `.lsp` file from `scripts/` |
| `execute_script_file` | run a `.scr` headless |
| `query_entities` / `count_entities` | inspect modelspace |
| `get_entity_properties` | DXF data on a single ent |
| `get_drawing_extents` / `zoom_extents` | view ops |
| `get_layers` / `list_blocks` | layer + block tables |
| `validate_drawing` / `validate_layout_quick` | checks |
| `compute_metrics` | room / area / glazing metrics |
| `analyze_stage_plan` | wraps the analyze-stage-plan skill |
| `compute_grg_metrics` | wraps the compute-grg-k skill |
| `migrate_layers_to_standard` | wraps the remap skill |
| `audit_dwg_headless` | wraps `scripts/python/ezdxf_batch.py audit` (no AutoCAD needed) |
| `cad_to_shapefile` | wraps `scripts/python/cad_to_gis.py` (no AutoCAD needed) |
| `export_to_image` / `batch_export` | screenshots, PDF |
