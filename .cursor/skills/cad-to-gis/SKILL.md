---
name: cad-to-gis
description: Exports DXF / DWG layers (cadastre, topography, zoning) to ESRI Shapefile or OGC GeoPackage with EPSG reprojection. Use when the user asks to "send this to QGIS", "export the parcel layer to shapefile", "make a GeoPackage of the cadastre", or anything about CAD ↔ GIS interop.
---

# CAD → GIS export

## When to use

- The user needs an `xref_sakutreba.dwg` or `xref_zonireba.dwg` in QGIS
  / ArcGIS / a government GIS portal.
- We need to overlay our cadastral polygons on imagery.
- The Tbilisi muni asks for plots in a specific EPSG (32638 = UTM 38N).
- A topo or shadow raster needs CAD vector annotations.

Adapter: `scripts/python/cad_to_gis.py`. Library docs: rule
[`12-external-libraries.mdc`](../../rules/12-external-libraries.mdc), entry **L03**.

## One-time setup

```
pip install -r requirements.txt
```

Internally this pulls **ezdxf, fiona, shapely, pyproj**. We use **fiona**
instead of raw GDAL because fiona ships its own GDAL build for Windows
and avoids the prebuilt-wheel hunt. No conda required.

For DWG (not DXF) inputs you still need ODA File Converter:
download from https://www.opendesign.com/ and (optionally) set
`$env:ODA_CONVERTER` to its `.exe` path.

## Workflow

```
Task progress:
- [ ] Step 1: confirm source EPSG (Tbilisi UTM = 32638)
- [ ] Step 2: pick which CAD layers to export
- [ ] Step 3: run cad_to_gis.py
- [ ] Step 4: open the output in QGIS to verify alignment
```

### Step 1 — Source EPSG

| Drawing | Default EPSG |
|---|---|
| `xref_sakutreba.dwg` (cadastre) | 32638 (UTM 38N) |
| `xref_topo.dwg`     (topography) | 32638 |
| `xref_zonireba.dwg` (zoning)    | 32638 |
| `Drawing1.dwg` georeferenced copy | 32638 (mm) — see note |

> **Note about mm vs m.** Our office DWGs sit in mm but the polylines
> hold UTM coordinates × 1000. The adapter does **not** divide by 1000;
> if QGIS shows the result a billion miles off Tbilisi, your source DWG
> is in mm-of-UTM. Open in AutoCAD, run `(command "_.SCALE" "_All" ""
> "0,0" "0.001")` first, **save a copy**, then re-export.

### Step 2 — Pick layers

Use comma-separated wildcard patterns:

```
--layers "xref_sakutreba*,New_*nakvet*,PARCEL"
--layers "xref_zonireba*"
--layers "*"            # everything (slow)
```

### Step 3 — Run

```
python scripts/python/cad_to_gis.py \
  C:/path/to/xref_sakutreba.dwg \
  C:/out/cadastre/ \
  --layers "xref_sakutreba*,New_*nakvet*" \
  --epsg-in  32638 \
  --epsg-out 32638 \
  --format geojson
```

Outputs:

- `C:/out/cadastre/<LAYER>.geojson` — one file per CAD layer.
- Each feature carries `dxftype`, `handle`, and `layer` columns.

Format choices:

| `--format` | Result | Use when |
|---|---|---|
| `geojson` (default) | one `.geojson` per layer | universal compatibility, opens in QGIS / ArcGIS / web |
| `shp` | one `.shp/.dbf/.prj/.cpg` set per layer | strict ESRI consumers |
| `gpkg` | one `.gpkg` per layer | preferred by gov GIS portals; merge later with `ogrmerge.py` if a single file is required |

### Step 4 — Verify

Open the GeoPackage in QGIS over an OpenStreetMap base. Tbilisi
center ≈ `41.71° N, 44.79° E`. If your polygons sit somewhere in the
ocean, recheck `--epsg-in`.

## Pitfalls

- **CIRCLE entities** are approximated as 32-sided polygons (good enough
  for cadastre); use `--epsg-out 4326` if the consumer wants WGS84
  (lat/lon).
- **Closed polylines** become Polygon, **open polylines** become
  LineString. If a parcel polyline isn't closed, GDAL will refuse to
  build a polygon — close it in AutoCAD first.
- **Shapefile field names** are capped at 10 chars and Shapefile drops
  Georgian unless the encoding is set to UTF-8 (the adapter already sets
  `encoding="utf-8"`). Prefer GeoJSON or GeoPackage unless the consumer
  requires SHP.
- **GPKG single-file mode** (multi-layer GeoPackage) currently fails on
  Windows + Fiona 1.10 with `NULL pointer error`. The adapter writes one
  `.gpkg` per layer; merge later via `ogrmerge.py -f GPKG -single ...`.
- **3D polylines** flatten to 2D. If you need elevations, post-process
  with the original DXF Z values yourself.
- **Block references** are exploded by the adapter. To merge into a
  single feature, pre-explode in AutoCAD with `_BURST` or use the
  CAD_to_GIS QGIS plugin which has a "keep blocks" mode.
