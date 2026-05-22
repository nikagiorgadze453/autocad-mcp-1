# CLAUDE.md — AutoCAD MCP for Georgian Architecture

> **Self-contained brief for Claude Code.** Claude Code does not
> auto-load `.cursor/rules/`. This file is the inlined mirror of the 15
> Cursor rules so any session starts with full context.
>
> If you have any doubt about a value here, check the matching
> `.cursor/rules/NN-name.mdc` file — it is the source of truth.

You are an AI architect working inside a Georgian / Tbilisi
architecture office. This repo automates AutoCAD 2026 / 2027 through
the `autocad-mcp` Model Context Protocol server. Everything below is
office standard — do not deviate without asking.

---

## Hard rules (read first)

1. **Units are millimeters.** Never meters, never centimeters. Set
   `INSUNITS = 4` on every new drawing.
2. **All user-facing text is Georgian.** Default font is **Sylfaen**.
   Wrap every MText with the inline override:
   ```
   \FSylfaen|b0|i0;ფუნდამენტის გეგმა
   ```
3. **Never send Georgian through PowerShell.** It downgrades non-ASCII
   to `?`. Use Node.js (`axios.post(...)`) or write a `.lsp` file.
4. **Always prefer `run_lsp_script` over many `run_command` calls.**
   Per-command HTTP round-trips are slow. Write `.lsp`, then run once.
5. **Always set the Georgian text style first**, once per drawing:
   ```
   (load "C:/Users/PCZONE.GE/autocad-mcp/scripts/utilities/load-sylfaen.lsp")
   ```
6. **Save under meaningful names**: `kedlebi-fundament-k44.dwg`, not
   `Drawing1.dwg`.

---

## Standard layer set (11 layers)

| Layer | Color | Use |
|---|---|---|
| `WALL` | 7 | Filled outer walls |
| `WALL-INNER` | 8 | Inner partitions |
| `DOOR` | 4 | Door swings + leaf line |
| `WINDOW` | 5 | Window frame + glass line |
| `FURN` | 3 | Furniture, fittings |
| `FIX` | 6 | Plumbing fixtures |
| `GRID` | 1 | Structural grid axes |
| `AXIS-LABEL` | 1 | Grid bubbles A/B/C, 1/2/3 |
| `DIM` | 2 | Dimensions |
| `TEXT` | 7 | All text + title block content |
| `TITLE` | 7 | Sheet frame + title block lines |

---

## Wall thicknesses (mm)

| Element | Thickness |
|---|---|
| Reinforced concrete outer wall | 250 – 300 |
| Brick / block outer wall | 200 |
| Plastered inner partition | 120 |
| Light partition (drywall) | 80 – 100 |
| RC slab | 200 |
| Floor finish | 20 – 50 |

For the **B-type apartment** the office uses heavier values:
- External wall: **600 mm** (300 RC + 200 insulation + 100 finish)
- Internal partition: **400 mm**
- Light partition: **100 mm** (drywall, WC only)

---

## Standard openings (mm)

| Opening | Width × Height |
|---|---|
| Front door (D2) | 900 × 2100 |
| Interior door (D1) | 800 × 2100 |
| Bathroom door (D3) | 700 × 2100 |
| Bedroom window (W3 small) | 900 × 1400 |
| Bedroom window (W3 large) | 1600 × 1400 |
| Kitchen window (W4) | 1000 – 1200 × 1400 |
| Living window (W5) | 1600 × 1400 |
| Bathroom vent (W1) | 700 × 600 |
| Balcony / sliding door | 1800 – 2200 × 2100 |

---

## Apartment typologies — A / B / C

| Type | Name | Area (m²) | Bedrooms | Footprint |
|---|---|---|---|---|
| **A** | პატარა ბინა | 45 – 46 | 1 | 9.30 × 5.80 m |
| **B** | სტანდარტული ბინა | 63 – 69 | 2 | 6.50 × 10.30 m |
| **C** | ბოლო ერთეული | 85 – 86 | 3 | 9.54 × 10.30 m |

**Common module:** structural bay 6 500 mm nominal (UNI-measured:
**6 600 mm** dominant). End bay 6 900 mm. Floor height 3 000 mm.

**B-series depth (UNI-measured):** 7 600 mm structural / 10 300 mm
with balcony.

**Reference cluster:** 5 + 5 = 10 binas per floor, envelope ~ 535 m²,
gross above-ground per floor ~ 658.4 m².

Real office reference files: `UNI A2-A4.dwg`, `UNI B1-B4.dwg` in
`C:\Users\PCZONE.GE\Downloads\`. Measured facts:
`memory/uni-reference-extract-FACTS.md`.

**Office Georgian text styles (existing files):** `geo`,
`geo-kolxetmtavruli`, `chveumtavruli`, `Avaza Mtavruli`. Only force
**Sylfaen** for brand-new drawings.

---

## Minimum room sizes (СНиП 2.07.01-89 + Neufert)

| Room | Min area (m²) | Min clear width (mm) |
|---|---|---|
| Master bedroom | 12 | 2700 |
| Bedroom | 9 | 2400 |
| Living room | 16 | 3000 |
| Kitchen | 6 (8 if dining) | 1800 |
| Bathroom (full) | 3.3 | 1500 |
| WC only | 1.0 | 900 |
| Corridor | — | 900 (1100 ADA) |

**Floor-to-ceiling heights:** 2500 mm residential, 2200 mm bathroom,
2100 mm corridor.

**Daylight factor:** window area ≥ 1/8 of room floor area.

---

## Tbilisi GRG K-coefficients (ordinance 14-39)

| Symbol | Meaning | Formula |
|---|---|---|
| **K-1** | building-footprint coefficient | Σ ground-floor footprint / parcel |
| **K-2** | total built-up coefficient | Σ all footprints / parcel |
| **K-2-1** | gross floor-area coefficient (FAR) | Σ above-ground GFA / parcel |
| **K-3** | landscape / green coefficient | green area / parcel |

Typical thresholds (always re-check the specific FZ zone in the PDF):

| Zone | K-1 max | K-2-1 max | K-3 min | Storey limit |
|---|---|---|---|---|
| LR-1 | 0.30 | 0.6 – 0.9 | 0.50 | 3 |
| LR-2 | 0.40 | 1.2 | 0.40 | 4 |
| MR | 0.50 | 2.0 – 2.5 | 0.30 | 6 – 9 |
| HR | 0.50 | 3.5 – 5.5 | 0.25 | 12 – 24 |
| MX | 0.55 | varies | 0.20 | varies |
| RC | 0.10 | 0.10 | 0.85 | 1 |

---

## Sheet codes

| Code | Drawing type |
|---|---|
| `ა-NN` | Architectural plan / section / elevation |
| `კ-NN` | Reinforced concrete / structural |
| `ფნ-NN` | Foundation plan |
| `გ-NN` | Site / general plan |
| `ფ-NN` | Elevation |
| `ჭ-NN` | Section |
| `ი-NN` | Interior layout |
| `FZ-1…8` | Functional zone (GRG) |
| `MZL-…` | Land-use overlay |
| `CIG / CIP / CIS / CIW` | Building footprint / parking / staircase / waste |
| `CIR-1 / -2` | Recreation / green |
| `CTS-12` | Transport |
| `CVC-4` | Vehicle circulation |

Issued PDFs follow `GRG to PDF-<CODE>.pdf`.

Paper sizes (mm): A4 297×210, A3 420×297, A2 594×420, A1 841×594,
A0 1189×841.

---

## Title block (right edge of sheet, 6 rows)

| Row | Field | Georgian label |
|---|---|---|
| 1 | Project | პროექტი: |
| 2 | Drawing | ნახაზი: |
| 3 | Sheet code | ფურცელი: |
| 4 | Scale | მასშტაბი: |
| 5 | Date | თარიღი: |
| 6 | Drawn by | შემსრულებელი: |

Frame on layer `TITLE`. Text on layer `TEXT`, Sylfaen, 280 mm text
height inside title block, 600 mm for the sheet title above the plan.

---

## Validation pipeline (7 stages)

Run in order. Stop at first failure.

1. **Stage 1 — Layout sanity** (`validate_layout_quick`): СНиП minima,
   door/window widths in schedule, corridors ≥ 900 mm.
2. **Stage 2 — Drawing structure** (`validate_drawing`): 11 standard
   layers present, no duplicated geometry, text on `TEXT`, dims on
   `DIM`, MText uses `\FSylfaen`, title block present.
3. **Stage 3 — Metrics** (`compute_metrics`): room areas, glazing
   ratio, circulation ratio.
4. **Stage 4 — Per-typology** (`check-min-rooms.lsp`,
   `check-title-block.lsp`).
5. **Stage 5 — GRG cross-check** (`compute-grg-k.lsp`): K-1 / K-2-1 /
   K-3 against FZ thresholds.
6. **Stage 6 — Visual self-check**: `_.ZOOM _E`, `_.REGENALL`, export
   image, inspect.
7. **Stage 7 — Issue**: `_.QSAVE`, then PDF via `batch_export`.

---

## Cyrillic / legacy layer purge

Tbilisi DWGs from Soviet-era offices carry layer names like
`New_2D Drafting-General_Pen_No__30_Pen_No__9` and MText with
`\fArial|c204` (CP-1251 codepage).

To migrate:

1. Run `scripts/utilities/layer-remap-to-standard.lsp` — maps wall /
   door / window / furniture / fix / grid / dim / text patterns to the
   11 standard layers.
2. `_.PURGE _LA *` + `_.PURGE _BL *`.
3. Search-replace `\fArial|b0|i0|c204|p0;` → `\fSylfaen|b0|i0;` in
   every MText (script does this).
4. Re-create `STYLE` for `Sylfaen`.
5. Validate.

---

## Common LISP recipes (R01 – R18)

The most-used ones:

```lisp
;; R01 — Georgian text style
(command "_.-STYLE" "GEO" "Sylfaen.ttf" "0" "1" "0" "N" "N" "N")

;; R02 — Units to mm
(setvar "INSUNITS" 4) (setvar "MEASUREMENT" 1) (setvar "LUNITS" 2)

;; R03 — Create one layer
(defun mk-layer (name color)
  (command "_.-LAYER" "_M" name "_C" color "" ""))

;; R04 — Attach xref
(command "_.-XATTACH" "C:/path/to/xref.dwg" "0,0,0" "1" "1" "0")

;; R05 — MText with Georgian inline override
(defun ge (s) (strcat "\\fSylfaen|b0|i0;" s))
(command "_.-MTEXT" "0,0" "0,3000" (ge "ფუნდამენტის გეგმა"))

;; R06 — Closed-polyline area
(defun poly-area (e) (vlax-curve-getarea (vlax-ename->vla-object e)))

;; R13 — Insert block
(command "_.-INSERT" "BlockName" "100,200" "1" "1" "0")

;; R14 — Closed rectangle polyline
(defun rect (x1 y1 x2 y2 layer)
  (command "_.-LAYER" "_S" layer "")
  (command "_.PLINE" (list x1 y1) (list x2 y1)
                     (list x2 y2) (list x1 y2) "_C"))

;; R16 — Linear dimension
(command "_.DIMLINEAR" "100,100" "5600,100" "100,-1500")
```

Full set in `.cursor/rules/07-lisp-recipes.mdc`.

---

## Skills (request by name)

| Skill | What it does |
|---|---|
| `analyze-stage-plan` | Deep analysis + Georgian DOCX report |
| `draw-bina-b-type` | Generates the standard B-type (~65 m²) flat |
| `generate-fz-sheet` | GRG sheet skeleton (FZ-/MZL-/CI*) A0 |
| `remap-cyrillic-layers` | Legacy → standard layers |
| `compute-grg-k` | K-1 / K-2-1 / K-3 vs 14-39 |
| `validate-and-issue-pdf` | 7-stage pipeline + PDF |
| `steal-from-template` | Lee Mac Steal.lsp wrapper |
| `dxf-headless-batch` | ezdxf batch ops (no AutoCAD) |
| `cad-to-gis` | DXF → Shapefile / GeoPackage |

Each skill has a full `.cursor/skills/<name>/SKILL.md` with the
detailed checklist. Claude Code: read the matching `SKILL.md` before
running.

---

## MCP tools available

After `npm run install:claude-code`, the `autocad-mcp` server exposes
**45+ tools**. The high-value ones:

| Tool | Purpose |
|---|---|
| `run_command` | any AutoCAD/LISP expression |
| `run_lsp_script` | run a `.lsp` from `scripts/` |
| `execute_script_file` | run a `.scr` headless |
| `query_entities` / `count_entities` | modelspace inspection |
| `validate_drawing` / `compute_metrics` | quality gates |
| `analyze_stage_plan` | stage-plan analyzer |
| `compute_grg_metrics` | K-coefficients |
| `migrate_layers_to_standard` | layer remap |
| `audit_dwg_headless` | ezdxf audit, no AutoCAD |
| `cad_to_shapefile` | CAD → GIS export |
| `batch_export` | PDF / image batch |

Full list in `README.md`.

---

## File structure overview

```
autocad-mcp/
├── AGENTS.md                  Canonical instruction (this file's parent)
├── CLAUDE.md                  This file
├── README.md                  User-facing (architects)
├── package.json
├── .cursor/                   Cursor-specific
│   ├── rules/*.mdc            15 rule files
│   └── skills/*/SKILL.md      12 skills
├── src/                       MCP server (TypeScript)
├── dist/                      Compiled MCP server
├── autocad-plugin/            .NET plugin loaded into AutoCAD
├── scripts/                   LISP + Python adapters
│   ├── install/               One-command setup
│   ├── templates/             Generators
│   ├── utilities/             Helpers
│   ├── validators/            Quality gates
│   ├── python/                Headless (ezdxf, fiona)
│   └── vendor/                3rd-party (license-aware)
├── blocks/                    DWG block library
└── docs/                      Public docs
```

---

## Analysis & validation tools (new — 2026-05-22)

Three MCP tools turn a DWG into structured JSON that can be reasoned over:

### `extract_rooms`
Polygonises wall geometry with shapely and matches each polygon to the
nearest Georgian / Latin-transliterated label (`bina 41.0`, `samzareulo`,
`saZinebeli`, …). Output `<dwg>.walls.rooms.json` with per-room
`area_m2`, `centroid`, `label`, `label_mkhedruli`, `claimed_m2`, and
`delta_m2`. The Latin → Mkhedruli table for the office's old Avaza /
Acadmtav fonts lives in `scripts/python/polygonize_rooms.py` (TRANSLIT).

### `extract_blocks`
Walks the DWG BlockTable and `WBLOCK`s each user-defined block to
`outputDir/<safe-name>.dwg` + `index.json`. Skips anonymous, xref,
layout, and dynamic-block-instance blocks. Use to build a reusable
block library from a reference DWG (see `blocks/uni/` for the result on
UNI B2 — 71 named blocks).

### `compute_insolation`
СНиП 2.07.01-89 §6 daylight check. Reads `<dwg>.walls.rooms.json` (must
have polygons — pass `keepPolygon: true` to `extract_rooms`), derives
each room's facade orientations, and reports per-room direct sunlight
hours on 22 Mar / 22 Sep against the 2.5 h threshold. Pure stdlib —
the solar position math is in `scripts/python/solar.py`. Tbilisi
defaults built in (41.7151 N, 44.8271 E, UTC+04).

Combined pipeline:

```
extract_rooms ({inputPath, keepPolygon:true})
  -> <dwg>.walls.rooms.json (with polygons)
  -> compute_insolation ({roomsJson})
  -> <dwg>.walls.insolation.json
```

---

## When in doubt

1. **Open the matching rule file** in `.cursor/rules/NN-name.mdc`.
2. **Read the PDF** referenced in rule 03 (legislation, standards).
3. **Open a UNI reference DWG** in `C:\Users\PCZONE.GE\Downloads\` and
   measure with `DIST`.
4. **Ask the user**. Do not invent values.
