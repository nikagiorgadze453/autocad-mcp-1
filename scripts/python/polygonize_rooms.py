#!/usr/bin/env python3
"""polygonize_rooms.py — given a <dwg>.walls.json (see dump-walls.lsp),
produce <dwg>.rooms.json with per-room polygons + areas + matched
Georgian label (if any text falls inside the polygon).

Pipeline:
  1. Load JSON, parse line segments and text labels.
  2. Filter segments to "wall-like" layers (configurable list).
  3. unary_union + polygonize via shapely → candidate room polygons.
  4. For each polygon, score by area band [1, 100] m² (typical rooms).
  5. Find Georgian-text labels whose insertion point falls inside.
  6. Output JSON with sortable per-room records.

Usage:
  python polygonize_rooms.py "C:/Users/.../UNI B2.walls.json"
  python polygonize_rooms.py "C:/Users/.../UNI B2.walls.json" --layer-include "kedel,kontur,wall,0"
  python polygonize_rooms.py "C:/Users/.../UNI B2.walls.json" --min-m2 2 --max-m2 80
"""

from __future__ import annotations
import argparse
import json
import re
import sys
from pathlib import Path
from typing import List, Tuple

try:
    from shapely.geometry import LineString, Point, Polygon, mapping
    from shapely.ops import polygonize, unary_union, snap
except ImportError:
    sys.stderr.write("Missing shapely. Install with: pip install shapely\n")
    sys.exit(1)


# ---------- AutoCAD MText / encoding helpers ----------

_FONT_TAG_RE = re.compile(r"\\[fF][^;]*;")
_COLOR_TAG_RE = re.compile(r"\\[cCQqWHL][^;]*;")
_PARA_RE = re.compile(r"\\[pP][^;]*;")
_BRACE_RE = re.compile(r"[{}]")
_PLINE = re.compile(r"\\P")
_NEWLINE_TAG_RE = re.compile(r"\\[A][0-9]*;")
_UNICODE_ESC_RE = re.compile(r"\\U\+([0-9A-Fa-f]{4})")


def clean_mtext(s: str) -> str:
    if not s:
        return ""
    s = _UNICODE_ESC_RE.sub(lambda m: chr(int(m.group(1), 16)), s)
    s = _PLINE.sub(" ", s)
    s = _FONT_TAG_RE.sub("", s)
    s = _COLOR_TAG_RE.sub("", s)
    s = _PARA_RE.sub("", s)
    s = _NEWLINE_TAG_RE.sub("", s)
    s = _BRACE_RE.sub("", s)
    return s.strip()


def has_georgian(s: str) -> bool:
    return any(0x10A0 <= ord(c) <= 0x10FF or 0x2D00 <= ord(c) <= 0x2D2F for c in s)


# Avaza/Acadmtav-style Latin -> Mkhedruli transliteration table used in
# most old Tbilisi office files. The capitals are the trick: T=თ, C=ჩ,
# c=ც, R=ღ, S=შ, W=ჭ, Z=ძ, J=ჟ.
TRANSLIT = {
    "a": "ა", "b": "ბ", "g": "გ", "d": "დ", "e": "ე", "v": "ვ",
    "z": "ზ", "T": "თ", "i": "ი", "k": "კ", "l": "ლ", "m": "მ",
    "n": "ნ", "o": "ო", "p": "პ", "J": "ჟ", "r": "რ", "s": "ს",
    "t": "ტ", "u": "უ", "f": "ფ", "q": "ქ", "R": "ღ", "y": "ყ",
    "S": "შ", "C": "ჩ", "c": "ც", "Z": "ძ", "w": "წ", "W": "ჭ",
    "x": "ხ", "j": "ჯ", "h": "ჰ",
}


def transliterate(s: str) -> str:
    return "".join(TRANSLIT.get(c, c) for c in s)


# Acadmtav / Avaza transliterated Georgian room labels.
# Keep BOTH the Latin form (as found in the DWG) and the Mkhedruli
# rendering for human reading.
LATIN_ROOM_HINTS = {
    # Latin (in DWG) -> Mkhedruli meaning
    "bina":        "ბინა (apartment)",
    "samzareulo":  "სამზარეულო (kitchen)",
    "saZinebeli":  "საძინებელი (bedroom)",
    "misaRebi":    "მისაღები (living)",
    "sasadilo":    "სასადილო (dining)",
    "abazana":     "აბაზანა (bathroom)",
    "sveli":       "სველი (wet area)",
    "Sesasvleli": "შესასვლელი (entry)",
    "derefani":    "დერეფანი (corridor)",
    "vestibiuli":  "ვესტიბიული (vestibule)",
    "holi":        "ჰოლი (hall)",
    "lojia":       "ლოჯია (loggia)",
    "aivani":      "აივანი (balcony)",
    "kibe":        "კიბე (stair)",
    "farTi":       "ფართი (area)",
    "oTaxi":       "ოთახი (room)",
    "saTavso":     "სათავსო (storage)",
    "gasaxdeli":   "გასახდელი (changing)",
    "karada":      "კარადა (closet)",
    "damxmare":    "დამხმარე (auxiliary)",
    "saxuravi":    "სახურავი (roof)",
    "terasa":      "ტერასა (terrace)",
}


_BINA_RE = re.compile(r"bina\s*(\d+(?:[.,]\d+)?)", re.IGNORECASE)


def parse_bina_label(s: str):
    """Returns (apt_no, m2) or (None, None). `bina41.0` -> (None, 41.0).
    The number is the AREA, not an apartment ID — matches the office
    convention `binis faerti` layer."""
    m = _BINA_RE.search(s)
    if not m:
        return (None, None)
    val = float(m.group(1).replace(",", "."))
    return (None, val)


def looks_like_room_label(s: str) -> bool:
    if not s or len(s) > 80:
        return False
    # 1) literal Georgian Unicode
    if has_georgian(s):
        return True
    # 2) Latin-transliterated office vocabulary
    lower = s
    for hint in LATIN_ROOM_HINTS:
        if hint in lower:
            return True
    return False


# ---------- Geometry helpers ----------

WALL_LAYER_KEYWORDS = [
    "kedel", "kedlebi", "wall", "kontur", "blokis", "carcer", "binebi",
    "tixar", "partition", "0_pen_no",
]
EXCLUDE_LAYER_KEYWORDS = [
    "dim", "zoma", "title", "anno", "section", "axes", "pdf", "vitra",
    "doors", "aveji", "furniture", "saxandzro", "shaxtebi", "litoni",
    "iataki", "agurit", "saventil", "lifti",
    # label-box layers — NOT real walls, just rectangles around text
    "binebi binebi", "binis faerti", "binis_faerti", "bineb",
    "carcerebi farttt", "farttt", "g-anno", "g-sect",
    "pen_no__250",  # the hatch-cyan label highlight layer
    "defpoints", "drenaji", "rigelebi", "terasa", "h", "0.00",
    "reynaers", "pdf2",
]


def layer_is_wall(name: str, includes: List[str], excludes: List[str],
                  open_filter: bool = False) -> bool:
    n = name.lower()
    for e in excludes:
        if e and e in n:
            return False
    if open_filter:
        return True
    for inc in includes:
        if inc and inc in n:
            return True
    return False


def normalise_segments(walls, min_seg_mm: float):
    segs = []
    for w in walls:
        if w is None:
            continue
        a, b = w["a"], w["b"]
        ax, ay = a[0], a[1]
        bx, by = b[0], b[1]
        if abs(ax - bx) < 1e-6 and abs(ay - by) < 1e-6:
            continue
        d = ((ax - bx) ** 2 + (ay - by) ** 2) ** 0.5
        if d < min_seg_mm:
            continue
        segs.append(LineString([(ax, ay), (bx, by)]))
    return segs


# ---------- Main ----------

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("walls_json")
    ap.add_argument("--min-m2", type=float, default=1.0)
    ap.add_argument("--max-m2", type=float, default=120.0)
    ap.add_argument("--min-seg-mm", type=float, default=50.0,
                    help="discard wall segments shorter than this")
    ap.add_argument("--layer-include", default=None,
                    help="comma list, override default wall keywords")
    ap.add_argument("--layer-exclude", default=None,
                    help="comma list, override default excludes")
    ap.add_argument("--all-layers", action="store_true",
                    help="ignore include list, accept any layer not in exclude")
    ap.add_argument("--snap-mm", type=float, default=20.0,
                    help="snap near-coincident vertices within this distance "
                         "(default 20 mm). 0 disables.")
    ap.add_argument("--buffer-m", type=float, default=12.0,
                    help="search radius (m) for label-to-polygon matching")
    ap.add_argument("-o", "--output", default=None)
    ap.add_argument("--keep-polygon", action="store_true",
                    help="include polygon vertex list in output (large)")
    args = ap.parse_args()

    inc = ([s.strip().lower() for s in args.layer_include.split(",")]
           if args.layer_include else WALL_LAYER_KEYWORDS)
    exc = ([s.strip().lower() for s in args.layer_exclude.split(",")]
           if args.layer_exclude else EXCLUDE_LAYER_KEYWORDS)

    src = Path(args.walls_json)
    if not src.exists():
        sys.stderr.write(f"file not found: {src}\n")
        return 2
    raw = src.read_text(encoding="utf-8", errors="replace")
    # AutoCAD writes \U+XXXX literals -> normalise
    raw = _UNICODE_ESC_RE.sub(lambda m: chr(int(m.group(1), 16)), raw)
    data = json.loads(raw)

    walls = [w for w in data.get("lines", []) if w is not None]
    texts = [t for t in data.get("texts", []) if t is not None]
    print(f"loaded: {len(walls)} segments  {len(texts)} texts")

    # 1) filter to wall-like layers
    wall_walls = [w for w in walls
                  if layer_is_wall(w.get("l", ""), inc, exc, args.all_layers)]
    print(f"after layer filter: {len(wall_walls)} segments")

    # 2) build linestrings, polygonize
    segs = normalise_segments(wall_walls, args.min_seg_mm)
    print(f"after length filter: {len(segs)} segments")
    if not segs:
        print("no segments to polygonize")
        return 1

    print("union...")
    merged = unary_union(segs)
    if args.snap_mm > 0:
        print(f"snap (tol={args.snap_mm} mm)...")
        merged = snap(merged, merged, tolerance=args.snap_mm)
        merged = unary_union(merged)
    print("polygonize...")
    polys = list(polygonize(merged))
    print(f"polygons: {len(polys)}")

    # 3) filter by area band
    rooms = []
    min_mm2 = args.min_m2 * 1e6
    max_mm2 = args.max_m2 * 1e6
    for p in polys:
        a = p.area
        if a < min_mm2 or a > max_mm2:
            continue
        rooms.append(p)
    print(f"after area filter [{args.min_m2}, {args.max_m2}] m^2: {len(rooms)}")

    # 4) prepare labels
    geo_labels = []
    for t in texts:
        cleaned = clean_mtext(t.get("t", ""))
        is_room = looks_like_room_label(cleaned)
        is_uni = bool(t.get("u"))
        apt, claimed_m2 = parse_bina_label(cleaned)
        if is_room or is_uni or apt is not None or claimed_m2 is not None:
            geo_labels.append({
                "text": cleaned,
                "text_mkhedruli": transliterate(cleaned) if not has_georgian(cleaned) else cleaned,
                "insert": t["p"],
                "layer": t.get("l", ""),
                "is_room_hint": is_room,
                "claimed_m2": claimed_m2,
            })

    print(f"label candidates: {len(geo_labels)}, room hints: "
          f"{sum(1 for l in geo_labels if l['is_room_hint'])}, "
          f"with claimed_m2: {sum(1 for l in geo_labels if l['claimed_m2'])}")

    # 5) match texts to polygons
    # Two-pass strategy:
    #   PASS A (label-driven, strongest):
    #     For every label with a `claimed_m2`, find the polygon within
    #     `wide_buffer_mm` whose geometric area is closest to the claim
    #     (within +-30% area tolerance). This avoids latching onto the
    #     tiny `bina XX.X` annotation box and finds the real apt outline.
    #   PASS B (polygon-driven, fallback):
    #     For unmatched polygons, take the nearest room-hint label
    #     within `match_buffer_mm`.
    wide_buffer_mm = args.buffer_m * 1000.0
    match_buffer_mm = 4000.0   # 4 m for room-hint fallback
    # `bina XX.X` is *net living area* — polygon shell can be larger
    # because it includes walls, terraces, balconies. Allow geom up to
    # 2.5x claim, but require geom >= claim - 5 m^2 (no shrinking).
    area_lo_factor = 0.85   # allow polygon a bit smaller than claim
    area_hi_factor = 2.50   # allow much bigger (wall + terrace)
    min_apt_m2 = 15.0       # ignore label-box polygons under 15 m^2

    label_pts = [Point(l["insert"][0], l["insert"][1]) for l in geo_labels]
    poly_centroids = [r.centroid for r in rooms]
    poly_areas = [r.area for r in rooms]

    # poly_idx -> (label_idx, distance) when assigned
    assignments = {}
    used_label_ids = set()

    # ---- PASS A: claim-area driven ----
    candidates = sorted(
        [(li, lab) for li, lab in enumerate(geo_labels) if lab["claimed_m2"]],
        key=lambda x: -(x[1]["claimed_m2"] or 0),
    )
    pass_a_hits = 0
    diag_first = True
    for li, lab in candidates:
        claim_mm2 = lab["claimed_m2"] * 1e6
        lo = max(claim_mm2 * area_lo_factor, min_apt_m2 * 1e6)
        hi = claim_mm2 * area_hi_factor
        lp = label_pts[li]
        # diagnostics: find best by area (any distance) and closest in band
        best_in_band = None
        all_in_band = 0
        for pi, pa in enumerate(poly_areas):
            if pi in assignments:
                continue
            if not (lo <= pa <= hi):
                continue
            all_in_band += 1
            d = lp.distance(poly_centroids[pi])
            if d > wide_buffer_mm:
                continue
            score = d if not rooms[pi].contains(lp) else 0.0
            if best_in_band is None or score < best_in_band[1]:
                best_in_band = (pi, score, pa)
        if best_in_band is not None:
            assignments[best_in_band[0]] = (li, best_in_band[1])
            used_label_ids.add(li)
            pass_a_hits += 1
        elif diag_first:
            # find nearest centroid regardless of band
            d_min = None; pi_min = None
            for pi, pa in enumerate(poly_areas):
                d = lp.distance(poly_centroids[pi])
                if d_min is None or d < d_min:
                    d_min, pi_min = d, pi
            print(f"  DIAG miss: label@({lp.x:.0f},{lp.y:.0f}) claim={lab['claimed_m2']}  in-band={all_in_band}  nearest poly idx={pi_min} area={poly_areas[pi_min]/1e6:.2f} dist={d_min:.0f}mm")
            diag_first = False
    print(f"pass A (claim-area): {pass_a_hits} / {len(candidates)} matched")

    # ---- PASS B: fallback for room-hint labels (kitchen, bedroom, etc.) ----
    for idx, p in enumerate(rooms):
        if idx in assignments:
            continue
        cent = poly_centroids[idx]
        best = None
        for li, lab in enumerate(geo_labels):
            if li in used_label_ids:
                continue
            if not lab["is_room_hint"]:
                continue
            if lab["claimed_m2"]:
                continue  # already handled in pass A
            d = label_pts[li].distance(cent)
            if d > match_buffer_mm:
                continue
            if p.contains(label_pts[li]):
                d = 0.0
            if best is None or d < best[1]:
                best = (li, d)
        if best is not None:
            assignments[idx] = best
            used_label_ids.add(best[0])

    out_rooms = []
    for idx, p in enumerate(rooms):
        cent = poly_centroids[idx]
        primary = None
        labels_inside_or_near = []
        if idx in assignments:
            li, d = assignments[idx]
            primary = (li, geo_labels[li], d)
        # collect other nearby labels (for debug)
        for li, lab in enumerate(geo_labels):
            pt = label_pts[li]
            d = pt.distance(cent)
            if d <= match_buffer_mm:
                labels_inside_or_near.append((li, lab, d))
        area_m2 = round(p.area / 1e6, 3)
        record = {
            "id": idx,
            "area_m2": area_m2,
            "centroid": [round(cent.x, 1), round(cent.y, 1)],
            "label": primary[1]["text"] if primary else None,
            "label_mkhedruli": primary[1]["text_mkhedruli"] if primary else None,
            "label_is_hint": bool(primary and primary[1]["is_room_hint"]),
            "label_distance_mm": round(primary[2], 1) if primary else None,
            "claimed_m2": primary[1]["claimed_m2"] if primary else None,
            "other_labels": [l["text"] for _, l, _ in labels_inside_or_near
                             if primary is None or l is not primary[1]][:4],
        }
        if primary and primary[1]["claimed_m2"]:
            record["delta_m2"] = round(area_m2 - primary[1]["claimed_m2"], 3)
        if args.keep_polygon:
            record["polygon"] = list(p.exterior.coords)
        out_rooms.append(record)

    out_rooms.sort(key=lambda r: -r["area_m2"])

    # summary buckets
    bucket = {
        "tiny (<5)": 0,
        "small (5-10)": 0,
        "medium (10-20)": 0,
        "large (20-50)": 0,
        "huge (>50)": 0,
    }
    for r in out_rooms:
        a = r["area_m2"]
        if a < 5:
            bucket["tiny (<5)"] += 1
        elif a < 10:
            bucket["small (5-10)"] += 1
        elif a < 20:
            bucket["medium (10-20)"] += 1
        elif a < 50:
            bucket["large (20-50)"] += 1
        else:
            bucket["huge (>50)"] += 1

    # cross-check: sum of label-claimed m^2
    claimed = [r["claimed_m2"] for r in out_rooms if r.get("claimed_m2")]
    summary = {
        "file": data.get("file"),
        "n_polygons_raw": len(polys),
        "n_rooms_in_band": len(out_rooms),
        "n_labeled": sum(1 for r in out_rooms if r["label"]),
        "n_room_hint_labeled": sum(1 for r in out_rooms if r["label_is_hint"]),
        "n_with_claimed_m2": len(claimed),
        "total_m2_geometric": round(sum(r["area_m2"] for r in out_rooms), 2),
        "total_m2_claimed": round(sum(claimed), 2) if claimed else 0,
        "area_buckets": bucket,
        "rooms": out_rooms,
    }

    out_path = Path(args.output) if args.output else src.with_suffix(".rooms.json")
    out_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    print(f"wrote {out_path}")
    print(f"  rooms             : {len(out_rooms)}")
    print(f"  labeled           : {summary['n_labeled']}")
    print(f"  with claimed m^2  : {summary['n_with_claimed_m2']}")
    print(f"  total geometric m^2: {summary['total_m2_geometric']}")
    print(f"  total claimed m^2 : {summary['total_m2_claimed']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
