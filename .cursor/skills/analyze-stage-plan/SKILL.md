---
name: analyze-stage-plan
description: Performs a deep, inch-by-inch architectural analysis of an AutoCAD stage / site plan — counts flats, computes total m², extracts dimensions, doors, windows, and writes a Georgian Word report. Use when the user asks to "analyze a stageplan", "give me a report on these coordinates", or "count total m² in the drawing".
---

# Analyze stage plan

## When to use

- The user gives a UTM coordinate inside a Tbilisi project drawing.
- The user asks for a "deep analysis" / "inch-by-inch" / "report on the m²".
- A `Drawing1.dwg`-style multi-bina cluster needs to be quantified.

## Workflow

```
Task progress:
- [ ] Step 1: Confirm AutoCAD MCP is connected
- [ ] Step 2: Run dump-stage-deep.lsp
- [ ] Step 3: Parse with analyze_v3.cjs
- [ ] Step 4: Pull room minima from rule 09-snip-neufert.mdc
- [ ] Step 5: Pull bina typology from rule 05-typology-bina.mdc
- [ ] Step 6: Compute K1 / FAR via compute-grg-k.lsp
- [ ] Step 7: Render STAGE_PLAN_REPORT.md
- [ ] Step 8: Generate STAGE_PLAN_REPORT_GE.docx
```

### Step 1 — Confirm connection

Send any harmless `run_command` such as `(getvar "DWGNAME")`.
If it returns 500, ask the user to dismiss the "Don't show me again"
banner in the AutoCAD viewport.

### Step 2 — Dump

Use `run_command` with:

```
(load "C:/Users/PCZONE.GE/autocad-mcp/scripts/dump-stage-deep.lsp")
```

This writes `stage-dump-deep.txt` with bbox / area / handle / type for
every modelspace entity.

### Step 3 — Parse

```
node analyze_v3.cjs
```

Reads the dump and writes `stage-report-v3.json` with per-bina, totals,
dimensions, doors, windows, and walls.

### Step 4 — Validate against minima

Use rule [`09-snip-neufert.mdc`](../../rules/09-snip-neufert.mdc):

- bath ≥ 3.3 m²
- kitchen ≥ 6 m² (8 if also dining)
- master BR ≥ 12 m², BR ≥ 9 m²
- living ≥ 16 m²

### Step 5 — Classify per typology

Use rule [`05-typology-bina.mdc`](../../rules/05-typology-bina.mdc):

- A: 45 – 47 m²
- B: 63 – 70 m²
- C: 83 – 88 m²

### Step 6 — Compute K-coefficients

```
(load "scripts/utilities/compute-grg-k.lsp")
(c:GrgK 1)
```

Reads `grg-k-report.json` and compares to thresholds in rule
[`06-grg-coefficients.mdc`](../../rules/06-grg-coefficients.mdc).

### Step 7 — Markdown report

Render with these required sections (in this order):

1. Project header (DWG name, target coord, geo CRS)
2. Drawing extents
3. Layer inventory
4. Per-bina table (count, type, m²)
5. Total m² grand summary
6. Door / window schedule
7. Dimension chains
8. Furniture / fixture inventory
9. Compliance check vs СНиП / Neufert / N41
10. K-coefficient check
11. Issues / cyrillic-residue inventory
12. Recommendations

### Step 8 — Georgian Word file

Run `node generate_report_docx.cjs` to emit
`STAGE_PLAN_REPORT_GE.docx`. The script uses the `docx` npm package
and the Sylfaen font — never paste Georgian via PowerShell.

## Outputs

| File | Purpose |
|---|---|
| `stage-dump-deep.txt` | raw entity dump |
| `stage-report-v3.json` | parsed / classified |
| `STAGE_PLAN_REPORT.md` | English report |
| `STAGE_PLAN_REPORT_GE.docx` | Georgian Word file |
| `grg-k-report.json` | K1 / FAR / K3 |
| `room-validation.json` | per-room СНиП check |

## Common pitfalls

- DIMENSIONS in this office's templates are usually **already metres**
  because `DIMLFAC = 0.001`. Don't re-divide by 1000.
- A typical drawing has **two copies** of the cluster — local at origin
  and georeferenced UTM. Always work with the georeferenced one.
- Cyrillic-residue layers are not a bug — they're legacy. Run
  `remap-cyrillic-layers` skill once before doing the analysis.
- Furniture blocks named `"Kitchen Layout 26"`, `"Dining Round 26"`
  are the office's standard pack — don't mistake them for non-standard.
