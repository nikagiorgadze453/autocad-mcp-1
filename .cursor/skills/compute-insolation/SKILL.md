---
name: compute-insolation
description: Computes direct-sunlight hours per room (СНиП 2.07.01-89 §6) for a date and location. Use when the user asks for "insolation analysis", "სხივების / ინსოლაცია", "სარგებლობის საათები", "sun-hours check", "do rooms get enough sunlight", or anything about the 2.5-hour daylight requirement.
---

# compute-insolation skill

## What it does

Given a rooms.json (output of `extract_rooms`), reports per-room hours
of direct sunlight on a given date at a given location, and PASS/FAIL
against the **СНиП 2.07.01-89 §6** threshold (2.5 h on 22 March /
22 September for Tbilisi).

## Inputs needed

1. `<dwg>.walls.rooms.json` **with polygon vertices** (re-run
   `polygonize_rooms.py --keep-polygon` if you don't have them)
2. Date (default 2026-03-22 — vernal equinox)
3. Latitude / longitude (default Tbilisi 41.7151 / 44.8271)

## Two-step usage

```
1) extract_rooms({ inputPath: "C:/.../UNI B2.dwg", keepPolygon: true })
   -> writes UNI B2.walls.rooms.json (with polygons)
2) compute_insolation({ roomsJson: "C:/.../UNI B2.walls.rooms.json" })
   -> writes UNI B2.walls.insolation.json
```

The combined pipeline:

```
DWG -> dump-walls.lsp -> walls.json
    -> polygonize_rooms.py --keep-polygon -> rooms.json
    -> compute_insolation.py -> insolation.json
```

## What the output looks like

For each room:

| Field | Meaning |
|---|---|
| `best_azimuth`  | The facade direction with the most sun (e.g. 180° = south) |
| `best_hours`    | Hours of sun on the best facade |
| `worst_hours`   | Hours on the worst facade |
| `facades`       | Full per-facade breakdown |
| `snip_pass`     | `true` if `best_hours ≥ threshold_h` (default 2.5) |

## Decision flow

```
For each labelled habitable room (bedroom, living, combined L+K):
  is best_hours >= 2.5 h?
    YES -> PASS
    NO  -> FAIL  (recommend re-orientation or larger setback)
```

Auxiliary rooms (`damxmare farTi`, bathroom, WC, kitchen-niche,
storage, corridor) are **exempt** from the daylight test. Filter them
out of the FAIL list before reporting to the client.

## Office defaults (Tbilisi)

| Param | Default | Reason |
|---|---|---|
| `lat`            | 41.7151    | Tbilisi |
| `lon`            | 44.8271    | Tbilisi |
| `timezoneOffset` | 4          | Tbilisi = UTC+04:00 (no DST since 2005) |
| `date`           | 2026-03-22 | СНиП §6 check date (vernal equinox) |
| `thresholdH`     | 2.5        | СНиП §6 for latitudes < 48 N |
| `stepMinutes`    | 5          | Resolution. 1-min is overkill, 15-min is too coarse. |
| `halfAcceptance` | 90         | Flat opening, no reveal. Reduce to 70 for deep-jamb windows. |
| `minEdgeM`       | 1.5        | Drop short polygon edges (corners) |

## Cross-checks

After running, also check:

1. **Daylight factor (rule 09):** every habitable room window area must
   be ≥ 1/8 of room floor area. The polygon area is `area_m2`; sum the
   per-window glazing area against this from the door/window schedule.
2. **K-3 green coefficient (rule 06):** if facades are heavily blocked
   by trees in `xref_gamwvaneba`, increase the building setback.
3. **Setbacks (rule 06):** if multiple rooms fail, re-check
   building-to-building distance (`h` = taller building's height).

## Sun-hour quick reference for Tbilisi @ 22 Mar

| Facade | Hours | Pass? |
|---|---|---|
| N (0°)        | 0.2  | NO  |
| NE (45°)      | 3.0  | YES |
| E (90°)       | 6.0  | YES |
| SE (135°)     | 8.9  | YES |
| S (180°)      | 11.8 | YES |
| SW (225°)     | 8.9  | YES |
| W (270°)      | 6.1  | YES |
| NW (315°)     | 3.0  | YES |

If a unit only has windows in the N–NW–N–NE arc, it cannot pass СНиП §6
by daylight alone — must add a corner window or change orientation.

## Solar math

Implementation: `scripts/python/solar.py`. Pure stdlib (no `pysolar`,
no `astral`). Uses the **simplified NOAA solar position algorithm**
accurate to about 1 arcmin — easily enough for the СНиП §6 check.

The two functions of interest:

```python
from solar import sun_position, sun_hours_facing
# sun_position(lat, lon, datetime_utc)  -> (azimuth, elevation) degrees
# sun_hours_facing(lat, lon, date, azimuth, ...)
#   -> { "hours": 6.0, "episodes": [...], ... }
```

## Limitations

- **No shadowing.** v1 does not subtract shadows from neighbouring
  buildings. Acceptable for stand-alone blocks; for tight urban infill
  use a ray-trace tool (see rule 12 `archilume` / FreeCAD-Solar).
- **Per-facade not per-window.** v1 takes every outer polygon edge as
  a potential glazing direction. A real audit would use the window
  block INSERT positions.
- **Atmospheric refraction** not modelled near the horizon. Adds about
  0.5° elevation at sunrise/sunset; negligible for the 2.5 h check.

## Source files

- `scripts/python/solar.py` — pure-math solar position + per-direction hours
- `scripts/python/compute_insolation.py` — polygon-edge -> hours pipeline
- `src/index.ts → handleComputeInsolation()` — MCP wrapper
- `.cursor/rules/14-insolation.mdc` — rule and thresholds
