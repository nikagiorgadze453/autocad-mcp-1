---
name: dxf-headless-batch
description: Performs batch DXF/DWG operations (audit, purge, layer rename, font swap, summary) without needing AutoCAD running, using ezdxf. Use when the user asks to "process N drawings", "audit all DWGs", "rename a layer in many files", "convert DWG to DXF on a server", or any time AutoCAD is too slow to open files one by one.
---

# DXF / DWG headless batch

## When to use

- The user has a folder of 50+ DWGs that need the same treatment.
- The user is on macOS / Linux / Docker (no AutoCAD).
- A drawing file is corrupt and needs `audit` *before* we dare open it.
- Quick "what's in this DXF?" without launching AutoCAD.

Adapter: `scripts/python/ezdxf_batch.py`. Library docs: rule
[`12-external-libraries.mdc`](../../rules/12-external-libraries.mdc), entry **L02**.

## One-time setup

```
pip install ezdxf
```

For DWG inputs (not DXF), install the free ODA File Converter from
https://www.opendesign.com/ and either:

- accept the default location (`C:\Program Files\ODA\ODAFileConverter\`), or
- set `$env:ODA_CONVERTER` to the actual path.

## Workflow

```
Task progress:
- [ ] Step 1: pick command (audit / purge / rename-layer / replace-font / summary / dwg2dxf)
- [ ] Step 2: run on one file as smoke-test
- [ ] Step 3: loop over folder via PowerShell or bash
- [ ] Step 4: validate sample of outputs
```

## Commands

### Audit

```
python scripts/python/ezdxf_batch.py audit input.dxf
```

Returns counts of errors and fixes; exit code 0 means clean, 1 means
unfixable errors remain.

### Purge unused layers + blocks

```
python scripts/python/ezdxf_batch.py purge input.dxf output.dxf
```

### Rename layers (legacy → standard)

```
python scripts/python/ezdxf_batch.py rename-layer input.dxf output.dxf \
  --map "New_*Wall*=WALL" \
  --map "New_*kar-panjara*=WINDOW" \
  --map "New_*Door*=DOOR"
```

For exhaustive mapping use rule [`10-cyrillic-purge.mdc`](../../rules/10-cyrillic-purge.mdc).
Note: `ezdxf` literal-renames per `--map` key. Write one entry per
old layer; wildcards are glob-style on the **left** side only when
combined with multiple `--map` flags.

### Replace MText font (Arial cp204 → Sylfaen)

```
python scripts/python/ezdxf_batch.py replace-font input.dxf output.dxf \
  --from "Arial|b0|i0|c204|p0;" \
  --to   "Sylfaen|b0|i0;"
```

### Structural summary (JSON)

```
python scripts/python/ezdxf_batch.py summary input.dxf --out report.json
```

### DWG → DXF (one-shot)

```
python scripts/python/ezdxf_batch.py dwg2dxf input.dwg output.dxf
```

## Batch loop (PowerShell)

```powershell
Get-ChildItem -Path C:/path/to/dwgs -Filter *.dwg | ForEach-Object {
  $out = $_.FullName.Replace('.dwg', '.audited.dxf')
  python scripts/python/ezdxf_batch.py audit $_.FullName
  python scripts/python/ezdxf_batch.py purge $_.FullName $out
}
```

## Pitfalls

- **DWG support is via DXF round-trip** through ODA — small loss of
  fidelity on dynamic blocks and proxies. For 100% fidelity use the
  in-AutoCAD pipeline (`run_lsp_script` etc).
- ezdxf does **not** render Georgian Sylfaen on its own — it preserves
  the MText override but cannot draw it. Use this for processing, not
  visual proofing.
- `audit` reports many warnings on real-world Tbilisi DWGs because of
  ZWCAD / Bricscad-flavoured DXF — most are harmless.
- Locked layers stay locked after `rename-layer`; unlock them in
  AutoCAD if the user complains.
- `--map "old=NEW"` does literal name replace; quote the layer name if
  it contains spaces, equals signs or backslashes.
