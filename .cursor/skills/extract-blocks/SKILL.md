---
name: extract-blocks
description: Extracts every user-defined block from a DWG to stand-alone .dwg files and writes an index. Use when the user asks to "build a block library from this file", "save the furniture blocks", "extract all the blocks", or to "import the office's block set".
---

# extract-blocks skill

## What it does

Given a source DWG, exports every user-defined block in its BlockTable
to its own `.dwg` file under `outputDir`, and writes `outputDir/index.json`
with one record per exported block:

```json
{
  "name": "TOILET_BOWL_B",
  "file": "TOILET_BOWL_B.dwg",
  "inserts": 47
}
```

## What it skips

- **Anonymous blocks** (flag bit 1)
- **Xref-dependent blocks** (flag bits 4 + 16)
- **Layout blocks** (`*Model_Space`, `*Paper_Space`)
- **Dynamic-block instances** (names starting with `A$C…` or `*U…`)
- **Unused blocks** (0 inserts in modelspace)

## How

1. Runs `scripts/utilities/extract-blocks.lsp` in `accoreconsole`
2. The LSP uses `(tblnext "BLOCK" T)` to walk the block table headless
3. For each kept block, calls `_.-WBLOCK outpath name`
4. Path is taken from the env var `UNI_BLOCKS_OUT`, set by the MCP wrapper

## Use cases

### Build the office block set from UNI B2

```
extract_blocks({
  "inputPath": "C:/Users/PCZONE.GE/Downloads/UNI B2.dwg",
  "outputDir": "C:/Users/PCZONE.GE/autocad-mcp/blocks/uni"
})
```

On UNI B2 this gave us 71 blocks (≈7 MB):
- furniture: `SINK_B`, `TOILET_BOWL_B`, `lever_handle`, `xis_aiataki`, `zgali`
- structure: `svetebi`, `svetebi pirveli sartuli`, `moajirebi`
- vehicles for parking: `almera_va`, `mersedes_ge`
- openings: `kari001` (door), `GLAS_24`, `W-10  1800-100` (window)
- circulation: `lift-2`
- markers: `nishnulebi`, `_ArchTick`

### Steal the blocks back into a new drawing

After extraction, use the `steal-from-template` skill (Lee Mac's
Steal.lsp) to import any subset of these into a fresh DWG.

## Calling pattern

### Via the MCP tool

```jsonc
extract_blocks({
  "inputPath": "C:/path/to/source.dwg",
  "outputDir": "C:/path/to/blocks-dir"
})
```

### Via CLI / accoreconsole directly

```powershell
$env:UNI_BLOCKS_OUT="C:/path/blocks-dir"
accoreconsole /i "source.dwg" /s scripts/utilities/extract-blocks.scr
```

## Validation checklist

After running, verify:

- [ ] `index.json` exists in `outputDir`
- [ ] `exported` count is sensible (UNI files: 50-100; clean office files: 20-40)
- [ ] No `A$C*` or `*U*` blocks slipped through (would mean the dyn-inst filter failed)
- [ ] Spot-check 3 random `.dwg` files open in AutoCAD
- [ ] Consider running the `dxf-headless-batch` skill with `purge` on each
  extracted DWG to drop unused layers / styles before final commit

## Source files

- `scripts/utilities/extract-blocks.lsp` — the LISP
- `scripts/utilities/extract-blocks.scr` — accoreconsole entry point
- `src/index.ts → handleExtractBlocks()` — MCP wrapper
- `blocks/uni/index.json` — example output

## Limitations

- `_.-WBLOCK` resaves the block with the source drawing's units; if the
  source is in mm, all exports are in mm.
- Annotative blocks are exported but their annotation scale list resets.
- Block attribute definitions are preserved as ATTDEF (not ATTRIB),
  ready for re-insertion.
