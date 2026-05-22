"""solar.py — pure-math solar position + per-azimuth sun-hours.

No external deps. Uses the simplified NOAA solar position algorithm,
accurate to ~1 arcmin which is more than enough for an insolation check
per СНиП 2.07.01-89 §6 (which requires whole-minute resolution).

The two routines an outside caller needs:

  sun_position(lat_deg, lon_deg, dt_utc) -> (azimuth_deg, elevation_deg)
      azimuth is measured CLOCKWISE from north, so:
        0   = N      90 = E
        180 = S      270 = W

  sun_hours_facing(lat_deg, lon_deg, date,
                   window_azimuth_deg,
                   half_acceptance_deg=90.0,
                   step_minutes=5)
      Returns the number of hours within the date during which the sun
      is above the horizon AND its azimuth is within
      `+- half_acceptance_deg` of the window's facing direction. 90 deg
      is the geometrically correct value for a flat opening with no
      reveal; reduce (e.g. 80) to account for the wall jamb shading.

This is enough for the per-room test:
  "each habitable room must receive >= 2.5 h direct sunlight on
   March 22 / September 22 (СНиП 2.07.01-89)"
"""
from __future__ import annotations

import math
from datetime import date, datetime, timedelta, timezone
from typing import Tuple

PI = math.pi
TO_RAD = PI / 180.0
TO_DEG = 180.0 / PI


def _julian_day(dt: datetime) -> float:
    """Convert a UTC datetime to Julian Day."""
    dt = dt.astimezone(timezone.utc)
    Y, M = dt.year, dt.month
    D = dt.day + (dt.hour + dt.minute / 60.0 + dt.second / 3600.0) / 24.0
    if M <= 2:
        Y -= 1
        M += 12
    A = Y // 100
    B = 2 - A + A // 4
    return int(365.25 * (Y + 4716)) + int(30.6001 * (M + 1)) + D + B - 1524.5


def sun_position(lat_deg: float, lon_deg: float,
                 dt: datetime) -> Tuple[float, float]:
    """Return (azimuth_deg, elevation_deg) for the sun at given UTC dt.
    Azimuth is measured clockwise from north (0..360)."""
    if dt.tzinfo is None:
        # assume given as UTC if naive
        dt = dt.replace(tzinfo=timezone.utc)
    jd = _julian_day(dt)
    n = jd - 2451545.0       # days since J2000
    L = (280.460 + 0.9856474 * n) % 360            # mean longitude, deg
    g = ((357.528 + 0.9856003 * n) % 360) * TO_RAD  # mean anomaly, rad
    # ecliptic longitude
    lam = (L + 1.915 * math.sin(g) + 0.020 * math.sin(2 * g)) * TO_RAD
    # obliquity of the ecliptic
    eps = (23.439 - 0.0000004 * n) * TO_RAD
    # right ascension + declination
    sin_lam = math.sin(lam)
    cos_lam = math.cos(lam)
    ra = math.atan2(math.cos(eps) * sin_lam, cos_lam)
    decl = math.asin(math.sin(eps) * sin_lam)
    # greenwich mean sidereal time, deg
    gmst = 18.697374558 + 24.06570982441908 * n
    gmst = (gmst % 24) * 15.0  # to deg
    # local sidereal time
    lst = (gmst + lon_deg) * TO_RAD
    # hour angle
    H = lst - ra
    phi = lat_deg * TO_RAD
    sin_alt = math.sin(phi) * math.sin(decl) + math.cos(phi) * math.cos(decl) * math.cos(H)
    sin_alt = max(-1.0, min(1.0, sin_alt))
    alt = math.asin(sin_alt)
    cos_alt = math.cos(alt)
    # azimuth from north, clockwise
    if cos_alt < 1e-9:
        az = 0.0
    else:
        sin_az = -math.cos(decl) * math.sin(H) / cos_alt
        cos_az = (math.sin(decl) - math.sin(phi) * sin_alt) / (math.cos(phi) * cos_alt)
        az = math.atan2(sin_az, cos_az)
    az_deg = (az * TO_DEG) % 360.0
    alt_deg = alt * TO_DEG
    return az_deg, alt_deg


def _angle_diff(a: float, b: float) -> float:
    """Smallest absolute angular difference in degrees (0..180)."""
    d = (a - b) % 360.0
    if d > 180.0:
        d = 360.0 - d
    return d


def sun_hours_facing(lat_deg: float, lon_deg: float, d: date,
                     window_azimuth_deg: float,
                     half_acceptance_deg: float = 90.0,
                     step_minutes: int = 5,
                     timezone_offset_h: float = 4.0,
                     min_altitude_deg: float = 0.0) -> dict:
    """Compute direct-sunlight hours for a window facing `window_azimuth_deg`
    (measured clockwise from north) on date `d` at (lat_deg, lon_deg).

    Returns dict with `hours`, `sunrise_local`, `sunset_local`, plus an
    `episodes` list (start, end, duration_h) describing each contiguous
    interval the window is lit. Two episodes can happen e.g. for a
    west-facing window if the morning sun grazes a corner.
    """
    # iterate every step_minutes from local midnight to next midnight
    step = step_minutes
    minutes_in_day = 24 * 60
    tz = timezone(timedelta(hours=timezone_offset_h))
    base = datetime(d.year, d.month, d.day, 0, 0, tzinfo=tz)

    total_lit_minutes = 0
    episodes: list = []
    cur_start: datetime | None = None
    sunrise_local = None
    sunset_local = None
    prev_alt = -90.0

    m = 0
    while m <= minutes_in_day:
        local_now = base + timedelta(minutes=m)
        az, alt = sun_position(lat_deg, lon_deg, local_now)
        # crossing horizon
        if prev_alt <= 0 < alt:
            sunrise_local = local_now
        if prev_alt > 0 >= alt:
            sunset_local = local_now
        prev_alt = alt
        lit = (alt > min_altitude_deg) and (
            _angle_diff(az, window_azimuth_deg) <= half_acceptance_deg
        )
        if lit:
            total_lit_minutes += step
            if cur_start is None:
                cur_start = local_now
        else:
            if cur_start is not None:
                episodes.append({
                    "start": cur_start.isoformat(),
                    "end":   local_now.isoformat(),
                    "duration_h": round((local_now - cur_start).total_seconds() / 3600.0, 2),
                })
                cur_start = None
        m += step
    if cur_start is not None:
        episodes.append({
            "start": cur_start.isoformat(),
            "end":   (base + timedelta(minutes=minutes_in_day)).isoformat(),
            "duration_h": round(((base + timedelta(minutes=minutes_in_day)) - cur_start).total_seconds() / 3600.0, 2),
        })
    return {
        "hours": round(total_lit_minutes / 60.0, 2),
        "sunrise_local": sunrise_local.isoformat() if sunrise_local else None,
        "sunset_local":  sunset_local.isoformat() if sunset_local else None,
        "episodes": episodes,
        "lat": lat_deg, "lon": lon_deg,
        "date": d.isoformat(),
        "window_azimuth_deg": window_azimuth_deg,
        "half_acceptance_deg": half_acceptance_deg,
        "step_minutes": step,
        "timezone_offset_h": timezone_offset_h,
    }


# ---------- CLI for manual testing ----------

if __name__ == "__main__":
    import argparse
    import json
    p = argparse.ArgumentParser()
    p.add_argument("--lat", type=float, default=41.7151)   # Tbilisi
    p.add_argument("--lon", type=float, default=44.8271)
    p.add_argument("--date", default="2026-03-22")
    p.add_argument("--azimuth", type=float, default=180.0, help="window facing direction (0=N, 90=E, 180=S, 270=W)")
    p.add_argument("--half-acceptance", type=float, default=90.0)
    p.add_argument("--step", type=int, default=5)
    p.add_argument("--tz", type=float, default=4.0)
    args = p.parse_args()
    y, m, d = (int(x) for x in args.date.split("-"))
    out = sun_hours_facing(args.lat, args.lon, date(y, m, d),
                           args.azimuth, args.half_acceptance,
                           args.step, args.tz)
    print(json.dumps(out, indent=2, ensure_ascii=False))
