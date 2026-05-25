"""compute_insolation.py — per-room sun-hours from a rooms.json

Pipeline:
  1. Read <dwg>.walls.rooms.json (output of polygonize_rooms.py)
  2. For each room polygon, find the longest exterior-edge segments
     -> determine the OUTWARD normal direction of each (= window facing
     azimuth). Multiple if the room has facades on multiple sides.
  3. For each facade direction, compute direct sunlight hours on the
     specified date using solar.py.
  4. Report PASS/FAIL against the СНиП 2.07.01-89 §6 threshold of
     2.5 h on Mar 22 / Sep 22 in Tbilisi.

Output: <dwg>.walls.insolation.json with per-room records:
  {
    "id": 313,
    "label": "bina 42.0",
    "area_m2": 41.36,
    "best_azimuth": 188,
    "best_hours": 11.7,
    "worst_azimuth": 8,
    "worst_hours": 0.1,
    "facades": [
      {"azimuth": 188, "length_m": 6.6, "hours": 11.7},
      {"azimuth":  98, "length_m": 6.5, "hours":  5.8}
    ],
    "snip_pass": true
  }
"""
from __future__ import annotations
import argparse
import json
import math
import sys
from datetime import date
from pathlib import Path
from typing import List, Tuple

# Force UTF-8 stdout on Windows so Georgian labels print
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    from shapely.geometry import Polygon
except ImportError:
    sys.stderr.write("Missing shapely. pip install shapely\n")
    sys.exit(1)

# allow `python compute_insolation.py ...` from any CWD
sys.path.insert(0, str(Path(__file__).resolve().parent))
from solar import sun_hours_facing  # noqa: E402


def _seg_normal_azimuth(p1: Tuple[float, float],
                        p2: Tuple[float, float],
                        interior_pt: Tuple[float, float]) -> float:
    """Return the azimuth (deg, CW from north) of the OUTWARD normal of
    a polygon edge p1->p2, given an interior reference point."""
    dx, dy = p2[0] - p1[0], p2[1] - p1[1]
    # left and right normals
    n1 = (-dy, dx)
    n2 = ( dy, -dx)
    # midpoint of edge
    mx, my = (p1[0] + p2[0]) / 2.0, (p1[1] + p2[1]) / 2.0
    # interior reference is centroid of polygon
    cx, cy = interior_pt
    # outward normal is the one pointing AWAY from centroid
    v1 = (cx - mx, cy - my)  # midpoint -> centroid (inward)
    # take normal whose dot with v1 is negative (i.e. opposite inward)
    if n1[0] * v1[0] + n1[1] * v1[1] < 0:
        nx, ny = n1
    else:
        nx, ny = n2
    # convert (nx, ny) Cartesian -> azimuth (clockwise from north)
    # Cartesian: east = +x, north = +y
    # azimuth_deg = atan2(east_component, north_component)
    az = math.degrees(math.atan2(nx, ny)) % 360.0
    return az


def facades_from_polygon(poly: Polygon,
                         min_edge_m: float = 1.5) -> List[dict]:
    """Return list of facade dicts: {azimuth_deg, length_m}. Edges
    shorter than min_edge_m are dropped (corners, jambs)."""
    cx, cy = poly.centroid.x, poly.centroid.y
    coords = list(poly.exterior.coords)
    out: List[dict] = []
    for a, b in zip(coords[:-1], coords[1:]):
        dx, dy = b[0] - a[0], b[1] - a[1]
        length_m = math.hypot(dx, dy) / 1000.0  # mm -> m
        if length_m < min_edge_m:
            continue
        az = _seg_normal_azimuth(a, b, (cx, cy))
        out.append({"azimuth": round(az, 1), "length_m": round(length_m, 2)})
    # merge near-duplicate azimuths (within 10 deg)
    merged: List[dict] = []
    for f in sorted(out, key=lambda x: x["azimuth"]):
        if merged and abs(merged[-1]["azimuth"] - f["azimuth"]) < 10.0:
            merged[-1]["length_m"] = round(merged[-1]["length_m"] + f["length_m"], 2)
        else:
            merged.append(dict(f))
    return merged


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("rooms_json", help=".walls.rooms.json from polygonize_rooms.py")
    ap.add_argument("--lat", type=float, default=41.7151, help="default = Tbilisi")
    ap.add_argument("--lon", type=float, default=44.8271)
    ap.add_argument("--tz",  type=float, default=4.0, help="UTC offset hours (Tbilisi = +4)")
    ap.add_argument("--date", default="2026-03-22",
                    help="check date YYYY-MM-DD. СНиП says 22 mar / 22 sep.")
    ap.add_argument("--threshold-h", type=float, default=2.5,
                    help="minimum hours of direct sunlight for PASS (СНиП §6 = 2.5)")
    ap.add_argument("--step", type=int, default=5, help="sampling step in minutes")
    ap.add_argument("--half-acceptance", type=float, default=90.0)
    ap.add_argument("--min-edge-m", type=float, default=1.5,
                    help="ignore polygon edges shorter than this many metres")
    ap.add_argument("-o", "--output")
    args = ap.parse_args()

    src = Path(args.rooms_json)
    if not src.exists():
        sys.stderr.write(f"file not found: {src}\n")
        return 2
    raw = json.loads(src.read_text(encoding="utf-8"))

    # need polygons; if not present, fail with a helpful message
    if not raw.get("rooms"):
        sys.stderr.write("no rooms in input\n")
        return 2
    if "polygon" not in raw["rooms"][0]:
        sys.stderr.write(
            "input rooms.json must contain polygon vertices. Re-run\n"
            "polygonize_rooms.py with --keep-polygon flag.\n")
        return 2

    y, m, d = (int(x) for x in args.date.split("-"))
    check_date = date(y, m, d)

    # cache solar lookup per discrete azimuth bucket (5 deg buckets)
    cache: dict = {}

    def lookup(az_deg: float) -> float:
        key = round(az_deg / 5.0) * 5
        if key in cache:
            return cache[key]
        r = sun_hours_facing(args.lat, args.lon, check_date,
                             window_azimuth_deg=key,
                             half_acceptance_deg=args.half_acceptance,
                             step_minutes=args.step,
                             timezone_offset_h=args.tz)
        cache[key] = r["hours"]
        return r["hours"]

    out_rooms = []
    for r in raw["rooms"]:
        poly_coords = r.get("polygon")
        if not poly_coords or len(poly_coords) < 3:
            continue
        poly = Polygon(poly_coords)
        if not poly.is_valid:
            poly = poly.buffer(0)
            if not poly.is_valid or poly.area == 0:
                continue
        facades = facades_from_polygon(poly, args.min_edge_m)
        if not facades:
            continue
        for f in facades:
            f["hours"] = round(lookup(f["azimuth"]), 2)
        best  = max(facades, key=lambda f: f["hours"])
        worst = min(facades, key=lambda f: f["hours"])
        out_rooms.append({
            "id": r.get("id"),
            "label": r.get("label"),
            "label_mkhedruli": r.get("label_mkhedruli"),
            "area_m2": r.get("area_m2"),
            "claimed_m2": r.get("claimed_m2"),
            "centroid": r.get("centroid"),
            "facades": facades,
            "best_azimuth": best["azimuth"],
            "best_hours":   best["hours"],
            "worst_azimuth": worst["azimuth"],
            "worst_hours":   worst["hours"],
            "snip_pass": best["hours"] >= args.threshold_h,
        })

    out_rooms.sort(key=lambda x: x["best_hours"], reverse=True)

    summary = {
        "source":        str(src.name),
        "lat":           args.lat,
        "lon":           args.lon,
        "date":          args.date,
        "threshold_h":   args.threshold_h,
        "rooms_total":   len(out_rooms),
        "rooms_pass":    sum(1 for r in out_rooms if r["snip_pass"]),
        "rooms_fail":    sum(1 for r in out_rooms if not r["snip_pass"]),
        "rooms":         out_rooms,
    }

    if args.output:
        out_path = Path(args.output)
    else:
        out_path = src.with_suffix(".insolation.json").with_name(
            src.stem.replace(".rooms", "") + ".insolation.json"
        )
    out_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    print(f"wrote {out_path}")
    print(f"  rooms total : {summary['rooms_total']}")
    print(f"  PASS (>= {args.threshold_h} h) : {summary['rooms_pass']}")
    print(f"  FAIL                          : {summary['rooms_fail']}")
    if summary["rooms_total"]:
        worst = min(out_rooms, key=lambda r: r["best_hours"])
        best  = max(out_rooms, key=lambda r: r["best_hours"])
        print(f"  best room  : id={best['id']} label={best['label']} hours={best['best_hours']}")
        print(f"  worst room : id={worst['id']} label={worst['label']} hours={worst['best_hours']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
