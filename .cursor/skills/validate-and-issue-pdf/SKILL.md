---
name: validate-and-issue-pdf
description: Runs the full 7-stage validation pipeline (rule 11) on a drawing, fixes recoverable failures, and issues a PDF using the office naming convention "GRG to PDF-<CODE>.pdf". Use when the user asks to "validate the drawing", "issue the PDF", "send to print", or before final handover.
---

# Validate and issue PDF

## When to use

- Before any final handover.
- The user says "გადათვალე / გავამოწმო / გავუგზავნო კლიენტს".
- A sheet needs a PDF in the standard office naming convention.

The full pipeline is documented in
[`11-validation.mdc`](../../rules/11-validation.mdc).

## Workflow

```
Task progress:
- [ ] Stage 1: validate_layout_quick (skipped if no JSON layout)
- [ ] Stage 2: validate_drawing (MCP)
- [ ] Stage 3: compute_metrics (MCP)
- [ ] Stage 4: check-min-rooms.lsp + check-title-block.lsp
- [ ] Stage 5: compute-grg-k.lsp (only if FZ / MZL / CI* sheet)
- [ ] Stage 6: zoom + screenshot self-check
- [ ] Stage 7: PDF export
```

### Stage 2 — Drawing validation

```
validate_drawing
```

Required passes:

- 11 standard layers exist (rule 02)
- title block present (rule 01)
- text on `TEXT`, dim on `DIM`
- Sylfaen / GEO style exists

If any fail → fix and rerun. Don't proceed.

### Stage 3 — Metrics

```
compute_metrics(contextJsonPath)
```

Inspect:

- glazing ratio per room ≥ 1/8 (rule 09)
- circulation ratio ≤ 0.20 of total
- room count matches the bina typology

### Stage 4 — Domain validators

```
(load "scripts/validators/check-min-rooms.lsp") (c:CheckMinRooms)
(load "scripts/validators/check-title-block.lsp") (c:CheckTitle)
```

Both write JSON / print to console. **Stop if either fails.**

### Stage 5 — K-coefficients (only for FZ/MZL/CI* sheets)

Run [`compute-grg-k`](../compute-grg-k/SKILL.md). Compare to thresholds
in rule 06.

### Stage 6 — Visual self-check

```
(command "_.ZOOM" "_E")
(command "_.REGENALL")
```

Then export a screenshot via the MCP `export_to_image` tool and inspect
manually. Compare to the reference PDF (`GRG to PDF-<CODE>.pdf` in the
reference set).

### Stage 7 — Issue PDF

Identify the sheet code from the title block (rule 08) and use the
naming convention:

```
GRG to PDF-<CODE>.pdf
```

Examples: `GRG to PDF-A1.pdf`, `GRG to PDF-FZ3.pdf`.

```
(command "_.SAVEAS" "2018" "C:/.../<sheet>.dwg")
(command "_.-PLOT" "_Y" "Layout1" "DWG To PDF.pc3"
         "ISO_A0_(841.00_x_1189.00_MM)"
         "_M" "_L" "_N" "_E" "1=1"
         "_C" "_Y" "monochrome.ctb" "_Y" "_N"
         "C:/.../GRG to PDF-FZ3.pdf" "_N" "_Y")
```

For batch: use the MCP `batch_export(format = "pdf", out_folder = …)`
tool.

## Failure-report format

When a stage fails, return a JSON like:

```json
{
  "stage": "Stage 2",
  "rule":  "02-units-dims.mdc",
  "check": "standard layer set",
  "missing": ["WALL", "DOOR", "WINDOW"],
  "found":   ["A-Wall", "kar-panjara_*"],
  "fix":     "run skill remap-cyrillic-layers"
}
```

Always include the rule reference + the next-action skill / script in
every failure.

## Pitfalls

- Don't skip stages 1–4 just because the drawing "looks right".
- Don't issue a PDF from modelspace — switch to Layout1 first.
- Don't bind xrefs unless the user explicitly asks. Issue PDF can
  reference unbound xrefs cleanly.
- monochrome.ctb is the office default. For colour issue use
  `acad.ctb` and set `colour by layer`.
- Zoom-extents *before* plotting — `_.ZOOM` _E_ ensures the right
  area gets captured.
