"""cad_to_gis.py - DXF / DWG -> Shapefile / GeoPackage / GeoJSON with EPSG reproj.

Adapter inspired by CAD_to_GIS (https://github.com/skyflying/CAD_to_GIS, MIT)
using ezdxf + fiona + shapely + pyproj - the Windows-friendly stack that does
not require a system GDAL build.

Usage:
    python scripts/python/cad_to_gis.py <input.dxf|input.dwg> <output_dir> \
        --layers New_*nakvet*,xref_zonireba* \
        --epsg-in  32638 \
        --epsg-out 32638 \
        --format gpkg

Install:
    pip install ezdxf fiona shapely pyproj

For DWG input the script auto-converts to DXF using ODA File Converter
(set $env:ODA_CONVERTER if not in default location). See ezdxf_batch.py.
"""

from __future__ import annotations

import argparse
import math
import os
import sys
from fnmatch import fnmatch
from pathlib import Path

try:
    import ezdxf
except ImportError:
    sys.stderr.write("ezdxf not installed. Run: pip install ezdxf\n")
    sys.exit(2)

try:
    import fiona
    from fiona.crs import CRS
    from shapely.geometry import (
        LineString,
        MultiLineString,
        MultiPolygon,
        Point,
        Polygon,
        mapping,
    )
    from shapely.ops import transform as shp_transform
    from pyproj import Transformer
except ImportError as e:
    sys.stderr.write(
        f"Missing GIS dependency: {e}\n"
        "Run: pip install fiona shapely pyproj\n"
    )
    sys.exit(2)


def _ensure_dxf(path: str) -> str:
    p = Path(path)
    if p.suffix.lower() == ".dxf":
        return str(p)
    if p.suffix.lower() != ".dwg":
        raise SystemExit(f"Unsupported extension: {p.suffix}")
    sys.path.insert(0, str(Path(__file__).parent))
    from ezdxf_batch import _ensure_dxf as helper

    return helper(path)


def _matches_any(layer_name: str, patterns: list[str]) -> bool:
    if not patterns:
        return True
    return any(fnmatch(layer_name, p) for p in patterns)


def _make_xform(epsg_in: int, epsg_out: int):
    if epsg_in == epsg_out:
        return None
    tr = Transformer.from_crs(epsg_in, epsg_out, always_xy=True)
    return lambda x, y, z=None: tr.transform(x, y)


def _entity_to_shape(e):
    """Translate a DXF entity to a shapely geometry (or None)."""
    t = e.dxftype()
    if t == "LWPOLYLINE":
        pts = [(v[0], v[1]) for v in e.get_points("xy")]
        if len(pts) < 2:
            return None
        if e.is_closed and len(pts) >= 3:
            if pts[0] != pts[-1]:
                pts.append(pts[0])
            return Polygon(pts)
        return LineString(pts)
    if t == "POLYLINE":
        pts = [(v.dxf.location.x, v.dxf.location.y) for v in e.vertices]
        if len(pts) < 2:
            return None
        return LineString(pts)
    if t == "LINE":
        return LineString([
            (e.dxf.start.x, e.dxf.start.y),
            (e.dxf.end.x,   e.dxf.end.y),
        ])
    if t == "POINT":
        return Point(e.dxf.location.x, e.dxf.location.y)
    if t == "CIRCLE":
        cx, cy, r = e.dxf.center.x, e.dxf.center.y, e.dxf.radius
        ring = [
            (cx + r * math.cos(2 * math.pi * i / 64),
             cy + r * math.sin(2 * math.pi * i / 64))
            for i in range(64)
        ]
        ring.append(ring[0])
        return Polygon(ring)
    if t == "ARC":
        cx, cy, r = e.dxf.center.x, e.dxf.center.y, e.dxf.radius
        a0 = math.radians(e.dxf.start_angle)
        a1 = math.radians(e.dxf.end_angle)
        if a1 < a0:
            a1 += 2 * math.pi
        steps = max(8, int(abs(a1 - a0) / (math.pi / 32)))
        pts = [
            (cx + r * math.cos(a0 + (a1 - a0) * i / steps),
             cy + r * math.sin(a0 + (a1 - a0) * i / steps))
            for i in range(steps + 1)
        ]
        return LineString(pts)
    return None


def _layer_geom_type(geoms: list) -> str:
    """Pick a single fiona geometry-type label for a layer."""
    if not geoms:
        return "Unknown"
    types = {g.geom_type for g in geoms if g is not None}
    if types == {"Polygon"}:
        return "Polygon"
    if "Polygon" in types and "LineString" in types:
        return "MultiPolygon"
    if types == {"LineString"}:
        return "LineString"
    if types == {"Point"}:
        return "Point"
    return "MultiLineString"


def export(
    src: str,
    out_dir: str,
    layer_patterns: list[str],
    epsg_in: int,
    epsg_out: int,
    fmt: str = "gpkg",
) -> int:
    src = _ensure_dxf(src)
    doc = ezdxf.readfile(src)
    msp = doc.modelspace()

    by_layer: dict[str, list] = {}
    for e in msp:
        layer_name = e.dxf.layer
        if not _matches_any(layer_name, layer_patterns):
            continue
        by_layer.setdefault(layer_name, []).append(e)

    if not by_layer:
        print("No layers matched. Try less restrictive --layers.")
        return 1

    Path(out_dir).mkdir(parents=True, exist_ok=True)

    crs_out = CRS.from_epsg(epsg_out)
    xform = _make_xform(epsg_in, epsg_out)

    fmt = fmt.lower()
    driver_map = {"gpkg": "GPKG", "shp": "ESRI Shapefile", "geojson": "GeoJSON"}
    if fmt not in driver_map:
        raise SystemExit(f"Unknown --format {fmt}; use gpkg, shp, or geojson")
    driver = driver_map[fmt]

    in_stem = Path(src).stem
    # NOTE: GPKG multi-layer append is buggy on Windows + Fiona 1.10 (NULL
    # pointer). To stay portable we write one .gpkg per layer just like SHP
    # and GeoJSON. Re-merge in QGIS / ogrmerge if a single file is required.

    schema_props = {"dxftype": "str", "handle": "str", "layer": "str"}
    written = 0

    for layer_name, entities in by_layer.items():
        # convert
        items: list[tuple] = []  # (entity, shapely_geom)
        for e in entities:
            g = _entity_to_shape(e)
            if g is None or g.is_empty:
                continue
            if xform is not None:
                g = shp_transform(xform, g)
            items.append((e, g))
        if not items:
            print(f"  layer {layer_name}: no convertible geometry, skipped")
            continue

        gtype = _layer_geom_type([g for _, g in items])
        safe_name = layer_name.replace("/", "_").replace("\\", "_")[:63]
        schema = {"geometry": gtype, "properties": schema_props}

        if fmt == "gpkg":
            target_path = str(Path(out_dir) / f"{safe_name}.gpkg")
            if Path(target_path).exists():
                os.remove(target_path)
            sink = fiona.open(
                target_path, "w",
                driver=driver, schema=schema, crs=crs_out, layer=safe_name,
            )
        elif fmt == "shp":
            target_path = str(Path(out_dir) / f"{safe_name}.shp")
            sink = fiona.open(
                target_path, "w",
                driver=driver, schema=schema, crs=crs_out,
                encoding="utf-8",
            )
        else:  # geojson
            target_path = str(Path(out_dir) / f"{safe_name}.geojson")
            sink = fiona.open(
                target_path, "w",
                driver=driver, schema=schema, crs=crs_out,
            )

        try:
            for e, g in items:
                # auto-promote geometry type if mixed
                if gtype == "MultiPolygon" and g.geom_type == "LineString":
                    continue
                if gtype == "MultiLineString" and g.geom_type == "Polygon":
                    g = g.boundary
                sink.write({
                    "geometry": mapping(g),
                    "properties": {
                        "dxftype": e.dxftype(),
                        "handle":  str(e.dxf.handle),
                        "layer":   layer_name[:254],
                    },
                })
                written += 1
        finally:
            sink.close()

        print(f"  layer {layer_name}: {len(items)} features -> {target_path}")

    print(f"wrote {written} features to {out_dir}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input")
    parser.add_argument("output_dir")
    parser.add_argument(
        "--layers",
        default="",
        help="comma-separated wildcard patterns to keep (default: all)",
    )
    parser.add_argument("--epsg-in",  type=int, default=32638, help="source EPSG (default 32638 = UTM 38N)")
    parser.add_argument("--epsg-out", type=int, default=32638, help="output EPSG (default 32638)")
    parser.add_argument(
        "--format", default="geojson", choices=["geojson", "shp", "gpkg"],
        help=(
            "geojson (default; one file per layer, opens in QGIS/ArcGIS/web), "
            "shp (one shapefile per layer), or gpkg (multi-layer single file - "
            "may need a GDAL/Fiona rebuild on Windows)."
        ),
    )
    args = parser.parse_args(argv)

    patterns = [p.strip() for p in args.layers.split(",") if p.strip()] if args.layers else []
    return export(
        args.input, args.output_dir, patterns,
        args.epsg_in, args.epsg_out, args.format,
    )


if __name__ == "__main__":
    sys.exit(main())
