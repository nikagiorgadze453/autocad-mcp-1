---
name: compute-grg-k
description: Computes the Tbilisi GRG building-coverage / FAR / green coefficients (K-1, K-2-1, K-3) for a project and validates them against the functional zone limits in ordinance 14-39. Use when the user asks for "K კოეფიციენტი", "FAR", "განაშენების კოეფიციენტი", "ფართის ფარდობა", or anything about parcel utilisation.
---

# Compute GRG K-coefficients

## When to use

- The user mentions K1 / K2 / K2-1 / K3 / FAR / განაშენების კოეფიციენტი.
- An FZ / MZL / CI* sheet needs the coefficient table filled in.
- The user wants to know if a project fits the parcel within Tbilisi
  ordinance 14-39 (or amendments 41 / 57 / 59).

Definitions, formulas and zone thresholds live in
[`06-grg-coefficients.mdc`](../../rules/06-grg-coefficients.mdc).

## Workflow

```
Task progress:
- [ ] Step 1: Identify functional zone of the parcel
- [ ] Step 2: Make sure the parcel boundary is on layer "PARCEL"
- [ ] Step 3: Make sure footprints are on "WALL"
- [ ] Step 4: Make sure greens are on a "*GAMWVANEB*" layer
- [ ] Step 5: Run compute-grg-k.lsp with floor count
- [ ] Step 6: Compare K-values to FZ thresholds
- [ ] Step 7: Add the 7-row table to the title block
```

### Step 1 — Identify the FZ

Ask the user, or look at `xref_zonireba.dwg`. Common Tbilisi codes:

| Code | Description |
|---|---|
| LR-1 / LR-2 | low-rise residential |
| MR | mid-rise residential |
| HR | high-rise residential |
| MX | mixed-use |
| RC | recreation |

The FZ determines max K-1, K-2-1 (FAR), min K-3 (rule 06).

### Step 2 — Parcel boundary

Closed LWPOLYLINE on layer `PARCEL`. If it's on a legacy layer like
`New_ნაკვეთების კონტურები გრგ2_…`, run the
[`remap-cyrillic-layers`](../remap-cyrillic-layers/SKILL.md) skill
first.

### Step 3 — Footprints

Closed LWPOLYLINEs on layer `WALL` (or any layer matching `*WALL*`,
`*BEARING*`, `*SHENOBEB*`).

### Step 4 — Greens

Optional. Closed LWPOLYLINEs on a layer matching `*GAMWVANEB*`,
`*GREEN*`, `*MWVAN*`. If absent, K-3 returns 0.

### Step 5 — Run

```
(load "C:/Users/PCZONE.GE/autocad-mcp/scripts/utilities/compute-grg-k.lsp")
(c:GrgK 4)        ; 4 = number of above-ground floors
```

Output: `C:/Users/PCZONE.GE/autocad-mcp/grg-k-report.json`

```json
{
  "dwg": "PROJECT.dwg",
  "parcel_m2":   1234.5,
  "footprint_m2": 612.3,
  "green_m2":    300.0,
  "floors":        4,
  "K1":          0.496,
  "K2_1_FAR":    1.984,
  "K3":          0.243
}
```

### Step 6 — Compare to thresholds

| FZ | K-1 max | FAR max | K-3 min |
|---|---|---|---|
| LR-1 | 0.30 | 0.6 – 0.9 | 0.50 |
| LR-2 | 0.40 | 1.2 | 0.40 |
| MR | 0.50 | 2.0 – 2.5 | 0.30 |
| HR | 0.50 | 3.5 – 5.5 | 0.25 |

If any value violates, flag in the report:

```
{ "issue": "K1 = 0.496 exceeds LR-2 limit 0.40",
  "rule":  "06-grg-coefficients.mdc",
  "fix":   "reduce footprint by ≥ 12 m² OR rezone OR reduce floor count" }
```

### Step 7 — Title-block table

Use the 7-row table from rule 06 §"Reporting block (Georgian, for FZ
sheet title block)":

```
| რიგი | ველი |
|---|---|
| 1 | ნაკვეთის ფართი (S)             |  1234.5 m² |
| 2 | განაშენების კოეფიციენტი K-1     |  0.496    |
| 3 | სრული აშენების კოეფიციენტი K-2  |  0.50     |
| 4 | სართულების ფართი K-2-1 (FAR)    |  1.984    |
| 5 | გამწვანების კოეფიციენტი K-3     |  0.243    |
| 6 | სართულების რაოდენობა            |  4        |
| 7 | მაქსიმალური სიმაღლე (m)         |  12.0     |
```

Place on layer `TEXT` using MText with `\fSylfaen|b0|i0;` override.

## Pitfalls

- The script reads **areas in mm²** and converts to m² (÷ 1 000 000).
  Don't double-convert.
- A parcel polyline that isn't actually closed will return area 0 →
  div-by-zero. Validate `closed?` before running.
- Sloped roofs / cantilevers count toward K-2 not K-1. Hand-edit if
  needed — script only handles ground footprint.
- Underground parking does NOT count towards K-1 / K-2-1 (rule 06).
- For mixed-use, FAR limits are split per use-class. Re-read the
  actual ordinance PDF.
