---
name: remap-cyrillic-layers
description: Migrates a legacy Cyrillic / Soviet-era AutoCAD drawing's layer names to the project's standard 11-layer set, fixes Arial-codepage MText overrides to Sylfaen, and purges unused layers. Use when the drawing has layer names like `New_*_Pen_No__N` or MText with `\fArial|c204`, or when the user asks to "clean up legacy layers".
---

# Remap Cyrillic / legacy layers

## When to use

- Layer count > 60.
- Layer names contain `_Pen_No__N`, `New_…`, `Cyrillic`, `Russian`.
- MText carries `\fArial|c204` codepage overrides.
- The user says "clean up", "modernise", "შეცვალე layer-ები".

The full mapping rules live in [`10-cyrillic-purge.mdc`](../../rules/10-cyrillic-purge.mdc).

## Workflow

```
Task progress:
- [ ] Step 1: Backup the DWG
- [ ] Step 2: Run dump-stage-deep.lsp to record current state
- [ ] Step 3: Run layer-remap-to-standard.lsp
- [ ] Step 4: Inspect layer-remap-report.txt
- [ ] Step 5: Migrate MText fonts
- [ ] Step 6: Purge unused layers
- [ ] Step 7: Re-validate
```

### Step 1 — Backup

```
(command "_.SAVEAS" "2018" "C:/.../<dwg>-PRE-REMAP.dwg")
```

### Step 2 — Snapshot

```
(load "C:/Users/PCZONE.GE/autocad-mcp/scripts/dump-stage-deep.lsp")
```

This gives you a `stage-dump-deep.txt` with old layer names — useful
if you need to roll back.

### Step 3 — Run remap

```
(load "C:/Users/PCZONE.GE/autocad-mcp/scripts/utilities/layer-remap-to-standard.lsp")
(c:LayerRemap)
```

### Step 4 — Inspect the report

```
C:/Users/PCZONE.GE/autocad-mcp/layer-remap-report.txt
```

Contains lines like `Old_Layer_Pen_No__7 -> WALL`. Spot-check 5–10 of
them in the DWG.

### Step 5 — Migrate MText fonts

The standard remap script keeps fonts alone (Cyrillic codepage 204 may
be needed for Russian leftovers). To force-convert to Sylfaen:

```
(setq ss (ssget "_X" '((0 . "MTEXT"))))
(repeat (sslength ss)
  (setq e (ssname ss 0))
  (setq ed (entget e))
  (setq new
    (vl-string-subst "\\fSylfaen|b0|i0;"
                     "\\fArial|b0|i0|c204|p0;"
                     (cdr (assoc 1 ed))))
  (entmod (subst (cons 1 new) (assoc 1 ed) ed))
  (setq ss (ssdel e ss)))
```

Run only after eyeballing the result on a small selection — Russian
abbreviations (e.g. ГОСТ) won't survive font-only re-stamp.

### Step 6 — Purge

```
(command "_.PURGE" "_LA" "*" "_N")
(command "_.PURGE" "_BL" "*" "_N")
(command "_.PURGE" "_TS" "*" "_N")
```

### Step 7 — Validate

```
(load "scripts/validators/check-title-block.lsp")
(c:CheckTitle)
```

Then run the MCP `validate_drawing` tool and confirm 11 standard layers
exist with correct colours.

## Outputs

| File | Purpose |
|---|---|
| `<dwg>-PRE-REMAP.dwg` | rollback copy |
| `stage-dump-deep.txt` | old-layer reference |
| `layer-remap-report.txt` | line-by-line `OLD -> NEW` |

## Pitfalls

- **Don't** remap `xref_*` files in place — they're reference, not
  edited. Detach + re-attach if you need clean references.
- The mapping uses **wildcard match on uppercase**, so case differences
  are handled, but Cyrillic `АВТОCAD` vs Latin `AUTOCAD` collide. Spot-
  check the report.
- If a layer matches **multiple patterns** (e.g. `kar-panjara` matches
  both DOOR and WINDOW), the first match wins — review and split by
  bbox afterwards (door bbox width < 1 200 mm).
- `New_ნაკვეთების კონტურები_*` (parcel boundary) → migrate to
  `PARCEL`, not delete.
