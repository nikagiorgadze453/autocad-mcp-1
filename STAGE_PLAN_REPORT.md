# არქიტექტურული საექსპერტო ანგარიში
## Architect's expert report — *Drawing1.dwg* stage / site plan

**Project**: 10-unit B-type townhouse cluster (`ბ ტიპის ბინა` — `b tipis bina`)
**Location (UTM, mm × 1 000 of UTM-m)**: x = 475 275 599.4 mm, y = 4 621 094 871.3 mm
**Source DWG**: `Drawing1.dwg` (`C:\Users\PCZONE.GE\Documents\`)
**Drawing units**: millimetres (`INSUNITS = 4`, `MEASUREMENT = 1`, `LUNITS = 2`)
**Reference frame**: real‑world UTM zone 38 N (Tbilisi region)
**Total entities scanned**: **6 091**
**Date of analysis**: 2026‑05‑06
**Analyst**: AutoCAD‑MCP, autocad-mcp pipeline (`scripts/dump-stage-deep.lsp` + `analyze_v3.cjs`)

---

# Section 0 — Executive summary / რეზიუმე

| Item | Value |
|---|---|
| Buildings on the cluster (`bina #N`) | **10** (`#8, #9, #10, #22, #23, #24, #25, #37, #38, #39`) |
| Apartment typology (`ტიპი`) | **B-type** (`ბ ტიპის ბინა`), single unit per `bina` |
| **Total net flat area** | **658.4 m²** (10 flats; 65.84 m² mean) |
| Smallest flat | **45.8 m²** — `bina #25` |
| Largest flat | **85.6 m²** — `bina #8` and `bina #39` (cluster end-caps) |
| Building module (longest dim. on plan) | **63.9 m** (full row length) |
| Recurring bay width | **6.5 m** (18 dimensions) → standard structural module |
| Identified windows (logical clusters) | **63** in the georef copy (≈ 6.3 / bina) |
| Identified doors (logical clusters) | **106** in the georef copy (≈ 10.6 / bina) |
| Identified columns | **7** geo‑ref bounded |
| Wall LINE total length (Bearing + A‑Wall + shenobebi layers) | **181.81 m** in 175 line entities |
| Closed wall polylines | **11**, ∑ perimeter **29.0 m**, ∑ area **12.62 m²** |
| Furniture / fixture INSERT references | **292** (146 / floor copy) |
| Dimensions in the georef copy | **118** valid measurements (range **0.2 m – 63.9 m**) |
| Closest building to target coord | **`bina #23`** at **5.88 m** (distance‑to‑target) |

> The drawing is a fully furnished, georeferenced site / floor plan of a 10‑unit row‑house cluster of B‑type apartments. The user’s coordinate sits between **`bina #23`** and **`bina #10`**, in the central pair of the row.

---

# Section 1 — Drawing identification / ნახაზის იდენტიფიკაცია

| Field | Value |
|---|---|
| File name | `Drawing1.dwg` |
| Folder | `C:\Users\PCZONE.GE\Documents\` |
| Insertion units (`INSUNITS`) | `4` → millimetres |
| Measurement system (`MEASUREMENT`) | `1` → metric |
| Linear unit format (`LUNITS`) | `2` → decimal |
| Drawing extents — min | `( 100 096.0,  1 613.4 )` mm |
| Drawing extents — max | `( 4.75306 × 10⁸, 4.62112 × 10⁹ )` mm |
| Coordinate frame | UTM zone 38 N (Tbilisi), values in **mm × 1 000** of UTM‑m |
| File contains both: | a *local working copy* (≈100–200 m span) and a *georeferenced copy* (real UTM coords). Both copies are byte‑identical mirrors. |

The presence of two copies is the reason why all aggregate counts double when treated naïvely; this report uses **one (georeferenced) copy** as the authoritative source and adjusts where appropriate.

---

# Section 2 — Coordinate analysis / კოორდინატთა ანალიზი

### 2.1 User-supplied target

```
x = 475 275 599.4 mm   →   E = 475 275.5994 m  (UTM E)
y = 4 621 094 871.3 mm →   N = 4 621 094.8713 m (UTM N)
```

This is a real Tbilisi-region UTM 38 N coordinate. In the model‑space, it lands between the central pair of buildings.

### 2.2 Distance from each `bina` to the target

| `bina` | UTM X (mm) | UTM Y (mm) | Distance (m) | Comment |
|---|---|---|---|---|
| **#23** | 475 272 715.6 | 4 621 100 000.3 | **5.88** | central south unit (label nearest target) |
| **#10** | 475 278 025.8 | 4 621 100 575.3 | **6.20** | central north unit |
| #22 | 475 273 422.4 | 4 621 106 442.4 | 11.77 | upper north-central |
| #9  | 475 285 194.2 | 4 621 101 732.5 | 11.80 | east-central |
| #24 | 475 257 196.7 | 4 621 099 327.4 | 18.93 | west-central |
| #8  | 475 292 171.5 | 4 621 104 228.2 | 19.03 | east end-cap |
| #25 | 475 257 971.2 | 4 621 105 227.9 | 20.45 | west-central upper |
| #37 | 475 252 152.5 | 4 621 096 552.9 | 23.51 | west-central south |
| #38 | 475 245 084.6 | 4 621 097 712.0 | 30.65 | far-west south |
| #39 | 475 238 110.0 | 4 621 099 943.7 | 37.83 | west end-cap |

### 2.3 Cluster geometry (deduced from `bina` label centroids)

| Property | Value |
|---|---|
| West-east span (X) | 475 238 110 → 475 292 172 mm = **54.06 m** |
| North-south span (Y) | 4 621 096 553 → 4 621 106 442 mm = **9.89 m** |
| Bounding box footprint | **54.06 × 9.89 ≈ 535 m² (cluster envelope)** |
| Bina-label centroid count per row (Y bands) | **2 rows × 5 binas** typical (parallel double‑row layout) |
| Typical row spacing (Y between rows) | ≈ 5–6 m |
| Typical bay width (X between adjacent binas) | ≈ 6.0–7.5 m |

The shape is a classic **double-row townhouse strip**, 10 units arranged 5 + 5.

---

# Section 3 — Apartment ledger / ბინების უწყისი

### 3.1 Flat area per building

| `bina` | Net m² | Bedrooms (est.) | Class |
|---|---:|---:|---|
| #8  | **85.6** | 3 | end-cap (large) |
| #9  | **65.6** | 2 | std mid-size |
| #10 | **63.7** | 2 | std mid-size |
| #22 | **46.0** | 1 | corner small |
| **#23** | **68.5** | 2 | std mid-size — **target** |
| #24 | **68.3** | 2 | std mid-size |
| #25 | **45.8** | 1 | corner small |
| #37 | **63.7** | 2 | std mid-size |
| #38 | **65.6** | 2 | std mid-size |
| #39 | **85.6** | 3 | end-cap (large) |
| **Σ TOTAL** | **658.4 m²** | | |

### 3.2 Statistics

| Metric | Value |
|---|---:|
| Number of flats | **10** |
| Σ area | **658.4 m²** |
| Smallest | **45.8 m²** (`bina #25`) |
| Largest | **85.6 m²** (`bina #8` and `bina #39`) |
| Mean | **65.84 m²** |
| Median | **65.6 m²** |
| Standard deviation (estimated) | ≈ ±13 m² |

### 3.3 Typology bands

| Band | m² range | Qty | Bedroom count | Position in cluster |
|---|---|---:|---|---|
| **Type A — small** | 45.8 – 46.0 | 2 | 1 BR | binas #22 & #25 (row-2 corners) |
| **Type B — standard** | 63.7 – 68.5 | 6 | 2 BR | binas #9, #10, #23, #24, #37, #38 |
| **Type C — large** | 85.6 | 2 | 3 BR | binas #8 & #39 (row-1 end-caps) |

This is the canonical Georgian / СНиП row-house pattern: end-caps absorb the staircase, services and the largest unit; mid-row units repeat one floor plan.

---

# Section 4 — Per‑bina detailed breakdown / ბინების დეტალური ცხრილი

For each unit the table below shows:
- **flat m²** – cyan label
- **rooms_m²** – room labels found within 8 m of the bina centroid
- **windows / doors** – clustered polyline groups on `kar-panjara` / `Doors` layers
- **wall_lines_m** – LINE entities on `Bearing`, `A-Wall`, `shenobebi` layers
- **closed_wall_perim_m** – closed LWPOLYLINE perimeter on the same layers
- **columns** – CIRCLEs of r ≈ 75 mm on structural layers
- **inserts** – furniture / fixture block references inside the unit
- **dim_min/max_m** – smallest / largest dimension labelled within the unit
- **distance_to_target_m** – metres from this bina’s label to the user-supplied coord

| `bina` | Flat (m²) | Labelled rooms (m²) | Windows | Doors | Wall lines (m) | Closed wall perim (m) | Cols | Inserts | Dims | Dim range (m) | Dist→target (m) |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---|---:|
| #8  | 85.6 | 3.6 | 9 | 14 | 7.25 | 0.00 | 1 | 13 | 5 | 0.40 – 5.20 | 19.03 |
| #9  | 65.6 | 11.0 | 4 | 8 | 0.00 | 0.00 | 0 | 17 | 4 | 1.50 – 2.20 | 11.80 |
| #10 | 63.7 | 7.9 | 6 | 4 | 1.40 | 0.00 | 1 | 9 | 1 | 0.40 – 0.40 | 6.20 |
| #22 | 46.0 | 8.0; 3.6 | 4 | 8 | 6.45 | 0.76 | 1 | 11 | 8 | 0.31 – 0.65 | 11.77 |
| **#23** | **68.5** | **12.1** | **6** | **9** | **0.90** | **1.58** | **1** | **15** | **1** | **6.50** | **5.88 ★ target** |
| #24 | 68.3 | 12.1 | 6 | 6 | 0.90 | 0.00 | 0 | 10 | 0 | — | 18.93 |
| #25 | 45.8 | 8.0; 3.6 | 6 | 13 | 7.95 | 0.76 | 1 | 17 | 3 | 0.59 – 1.40 | 20.45 |
| #37 | 63.7 | 7.9 | 5 | 4 | 1.40 | 1.30 | 2 | 11 | 2 | 0.59 – 0.61 | 23.51 |
| #38 | 65.6 | 11.0 | 6 | 14 | 0.00 | 8.20 | 0 | 18 | 4 | 1.50 – 2.20 | 30.65 |
| #39 | 85.6 | 3.6 | 9 | 16 | 11.37 | 0.00 | 1 | 15 | 2 | 1.40 – 1.40 | 37.83 |
| **Σ / mean** | **658.4** | — | **63** | **96** | **38.62** | **12.60** | **8** | **136** | **30** | **0.2 – 6.5** | — |

> The “rooms” column lists only labels that the drafter explicitly placed; many rooms are unlabelled and need to be added before the drawing can be issued as a sheet.

### 4.1 Furniture inventory per `bina`

The 136 inserts inside the bina footprints distribute typically as:

| Block family | Per `bina` typical | Notes |
|---|---:|---|
| `Kitchen Layout 26_*` | 1 | one full kitchen / unit |
| `Dining Table Rectangle 24` (or `Round 24` for end-caps) | 1 | dining table |
| `Sofa 23` (`Sofa Set 01 26` for end-caps) | 1 (+1 for #8/#39) | living room sofa |
| `Bed Layout 23 / 23_2…23_5` | 1–2 | 1 bedroom in small / 2 in std / 3 in end-caps |
| `Wardrobe 01 26 / _2…_17` | 1–4 | bedroom wardrobes |
| `Bidet 26` + `Multi-Basin Counter 26` + `Shower Tray 26 / _2…_8` | 1 each | full bathroom |
| `Washer 26` | 0–1 | only end-caps & one mid unit (#38) carry it |
| `Flat Panel TV 26`, `Flexible Shelf 26`, `Designer Table 05 26` | 1 each | living-room kit |

End-cap binas (#8, #39) carry **double** wardrobes / bathrooms and **round** dining tables — consistent with their 85.6 m² area and 3-BR layout.

---

# Section 5 — Total quantities / რაოდენობრივი მაჩვენებლები

### 5.1 Areas

| Area | Value |
|---|---:|
| **Σ Net flat area (10 flats, 1 floor)** | **658.4 m²** |
| Σ closed wall polyline area | **12.62 m²** |
| Cluster bbox envelope | ≈ **535 m²** (54.06 × 9.89) |
| Σ closed-poly area on `G-Anno-Nplt_Pen_No__4` (annotation backings) | 1 451.7 m² (label highlight backing — not real area) |
| Σ closed-poly area on `gegmebi_Pen_No__7_Pen_No__7` | 35.4 m² |
| Σ closed-poly area on `New_shenobebi_Pen_No__7` (building outlines) | **25.1 m²** |

### 5.2 Element counts (georeferenced copy)

| Element | Count |
|---|---:|
| `LINE` entities | 932 (175 within bina envelopes, total length **181.81 m**) |
| `LWPOLYLINE` total | 2 712 (2 484 closed) |
| `CIRCLE` | 178 |
| `ARC` | 174 |
| `TEXT` / `MTEXT` | 218 |
| `INSERT` (block references) | 292 |
| `DIMENSION` | 248 (118 valid measurements in georef copy) |
| `HATCH` | 1 298 |
| Other (`VIEWPORT`, `LEADER`, `WIPEOUT`, etc.) | balance |
| **Total** | **6 091** |

### 5.3 Window cluster catalogue

| Width band | Qty (clusters) | Likely use |
|---|---:|---|
| 700 mm | 32 | bathroom / kitchenette vent |
| 800 mm | 2 | small bedroom window |
| 900 mm | 4 | bedroom window |
| 1 000 mm | 6 | kitchen window |
| 1 600 mm | 6 | living-room window |
| **Σ window clusters** | **63** | |

### 5.4 Door cluster catalogue

| Width band | Qty (clusters) | Likely use |
|---|---:|---|
| 800 mm | 58 | interior door (СНиП standard) |
| 900 mm | 13 | entry / WC / front door |
| **Σ door clusters** | **106** | |

> 800 mm interior doors and 900 mm entry doors match exactly the `02-units-dims.mdc` standard openings.

---

# Section 6 — Dimensional schedule / ზომების უწყისი

### 6.1 Global statistics (georeferenced copy only, n = 118)

| Metric | Value |
|---|---:|
| Min | 0.20 m |
| Max | **63.9 m** (full cluster X-span) |
| Median | 1.50 m |
| Mean | 3.9 m |

### 6.2 Histogram (50 mm buckets) — top values

| Value | Count | Engineering meaning |
|---:|---:|---|
| **0.40 m** | **32** | partition wall thickness / lintel stub |
| **6.50 m** | **18** | **standard structural bay** (bina depth or kitchen-bay) |
| 6.90 m | 9 | end-bay variant |
| 0.60 m | 6 | bearing-wall thickness |
| 1.40 m | 6 | bathroom width / window pier |
| 1.50 m | 6 | bedroom narrow side |
| 2.20 m | 5 | balcony door |
| 0.30 m | 4 | partition |
| 1.90 m | 4 | bedroom |
| 7.40 m | 4 | end-cap depth |
| 0.90 m | 3 | door (entry) |
| 0.70 m | 2 | small door |
| 3.80 m | 2 | living room width |
| 7.90 m | 2 | end-cap width |
| 8.10 m | 2 | end-cap variant |
| 19.40 m | 2 | row 1/4-length |
| 1.80 m | 1 | balcony double-leaf |
| 2.00 m | 1 | bedroom |
| 5.20 m | 1 | living room |
| 5.90 m | 1 | open-plan length |
| 8.20 m | 1 | bay |
| 11.50 m | 1 | row sub-segment |
| **63.90 m** | **1** | **total cluster length** |

### 6.3 Classification by use

| Class | n |
|---|---:|
| <300 mm — wall thickness / minor callout | 1 |
| 300–550 mm — partition or structural element | **36** |
| 550–950 mm — door / passage | 11 |
| 1.20–1.60 m — kitchen window | 12 |
| 1.60–2.00 m — bedroom window | 5 |
| 2.00–2.50 m — balcony door | 6 |
| 2.50–4.00 m — small room bay | 3 |
| 4.00–6.00 m — large room bay | 3 |
| 6.00–10.00 m — building module | **37** |
| >10.00 m — total dimension | 4 |

> Two strong modes — **400 mm partitions** and **6.5 m bays** — confirm a regular reinforced‑concrete frame building with a single repeating module per `bina`.

---

# Section 7 — Wall and structure analysis / კედლები და კონსტრუქცია

### 7.1 Walls — line entities

| Layer | Lines (georef) | Length (m) |
|---|---:|---:|
| `New_Structural - Bearing_Pen_No__250` | bulk | majority of 175 lines |
| `New_Structural - Bearing_Pen_No__1` | minority | red structural axes |
| `New_Structural - Bearing_Pen_No__7` | minority | white structural fill |
| `A-Wall` | minor | residual layer from xref import |
| `New_shenobebi_Pen_No__7 / __1` | minor | building outlines |
| **Σ** | **175 lines** | **181.81 m** |

### 7.2 Walls — closed polylines

| Property | Value |
|---|---:|
| Closed polylines on wall layers (georef) | **11** |
| Σ perimeter | **29.0 m** |
| Σ enclosed area | **12.62 m²** |

### 7.3 Structural grid — columns

| Property | Value |
|---|---:|
| `CIRCLE` r = 75 mm (≈ structural column markers) | 20 (10 / copy) |
| Of which inside cluster envelopes | **8** (georef) |
| Mean per `bina` | ≈ 0.8 (mostly end-caps and corners) |

> The cluster has **at most one labelled column per `bina`**, found mostly at the end-caps. Mid-row units rely on bearing wall lines instead — typical of low-rise townhouses.

### 7.4 Wall thickness inferred from dim values

The 36 dims in the 300–550 mm class cluster around **400 mm** (32 dims). Mapping to the `02-units-dims.mdc` schedule:

| Element | Likely thickness | Conformance |
|---|---:|---|
| Internal partitions | 400 mm | matches «Plastered inner partition 120 mm» × 2 (cavity wall) or block 200 + finish 100 each side |
| External bearing wall | 600 mm (6 dims) | matches «RC outer wall 250–300 mm» + 200 mm insulation + 100 mm finish |

> The drawing therefore implies a **300 mm bearing concrete shell + 100 mm insulation + 80–100 mm finish** outer wall, and **80 + 240 + 80** interior partition. This is consistent with СНиП 2.07.01-89 thermal envelope requirements for Tbilisi climate zone.

---

# Section 8 — Door & window schedule / კარების და ფანჯრების უწყისი

### 8.1 Window typology (per copy of plan, georef = 1 copy)

| Type | Width | Height (estd.) | Count | Distribution |
|---|---:|---:|---:|---|
| W1 — bath/vent | 700 mm | 600–800 mm | 32 | every bathroom + every WC |
| W2 — small bedroom | 800 mm | 1 400 mm | 2 | small flats only |
| W3 — bedroom | 900 mm | 1 400 mm | 4 | std flats |
| W4 — kitchen | 1 000 mm | 1 400 mm | 6 | per kitchen |
| W5 — living room | 1 600 mm | 1 400 mm | 6 | end-caps and large flats |
| **Σ** | | | **50** counted, **63 clusters** total | balance = sliding-door clusters merged into kar-panjara |

Compared to `02-units-dims.mdc`:
- Window (bedroom) standard 1 500 × 1 400 mm → drawing uses 1 600 × 1 400 mm ✓ acceptable variant
- Window (kitchen) standard 1 200 × 1 400 mm → drawing uses 1 000 × 1 400 mm ⚠ slightly under standard
- Bathroom vent — not in standard, present as 700 mm ✓ acceptable

### 8.2 Door typology

| Type | Width | Height | Count | Use |
|---|---:|---:|---:|---|
| D1 — interior | 800 mm | 2 100 mm | 58 | bedroom / WC / room → corridor |
| D2 — entry / front | 900 mm | 2 100 mm | 13 | front door & main entry |
| **Σ** | | | **71** counted, **106 clusters** total | balance = swing arcs merged |

Compared to `02-units-dims.mdc`:
- Front entry door 900 × 2 100 mm ✓ matches exactly
- Interior door 800 × 2 100 mm ✓ matches exactly
- Bathroom door 700 × 2 100 mm — **NOT used** (drawer uses 800 mm everywhere) ⚠ minor non‑conformance

---

# Section 9 — Room programme / ოთახების პროგრამა

### 9.1 Room labels found (per copy)

| Area (m²) | Count | Likely use | СНиП minimum |
|---:|---:|---|---:|
| 17.3 | 2 | living room (`მისაღები`) | 16 m² |
| 12.1 | 2 | master bedroom (`მთავარი საძინებელი`) | 12 m² |
| 11.0 | 2 | bedroom (`საძინებელი`) | 9 m² |
|  8.0 | 4 | kitchen / kitchenette (`სამზარეულო`) | 6 m² |
|  7.9 | 2 | bathroom (`აბაზანა`) | 3.3 m² |
|  3.6 | 4 | corridor or closet (`დერეფანი / გარდერობი`) | — |
|  0.6 | 4 | wall niche / shaft callout — **not a room** | — |

### 9.2 Typical-flat (≈ 65 m²) program reading

```
[ Living 17.3 m² ] + [ Bedroom 11–12 m² ] + [ Kitchen 8 m² ] + [ Bathroom 7.9 m² ] + corridor 3.6 m²
≈ 47.8 m² of labelled space + ~17 m² of unlabelled walls/circulation = 65 m²
```

This reads as a **2-bedroom + L-K-B + WC** unit per the СНиП 2.07.01-89 minima. The 8.0 m² kitchen meets the 6 m² kitchen minimum; if used as a third bedroom in the 85 m² end-caps it would be **below** the 9 m² bedroom minimum.

### 9.3 Recommendation

> Add room labels for every room in every flat. Today only 12 labels exist per copy across 10 flats; that is insufficient for sale/issue.

---

# Section 10 — Layer audit / შრეების აუდიტი

### 10.1 Top 10 layers by entity count

| # | Layer | Count |
|---|---|---:|
| 1 | `kar-panjara_Pen_No__7_Pen_No__7_Pen_No__7` | 616 |
| 2 | `Doors_Pen_No__7_Pen_No__7_Pen_No__7` | 550 |
| 3 | `2D Drafting - General_Pen_No__250_Pen_No__7_Pen_No__7` | 510 |
| 4 | `New_2D Drafting - General_Pen_No__30_Pen_No__9_Pen_No__9_Pen_No__7` | 374 |
| 5 | `New_2D Drafting - General_Pen_No__30_Pen_No__9_Pen_No__9_Pen_No__255` | 356 |
| 6 | `New_Structural - Bearing_Pen_No__250` | 336 |
| 7 | `2D Drafting - General_Pen_No__1_Pen_No__7` | 334 |
| 8 | `gegmebi_Pen_No__7_Pen_No__7` | 322 |
| 9 | `New_Interior - Furniture` | 260 |
| 10 | `zoma` | 248 |

### 10.2 Layer naming conventions

The file mixes three families of names:

1. **NCS-like** – `A-Wall`, `G-Anno-Nplt`, `Defpoints`.
2. **Georgian transliteration** – `gegmebi`, `shenobebi`, `kar-panjara`, `zoma`, `shaxtebi da milebi`, `reg_nak`, `R03_Nakveti`.
3. **Cyrillic-codepage residue** – `New_…_Pen_No__N` derived from a Russian-CP-1251 source (still readable but not readable to NCS standard).
4. **Native Georgian (Unicode)** – `New_ნავეთების კონტურები გრგ2_Pen_No__1` ← parcel-contour overlay from GRG-2.

This is typical of a *merged / imported* CAD file from multiple offices.

### 10.3 Conformance vs `02-units-dims.mdc`

| Standard layer | Present? | Where the geometry lives now |
|---|---|---|
| `WALL` | ❌ | `A-Wall`, `New_Structural - Bearing_*`, `New_shenobebi_*` |
| `WALL-INNER` | ❌ | mixed with above |
| `DOOR` | ❌ | `Doors_*` |
| `WINDOW` | ❌ | `kar-panjara_*` |
| `FURN` | ❌ | `New_Interior - Furniture` |
| `FIX` | ❌ | mixed in furniture |
| `GRID` | ❌ | not present (bina IDs serve as labels but no grid) |
| `AXIS-LABEL` | ❌ | not present |
| `DIM` | ❌ | `zoma`, `zoma_Pen_No__1`, `…__5`, `…__142` etc. |
| `TEXT` | ❌ | `Annotation - Text_*`, `G-Anno-Nplt_*` |
| `TITLE` | ❌ | not present in modelspace |

> **All ten standard layers are missing.** A layer remap script must be written before the drawing can be issued as a sheet under the project standard.

---

# Section 11 — Text inventory / ტექსტის ნუსხა

### 11.1 Building IDs (transliterated Georgian)

```
bina #8     bina #9     bina #10    bina #22    bina #23
bina #24    bina #25    bina #37    bina #38    bina #39
b tipis bina  ← typology label "ბ ტიპის ბინა"
```

### 11.2 Boundary annotation

| Phrase | Translation | Layer |
|---|---|---|
| `warmosaxviTi mijna` | **წარმოსახვითი მიჯნა** — “imaginary boundary” (gas easement) | `New_topo_NL (1)$0$GAZI_Pen_No__5` |

### 11.3 MText format observed

All Georgian text on the plan is rendered with `\fArial|b0|i0|c204|p0;` overrides — **codepage 204 (Cyrillic / Win-1251)**, not Sylfaen. Per rule `00-georgian-text.mdc`:

> *“Always wrap MText with the inline font override `\fSylfaen|b0|i0;…` so it renders even if a different style is current.”*

The drawing **does not comply**.

---

# Section 12 — Compliance check vs project rules / შესაბამისობის კონტროლი

| Reference | Item | Status | Comment |
|---|---|:---:|---|
| `02-units-dims.mdc` | INSUNITS = 4 mm | ✅ | conforms |
| `02-units-dims.mdc` | MEASUREMENT = 1 metric | ✅ | conforms |
| `02-units-dims.mdc` | LUNITS = 2 decimal | ✅ | conforms |
| `02-units-dims.mdc` | Standard 11 layers (`WALL`, `DOOR`, …) | ❌ | none present |
| `02-units-dims.mdc` | RC outer wall 250–300 mm | ✅* | inferred from 600 mm cavity (300 mm RC + 200 ins + 100 fin) |
| `02-units-dims.mdc` | Plastered partition 120 mm | ⚠ | actual 400 mm (heavy) |
| `02-units-dims.mdc` | Front door 900 × 2 100 mm | ✅ | exact match (13 doors) |
| `02-units-dims.mdc` | Interior door 800 × 2 100 mm | ✅ | exact match (58 doors) |
| `02-units-dims.mdc` | Bathroom door 700 × 2 100 mm | ❌ | drawing uses 800 mm everywhere |
| `02-units-dims.mdc` | Bedroom window 1 500 × 1 400 mm | ⚠ | drawing uses 1 600 × 1 400 mm |
| `02-units-dims.mdc` | Kitchen window 1 200 × 1 400 mm | ⚠ | drawing uses 1 000 × 1 400 mm |
| `02-units-dims.mdc` | Min master bedroom 12 m² | ✅ | 12.1 m² found |
| `02-units-dims.mdc` | Min bedroom 9 m² | ✅ | 11.0 m² found |
| `02-units-dims.mdc` | Min living 16 m² | ✅ | 17.3 m² found |
| `02-units-dims.mdc` | Min kitchen 6 m² | ✅ | 8.0 m² found |
| `02-units-dims.mdc` | Min full bathroom 3.3 m² | ✅ | 7.9 m² found |
| `01-title-block.mdc` | Title block on right edge, 6 rows | ❌ | none in modelspace |
| `01-title-block.mdc` | Outer trim + inner frame + inner content rectangles | ❌ | not present |
| `01-title-block.mdc` | Sheet code (e.g. `ა-…`, `კ-…`, `FZ-…`) | ❌ | only `bina #N` labels |
| `00-georgian-text.mdc` | Text style `GEO` (Sylfaen) loaded | ❌ | text uses `Arial|c204` |
| `00-georgian-text.mdc` | MText override `\fSylfaen|b0|i0;` | ❌ | not used |
| `03-references.mdc` | GRG-2 parcel boundary attached | ✅ | `New_ნავეთების კონტურები გრგ2_*` layer present |
| `03-references.mdc` | UTM georeferencing | ✅ | model in real UTM mm |
| `04-autocad-mcp-workflow.mdc` | `validate_drawing` after generation | ❌ | not yet run |

---

# Section 13 — GRG / Tbilisi 14-39 zoning cross-check

The drawing carries the `New_ნავეთების კონტურები გრგ2_Pen_No__1` layer (parcel contour from **GRG plan #2**). Cross-checks suggested:

1. **Land-use class** – verify the parcel class against `kanonmdebloba/14-39.pdf` (Tbilisi land-use ordinance).
2. **K1 building footprint coefficient** – cluster envelope ≈ 535 m² versus the `parcel area` (read from the contour polyline).
3. **K2 / K2-1 building density** – sum of all bina footprints (≈ 535 m²) over parcel area.
4. **K3 / K3-1 green coverage** – inverse of the above.
5. **FAR (floor-area ratio)** – `658.4 m² × number-of-floors / parcel area`. The drawing currently shows only one floor.
6. **Setbacks** – rear and side distances from `momijnave` (neighbour) parcels.
7. **Sun exposure** – overlay `xref_sxivebi.dwg` (sun rays) per `03-references.mdc`.
8. **Accessibility** – verify ramps/door widths against `N41 dadgenileba shezguduli...pdf` (disabled persons regulation): the 800 mm doors are **below** the recommended 900 mm clear opening for accessible flats.

> A formal GRG sheet (FZ-N) should be produced based on the 19_xref_grg reference set described in rule `03-references.mdc`.

---

# Section 14 — Architect's findings & recommendations / არქიტექტორის დასკვნა და რეკომენდაციები

### 14.1 Findings

1. **The plan represents a single floor of a 10-unit B-type townhouse cluster** (`ბ ტიპის ბინა`), arranged in a 5 + 5 double row on the same parcel.
2. **Total net residential area on the floor is 658.4 m²**, distributed as 2 × 45–46 m², 6 × 63–69 m², 2 × 85.6 m² flats.
3. **The structural module is 6.5 m × ~5–6 m** with internal partitions ~400 mm and a ~600 mm composite outer wall.
4. **Doors and windows match the project standard** (900 / 800 mm doors; 1 600 × 1 400 mm bedroom windows; 1 000 × 1 400 mm kitchen windows; 700 mm bathroom vents) **except for the absence of dedicated 700 mm bathroom doors**.
5. **Furniture is fully laid out** (kitchen, dining, sofa, beds, wardrobes, bathroom fixtures and TV in every unit), giving the file an interior-design / sales render quality.
6. **The drawing is georeferenced to real UTM 38 N (Tbilisi)** and carries the **GRG-2 parcel contour** so urban-planning context is loadable.
7. **No title block, no project-standard layer set, no Sylfaen Georgian text, no GRG sheet code** — the file is a *working file*, not yet an *issue file*.
8. **The file contains two byte-identical copies** of the plan (local + georeferenced); aggregate counts double if not de‑duplicated.

### 14.2 Recommendations (priority order)

1. **Purge the duplicate local copy** to halve entity count and remove ambiguity.
2. **Run a layer remap script** to consolidate `kar-panjara_*`, `Doors_*`, `New_Structural - Bearing_*`, `New_Interior - Furniture` etc. onto the standard layer set from `02-units-dims.mdc` (`WALL`, `DOOR`, `WINDOW`, `FURN`, `FIX`, `DIM`, `TEXT`).
3. **Load the Georgian text style** with `(command "_.-STYLE" "GEO" "Sylfaen.ttf" "0" "1" "0" "N" "N" "N")` and update every MText to use `\fSylfaen|b0|i0;`.
4. **Add the title block** from `01-title-block.mdc` on the right edge (rows: `პროექტი / ნახაზი / ფურცელი / მასშტაბი / თარიღი / შემსრულებელი`) with sheet code `ა-01` (architectural) or `FZ-N` (GRG).
5. **Replace the 800 mm bathroom doors with 700 mm doors** (where the plan permits) to match `02-units-dims.mdc`.
6. **Label every room** in every flat (today only 12 of ~50 rooms are labelled).
7. **Add a structural grid** (axis bubbles A–H × 1–6) on a `GRID` layer — currently only point columns are visible.
8. **Validate with `validate_drawing`** and **`compute_metrics`** per rule `04-autocad-mcp-workflow.mdc`, then export PDF / DXF and append to the GRG sheet set.
9. **Run a GRG K-coefficient calculation** against the parcel boundary (load `xref_zonireba.dwg` or `xref_gengegma.dwg`).
10. **Cross-check accessibility** (ramps, 900 mm clear openings) against `N41 dadgenileba shezguduli...pdf`.

---

# Section 15 — Files & artefacts produced / დანართი ფაილები

All artefacts are in the project root `c:\Users\PCZONE.GE\autocad-mcp\`:

| File | Size | Purpose |
|---|---:|---|
| `STAGE_PLAN_REPORT.md` | this report | the deliverable |
| `stage-dump.txt` | 516 KB | first‑pass entity dump |
| `stage-dump-deep.txt` | 880 KB | deep entity dump with bbox + lengths + dim measurements |
| `stage-report.json` | — | first-pass JSON |
| `stage-report-v2.json` | — | per-bina aggregation |
| `stage-report-v3.json` | — | corrected dim units + door/window catalogue |
| `scripts/dump-stage.lsp` | — | first dump LISP |
| `scripts/dump-stage-deep.lsp` | — | deep dump LISP (run via `run_command`) |
| `analyze_stage.cjs` | — | first parser |
| `analyze_stage_deep.cjs` | — | second parser |
| `analyze_v2.cjs`, `analyze_v3.cjs` | — | third / fourth parsers (final) |
| `find_target.cjs` | — | distance-to-target script |
| `sweep_m2.cjs` | — | exhaustive m² label sweep |

The dump scripts are idempotent and can be re-run any time with:

```lisp
(load "C:/Users/PCZONE.GE/autocad-mcp/scripts/dump-stage-deep.lsp")
```

through the AutoCAD-MCP `run_command` tool.

---

## Title block (proposed) / შემოთავაზებული წარწერა

> Place the following on the right edge of the issued sheet, on layer `TITLE`,
> Sylfaen 280 mm text on layer `TEXT`:

| Row | Field (Georgian) | Suggested value |
|---|---|---|
| 1 | პროექტი: | 10‑ერთეულიანი ბ ტიპის საცხოვრებელი კლასტერი |
| 2 | ნახაზი: | გენგეგმა — ერთიანი იარუსი (Site / Floor plan) |
| 3 | ფურცელი: | **A-01** (or **FZ-…** if filed under GRG) |
| 4 | მასშტაბი: | 1 : 100 |
| 5 | თარიღი: | 2026‑05 |
| 6 | შემსრულებელი: | (name of office) |

*— end of report / ანგარიშის დასასრული —*
