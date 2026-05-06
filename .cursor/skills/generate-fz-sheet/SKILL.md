---
name: generate-fz-sheet
description: Generates a complete GRG functional-zone sheet (FZ-N) skeleton — A0 frame, 6-row title block in Georgian, xref placeholders. Use when the user asks for a "GRG sheet", "FZ-3", "MZL-SZ", "ფუნქციური ზონა sheet", or any code from rule 08-sheet-codes.mdc.
---

# Generate FZ / GRG sheet

## When to use

User asks for any sheet matching the GRG sheet code map in
[`08-sheet-codes.mdc`](../../rules/08-sheet-codes.mdc):

- `FZ-1` … `FZ-8` — functional zone
- `MZL-FZ` / `MZL-SZ` / `MZL-TSZ` — land-use overlays
- `CIG` / `CIP` / `CIS` / `CIW` — footprints / parking / utilities
- `CIR-1` / `CIR-2` — recreation
- `CTS-12` / `CVC-4` — transport
- `CZLSZ` / `CZVCNZ` — zoning utilities

## Workflow

```
Task progress:
- [ ] Step 1: Confirm sheet code + Georgian title with user
- [ ] Step 2: Open new drawing, set mm units
- [ ] Step 3: Load Sylfaen + standard layers
- [ ] Step 4: Run fz-sheet.lsp
- [ ] Step 5: Attach required xrefs
- [ ] Step 6: Add the K-coefficient table to the title block
- [ ] Step 7: Validate (check-title-block.lsp)
- [ ] Step 8: Save with naming convention
```

### Step 1 — Confirm code + title

```
sheetCode  = "FZ-3"
sheetTitle = "ფუნქციური ზონა — საცხოვრებელი მაღალი"
```

If unclear, ask the user — the title block code drives PDF naming
(`GRG to PDF-FZ3.pdf`).

### Step 2 + 3 — Setup

```
(load "C:/Users/PCZONE.GE/autocad-mcp/scripts/utilities/load-sylfaen.lsp")
```

### Step 4 — Generate the skeleton

```
(load "C:/Users/PCZONE.GE/autocad-mcp/scripts/templates/fz-sheet.lsp")
(c:FzSheet "FZ-3" "ფუნქციური ზონა — საცხოვრებელი მაღალი")
```

The script draws an A0 (1 189 × 841 mm), 3 nested frames, and a
6-row title block with: პროექტი / ნახაზი / ფურცელი / მასშტაბი /
თარიღი / შემსრულებელი.

### Step 5 — Attach xrefs

Lookup the required xrefs for the sheet code in
[`08-sheet-codes.mdc`](../../rules/08-sheet-codes.mdc), then:

```
(command "_.-XATTACH"
  "C:/Users/PCZONE.GE/Downloads/wetransfer_19_xref_grg_2026-04-29_1051/19_xref_grg/xref_zonireba.dwg"
  "0,0,0" "1" "1" "0")
```

For an FZ sheet attach: `xref_zonireba`, `xref_gengegma`,
`xref_topo`, `xref_sakutreba`.

### Step 6 — K-coefficient table

If the sheet is FZ / MZL / CI*, run the K computation and add the
result to the title block:

```
(load "scripts/utilities/compute-grg-k.lsp")
(c:GrgK 4)
```

Then place the 7-row table from rule 06 §"Reporting block (Georgian,
for FZ sheet title block)" inside the content area, using
`MTEXT` on layer `TEXT`.

### Step 7 — Validate

```
(load "scripts/validators/check-title-block.lsp")
(c:CheckTitle)
```

Expect: 3 frames, style `GEO`, 6 Georgian labels.

### Step 8 — Save

```
(command "_.SAVEAS" "2018" "C:/.../grg-FZ3.dwg")
```

For PDF issue: `(command "_.SCRIPT" "scripts/utilities/plot-grg.scr")`
or use the MCP `batch_export` tool.

## Pitfalls

- A0 in mm = 1189 × 841 — not metres, not 1.189. Don't confuse paper
  with model space.
- Title block lives in **paper space** (Layout1) for issue. The
  fz-sheet.lsp draws in modelspace — switch tabs before plotting and
  use a 1=1 viewport.
- Don't bind xrefs unless the user explicitly asks ("გადაიტანე ნახაზში").
- For sheets with a K-table, every K-value must come from the
  `compute-grg-k.lsp` JSON — don't hardcode.
