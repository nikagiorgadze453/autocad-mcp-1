---
name: steal-from-template
description: Imports blocks, layers, dim/text styles, layouts and page setups from a reference DWG into the active drawing using Lee Mac's Steal.lsp. Use when the user asks to "copy styles from", "bring layers from", "set up like the office template", "use the FZ-3 template", or any time we need style/layer parity with one of the office reference DWGs.
---

# Steal from template

## When to use

- Starting a new sheet that should match an existing FZ / MZL / CI* sheet.
- A drawing is missing dim styles, text styles or layouts the user
  expects to "just be there".
- Importing the office's standard block library into a fresh DWG.
- Quickly mirroring layer table + properties from `xref_zonireba`,
  `xref_topo`, `xref_sakutreba`, etc.

Library docs: rule [`12-external-libraries.mdc`](../../rules/12-external-libraries.mdc), entry **L01**.

## One-time setup

1. Read [`scripts/vendor/README.md`](../../../scripts/vendor/README.md).
2. Download `Steal.lsp` from https://www.lee-mac.com/steal.html.
3. Place at `scripts/vendor/lee-mac/Steal.lsp`.

The wrapper checks for the file on first call and pops a clear alert
if it's missing.

## Workflow

```
Task progress:
- [ ] Step 1: confirm vendor file present
- [ ] Step 2: load wrapper
- [ ] Step 3: pick command variant
- [ ] Step 4: review imported items
```

### Step 2 — Load

```
(load "C:/Users/PCZONE.GE/autocad-mcp/scripts/utilities/steal-from-template.lsp")
```

### Step 3 — Pick a variant

| Command | Use |
|---|---|
| `(c:StealOurTemplate)` | Interactive Lee Mac dialog (browse to any DWG) |
| `(c:StealReferenceDwg "<path>")` | Import everything from one DWG |
| `(c:StealZonireba)` | Bring `xref_zonireba.dwg` styles + layers |
| `(c:StealTopo)` | Bring `xref_topo.dwg` styles + layers |
| `(c:StealCadastre)` | Bring `xref_sakutreba.dwg` styles + layers |

Inside Lee Mac's dialog you can also pick **just** Layers, **just**
Blocks, etc. — the importer handles cross-references automatically.

### Step 4 — Review

After import, run:

```
(c:CheckTitle)            ; from validators/check-title-block.lsp
(command "_.LAYER")       ; visually confirm new layers
```

If something didn't come over (e.g. an MLeader style), open Lee Mac's
dialog again and tick that category.

## Pitfalls

- **License.** Steal.lsp is free but Lee Mac asks users to download
  from his site, not redistribute. The vendor folder is git-ignored.
- **Page setups carry plotter names.** If the source DWG references a
  printer this machine doesn't have, AutoCAD silently stubs it. Re-pick
  in Page Setup Manager after import.
- **Materials** require a render-enabled session — they may flicker on
  AutoCAD LT.
- **Layer color overrides** survive the import, but **layer states**
  do not. Recreate via `LAYERSTATE` if needed.
- After a `Steal`, if MText looks wrong, reload Sylfaen with
  [`load-sylfaen.lsp`](../../../scripts/utilities/load-sylfaen.lsp).
