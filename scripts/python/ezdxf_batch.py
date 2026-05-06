"""ezdxf_batch.py — headless DXF/DWG batch operations.

Wraps the most useful operations from the ezdxf library
(https://github.com/mozman/ezdxf, MIT licence) so we can do batch jobs
without running AutoCAD: audit, layer-rename, purge, dump-summary,
font-replace, scale.

Usage:
    python scripts/python/ezdxf_batch.py audit         <input.dxf>
    python scripts/python/ezdxf_batch.py purge         <input.dxf>  <output.dxf>
    python scripts/python/ezdxf_batch.py rename-layer  <input.dxf>  <output.dxf>  --map old=NEW [--map old2=NEW2 ...]
    python scripts/python/ezdxf_batch.py replace-font  <input.dxf>  <output.dxf>  --from Arial --to Sylfaen
    python scripts/python/ezdxf_batch.py summary       <input.dxf>  [--out summary.json]
    python scripts/python/ezdxf_batch.py dwg2dxf       <input.dwg>  <output.dxf>   # requires ODA File Converter

Install:
    pip install ezdxf

For DWG input, install the free ODA File Converter from
https://www.opendesign.com/ and export the path via $env:ODA_CONVERTER.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import ezdxf
    from ezdxf.audit import Auditor
except ImportError:
    sys.stderr.write(
        "ezdxf not installed. Run:  pip install ezdxf\n"
    )
    sys.exit(2)

ODA_CONVERTER = os.environ.get(
    "ODA_CONVERTER",
    r"C:\Program Files\ODA\ODAFileConverter\ODAFileConverter.exe",
)


def _ensure_dxf(path: str) -> str:
    """If `path` is a DWG, convert it to a temp DXF using ODA File Converter."""
    p = Path(path)
    if p.suffix.lower() == ".dxf":
        return str(p)
    if p.suffix.lower() != ".dwg":
        raise SystemExit(f"Unsupported extension: {p.suffix}")
    if not Path(ODA_CONVERTER).exists():
        raise SystemExit(
            f"DWG input requires ODA File Converter. Download from "
            f"https://www.opendesign.com/ and set $env:ODA_CONVERTER."
        )
    tmp_dir = Path(tempfile.mkdtemp(prefix="ezdxf_dwg_"))
    in_dir = p.parent
    subprocess.check_call([
        ODA_CONVERTER,
        str(in_dir),
        str(tmp_dir),
        "ACAD2018",
        "DXF",
        "0",
        "1",
        p.name,
    ])
    out_dxf = tmp_dir / (p.stem + ".dxf")
    if not out_dxf.exists():
        raise SystemExit(f"ODA conversion produced no DXF at {out_dxf}")
    return str(out_dxf)


# ──────────────────────────────────────────────────────────────────────
#  Commands
# ──────────────────────────────────────────────────────────────────────

def cmd_audit(args: argparse.Namespace) -> int:
    src = _ensure_dxf(args.input)
    doc = ezdxf.readfile(src)
    auditor = Auditor(doc)
    auditor.run()
    print(f"errors: {len(auditor.errors)}")
    print(f"fixes : {len(auditor.fixes)}")
    for e in auditor.errors:
        print(f"  ! {e.message}")
    for f in auditor.fixes:
        print(f"  + {f.message}")
    return 0 if not auditor.errors else 1


def cmd_purge(args: argparse.Namespace) -> int:
    src = _ensure_dxf(args.input)
    doc = ezdxf.readfile(src)
    purged_layers = 0
    used_layers: set[str] = set()
    for layout in doc.layouts:
        for e in layout:
            used_layers.add(e.dxf.layer)
    for layer in list(doc.layers):
        name = layer.dxf.name
        if name in {"0", "Defpoints"}:
            continue
        if name not in used_layers:
            doc.layers.remove(name)
            purged_layers += 1
    purged_blocks = 0
    for blk in list(doc.blocks):
        if blk.name.startswith("*"):
            continue
        if getattr(blk, "is_any_layout", False) or getattr(blk, "is_layout", False):
            continue
        in_use = any(
            r.dxf.name == blk.name for r in doc.query("INSERT")
        )
        if not in_use:
            try:
                doc.blocks.delete_block(blk.name, safe=True)
            except Exception:
                continue
            purged_blocks += 1
    doc.saveas(args.output)
    print(f"purged: {purged_layers} layers, {purged_blocks} blocks -> {args.output}")
    return 0


def cmd_rename_layer(args: argparse.Namespace) -> int:
    src = _ensure_dxf(args.input)
    doc = ezdxf.readfile(src)
    rename_map: dict[str, str] = {}
    for kv in args.map:
        if "=" not in kv:
            raise SystemExit(f"--map expects old=NEW, got: {kv}")
        old, new = kv.split("=", 1)
        rename_map[old.strip()] = new.strip()

    for old, new in rename_map.items():
        if old in doc.layers:
            doc.layers.get(old).rename(new)
    moved = 0
    for layout in doc.layouts:
        for e in layout:
            if e.dxf.layer in rename_map:
                e.dxf.layer = rename_map[e.dxf.layer]
                moved += 1
    doc.saveas(args.output)
    print(f"renamed {len(rename_map)} layers, {moved} entities reassigned -> {args.output}")
    return 0


def cmd_replace_font(args: argparse.Namespace) -> int:
    src = _ensure_dxf(args.input)
    doc = ezdxf.readfile(src)
    changed = 0
    for layout in doc.layouts:
        for e in layout:
            if e.dxftype() in ("MTEXT", "TEXT"):
                t = e.dxf.text if e.dxftype() == "TEXT" else e.text
                new_t = t.replace(f"\\f{args.from_font}", f"\\f{args.to_font}")
                if new_t != t:
                    if e.dxftype() == "TEXT":
                        e.dxf.text = new_t
                    else:
                        e.text = new_t
                    changed += 1
    doc.saveas(args.output)
    print(f"replaced {args.from_font} -> {args.to_font} in {changed} entities -> {args.output}")
    return 0


def cmd_summary(args: argparse.Namespace) -> int:
    src = _ensure_dxf(args.input)
    doc = ezdxf.readfile(src)
    layers = [l.dxf.name for l in doc.layers]
    counts: dict[str, int] = {}
    for layout in doc.layouts:
        for e in layout:
            counts[e.dxftype()] = counts.get(e.dxftype(), 0) + 1
    summary = {
        "dxf_version": doc.dxfversion,
        "layer_count": len(layers),
        "layers": sorted(layers),
        "entity_counts": dict(sorted(counts.items())),
        "layout_count": len(doc.layouts),
        "block_count": len(doc.blocks),
    }
    out = json.dumps(summary, indent=2, ensure_ascii=False)
    if args.out:
        Path(args.out).write_text(out, encoding="utf-8")
        print(f"summary -> {args.out}")
    else:
        print(out)
    return 0


def cmd_dwg2dxf(args: argparse.Namespace) -> int:
    src = _ensure_dxf(args.input)
    shutil.copy(src, args.output)
    print(f"DXF -> {args.output}")
    return 0


# ──────────────────────────────────────────────────────────────────────
#  CLI
# ──────────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="ezdxf_batch", description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)

    a = sub.add_parser("audit", help="Run ezdxf audit on a file")
    a.add_argument("input")
    a.set_defaults(func=cmd_audit)

    a = sub.add_parser("purge", help="Remove unused layers + blocks")
    a.add_argument("input")
    a.add_argument("output")
    a.set_defaults(func=cmd_purge)

    a = sub.add_parser("rename-layer", help="Rename layers via --map old=NEW")
    a.add_argument("input")
    a.add_argument("output")
    a.add_argument("--map", action="append", required=True)
    a.set_defaults(func=cmd_rename_layer)

    a = sub.add_parser("replace-font", help="Replace MText/TEXT \\fOld with \\fNew")
    a.add_argument("input")
    a.add_argument("output")
    a.add_argument("--from", dest="from_font", required=True)
    a.add_argument("--to",   dest="to_font",   required=True)
    a.set_defaults(func=cmd_replace_font)

    a = sub.add_parser("summary", help="Print structural summary as JSON")
    a.add_argument("input")
    a.add_argument("--out")
    a.set_defaults(func=cmd_summary)

    a = sub.add_parser("dwg2dxf", help="Convert a DWG to DXF via ODA File Converter")
    a.add_argument("input")
    a.add_argument("output")
    a.set_defaults(func=cmd_dwg2dxf)

    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
