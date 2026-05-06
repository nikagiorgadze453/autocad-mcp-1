---
name: draw-bina-b-type
description: Generates a parametric B-type apartment (~65 m², 2 bedrooms, 1 bath) using the office's standard bay module, walls, doors, windows, and furniture pack. Use when the user asks to "draw a standard apartment", "make a B-type bina", "ბ ტიპის ბინა", or "generate a 2BR flat".
---

# Draw bina (B-type)

## When to use

The user asks for a flat that matches the standard B-type from rule
[`05-typology-bina.mdc`](../../rules/05-typology-bina.mdc):

- 2 bedrooms
- ~65 m² net
- 6.5 m × 10.3 m footprint
- standard 600 mm exterior + 400 mm interior walls

For Type A (~45 m²) or Type C (~85 m²) ask the user first — this skill
is hard-coded to the B variant. (TODO: parameterise.)

## Workflow

```
Task progress:
- [ ] Step 1: Load Sylfaen + standard layers
- [ ] Step 2: Run bina-b-type.lsp at requested origin
- [ ] Step 3: Validate against СНиП minima
- [ ] Step 4: Save under meaningful name
```

### Step 1 — Load text style + layers

```
(load "C:/Users/PCZONE.GE/autocad-mcp/scripts/utilities/load-sylfaen.lsp")
```

This sets `INSUNITS = 4`, creates style `GEO`, and is idempotent.

### Step 2 — Generate the unit

```
(load "C:/Users/PCZONE.GE/autocad-mcp/scripts/templates/bina-b-type.lsp")
(c:BinaB 0 0)            ; origin x y in mm
```

For a 10-bina cluster, repeat at 6 500 mm increments along X:

```
(c:BinaB     0 0)
(c:BinaB  6500 0)
(c:BinaB 13000 0)
... up to 9 units
```

### Step 3 — Validate

```
(load "scripts/validators/check-min-rooms.lsp")
(c:CheckMinRooms)
```

If any room fails, edit the partition coordinates and re-run.
Typical fix: kitchen partition currently at `y0 + 4500` may produce
< 6 m² kitchen — push to 5 000 if the bay is narrow.

### Step 4 — Save

Use a Georgian / transliterated name:

```
(command "_.SAVEAS" "2018" "C:/.../bina-b-typuri-65m2.dwg")
```

## Customisation

Edit the parameters at the top of `bina-b-type.lsp`:

| Variable | Default | Meaning |
|---|---|---|
| `*bay-x*` | 6 500 | structural bay (X) |
| `*depth*` | 10 300 | bina depth (Y) |
| `*wall-ext*` | 600 | external wall |
| `*wall-int*` | 400 | internal partition |
| `*door-front*` | 900 | front door |
| `*door-int*` | 800 | interior doors |
| `*door-bath*` | 700 | bathroom door |
| `*win-bedroom*` | 1 600 | bedroom window |
| `*win-kitchen*` | 1 000 | kitchen window |
| `*win-bath*` | 700 | bath vent |

## Outputs

| Element | Layer | Color |
|---|---|---|
| outer wall | `WALL` | 7 |
| partitions | `WALL-INNER` | 8 |
| doors | `DOOR` | 4 |
| windows | `WINDOW` | 5 |
| beds / wardrobes | `FURN` | 3 |
| toilet / bath | `FIX` | 6 |
| labels | `TEXT` | 7 (Sylfaen) |

## Pitfalls

- Don't run before `load-sylfaen.lsp` — labels render as `?????`.
- Don't run twice at the same origin — duplicates polylines and
  triggers Stage 2 validation failure.
- Furniture is plain rectangles, not the office's block library. To
  swap to the proper blocks, edit `bn:rect ... "FURN"` calls to
  `command "_.-INSERT" "Block-name" ...`.
