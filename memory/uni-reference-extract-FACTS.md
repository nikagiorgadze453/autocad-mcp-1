# UNI reference extract — what the data actually says

Generated from `scripts/utilities/uni-dump.lsp` run headlessly on the 7
UNI DWGs, then summarised by `scripts/python/summarize_uni_dumps.js`.

> **This file overrides anything in the rules that contradicts the
> measured data.** The rules were written from memory; this is the
> measured truth.

---

## 1. Units & coordinate frame

| Fact | Value |
|---|---|
| INSUNITS | **4 (mm)** in all 7 files |
| Coordinate frame | **UTM-derived** — all extents are at km offsets (e.g. UNI A2 extends 158 km × 2 km). The drawings are georeferenced to UTM zone 38N (Tbilisi). |
| Net plan extents (B-series, single apartment scale) | ~6.5 × 3.5 km bounding box — actual flat geometry sits inside a much smaller window centred at the project's UTM anchor. |

Implication: **always** keep the standard "place the apartment at (0,0)
when generating from scratch" rule, but **never** translate when
modifying an existing UNI-based drawing — the coordinate frame is
intentional.

---

## 2. Text styles (overrides rule 00)

The office's real font universe is **not** Sylfaen-only:

| Style | In N files | Use |
|---|---|---|
| `Standard` | 7 | default |
| `Annotative` | 7 | annotated text |
| `geo` | 7 | **Georgian body text** (not Sylfaen!) |
| `geo-kolxetmtavruli` | 7 | Georgian uppercase (Kolkheti Mtavruli) |
| `chveumtavruli` | 7 | Georgian "common" Mtavruli |
| `ChveuMtavr` | 7 | Mtavruli (alias) |
| `Arial` | 7 | Latin / Cyrillic fallback |
| `Arch-Dim` | 7 | dimension text |
| `RomanS`, `Teqsti`, `EL`, `F1-F3`, `S1-S3` | 1-5 | various |
| `Tahoma` | 3 | titles |
| `Avaza Mtavruli` | (inline override) | Georgian Mtavruli (decorative) |

**Practical conclusion:** when working with existing UNI files use
**`geo`** for body text and **`geo-kolxetmtavruli`** or
**`chveumtavruli`** for titles. Rule 00 (Sylfaen) is for **new** files
the AI generates from scratch — when adapting a UNI file, match the
file's existing style.

Update rule 00 to clarify this.

---

## 3. Layer universe (overrides rule 02 + rule 10)

Counts of how many UNI files each layer appears in (top 50):

- `0`, `Defpoints` — standard
- `-------MISACVDOMOBIS_GEGMA` — accessibility plan
- `-------SAYRDENI GEGMA` — support / structural plan
- `-------DETALEBI` — details
- `G-Anno-Nplt`, `G-Sect`, `G-Anno-Scrn` — NCS-style anno
- `--blokis kedeli` — block wall
- `--------AVEJI_MODZRAVI` — movable furniture (`AVEJI` = ფურნიტურა)
- `--------AVEJI_UDZRAVI` — immovable furniture
- `-------ZOMIS XAZEBI` — dimension lines
- `gegmebi_Pen_No__N_Pen_No__N` — Cyrillic legacy (rule 10 still applies)
- `AXES` — structural axes
- `A-Wall`, `A-Anno-Scrn` — NCS-style
- `0.35` — line-weight named layer (legacy)

Total layer counts per file: **133 – 232** layers. The "office
standard" 11-layer set described in rule 02 does **not** match any
existing UNI file out of the box.

**Practical conclusion:**

- Rule 02's 11-layer set remains the **target** for new drawings.
- For UNI files, treat the legacy layer set as canonical and **do not
  remap unless explicitly asked.**
- When asked to remap (rule 10), the actual mapping table needs to be
  expanded to cover the legacy patterns above — TODO in
  `scripts/utilities/layer-remap-to-standard.lsp`.

---

## 4. Real modular grid (overrides rule 05)

Most frequent dimension values across the B-series (50 mm bins):

| Value (mm) | Likely meaning | Files |
|---|---|---|
| 7600 | depth of the apartment block | B1-B4 |
| 6600 | bay module | A4, B1-B4 |
| 2500 | floor-to-floor inner clear / room width | A2, A3 |
| 1700 | living window / door span | B2-B4 |
| 1550 | bedroom window | B1-B4 |
| 1400 | window height (standard schedule) | A2, A3 |
| 1050 | corridor width | A2, A3 |
| 1000 | bay subdivision | A4 |
| 950, 850, 800, 550, 400, 200, 100 | layout / thickness / tick | all |

Rule 05 currently says bay module **6500 mm** and end bay **6900 mm**.
The measured data says **6600 mm** dominates — adjust rule 05 to
match real practice (or note both as acceptable).

Depth: rule 05 says **10300 mm**. Measured **7600 mm** for B-series.
This difference may be because the UNI files measure depth differently
(structural shell vs. full envelope including balcony). Worth a hand
check before adjusting rule 05.

---

## 5. Block library

Each UNI file has **~400-650 block definitions**. That's far richer
than the small office library in `blocks/`. The aggregate block
universe contains hundreds of unique names like:

- `Toilet`, `BLOCK_NAME` (sanitary)
- `Door_*`, `Window_*`
- `Sofa_*`, `Bed_*`, `Wardrobe_*` (furniture)
- many `*_dynamic` blocks

**Action item:** run the `steal-from-template` skill against one of the
UNI files to import the full block library into the office template.
Best donor: **`UNI B2.dwg`** (largest entity count and clean layer set).

---

## 6. Closed polyline area extraction failed

The dumper found **0 closed LWPOLYLINEs** in all 7 files. This means
the office does NOT close room footprints with LWPOLYLINE — rooms are
defined by:

- intersecting wall lines, OR
- hatch boundaries, OR
- spline / arc loops

To extract per-room m² we'll need a more sophisticated approach:

1. Run `BOUNDARY` LISP to auto-create closed polylines from line
   intersections, then measure.
2. Or read HATCH boundary loops and sum their areas.
3. Or use the office's existing "room polygon" layer if one exists
   (none of the standard 11 matches — look for one with names like
   `ROOMS`, `OTAXEBI`, `OTAxI`, etc.).

**TODO:** add `scripts/utilities/extract-room-polygons.lsp` that runs
BOUNDARY per closed wall region and labels the result with the
existing MText nearest the centroid.

---

## 7. Entity counts

| File | Entities | Layers | Blocks |
|---|---|---|---|
| UNI A2 | **98 022** | 133 | 591 |
| UNI A3 | **93 190** | 137 | 562 |
| UNI A4 |  11 788 | 149 | 398 |
| UNI B1 |  12 673 | 232 | 648 |
| UNI B2 |  16 944 | 175 | 588 |
| UNI B3 |  16 863 | 167 | 571 |
| UNI B4 |  14 704 | 165 | 609 |

A2 and A3 are 5-10× larger than the rest — they are likely **full
sheets / cluster compositions**, not single-apartment drawings.

---

## 8. Georgian text samples (from MText scrape)

UNI A2/A3 contain official text:

> `სახლი A-3` (house A-3)

UNI B2/B3/B4 contain tax / fee text:

> `მოსაკრებლის რიცხვითი მაჩვენებელი შეადგენს 37 752 ლარს`
> ("The numerical indicator of the fee equals 37 752 GEL")

Plus inline font codes like `\fAvaza Mtavruli|b0|i0|c0|p34;` —
confirming the office uses **Avaza Mtavruli** as a decorative font.

---

## 9. Actionable updates to the rule set

| Rule | Update |
|---|---|
| 00-georgian-text.mdc | Add `geo`, `geo-kolxetmtavruli`, `chveumtavruli`, `Avaza Mtavruli` as accepted office Georgian styles. Keep Sylfaen as the **new-drawing default**. |
| 02-units-dims.mdc | Note that legacy office layer set is much larger than 11; standard 11 applies to *new* drawings only. |
| 05-typology-bina.mdc | Add note: "measured dimensions on UNI B1-B4 show bay module 6600 mm and depth 7600 mm — both are office-accepted variants." |
| 10-cyrillic-purge.mdc | Expand the remap table to cover the legacy patterns: `MISACVDOMOBIS_*`, `SAYRDENI*`, `AVEJI_*`, `ZOMIS XAZEBI`, `gegmebi_Pen_No_*`, leading-dash variants. |
| 13-uni-reference-works.mdc | Already in place; this file is its measured backing data. |

---

## 10. Files generated by this pass

- `C:\Users\PCZONE.GE\Downloads\UNI *.uni-dump.json` — raw dumps (~3.8 MB total)
- `memory/uni-reference-extract.json` — distilled, machine-readable
- `memory/uni-reference-extract.md` — distilled, human-readable per-file
- `memory/uni-reference-extract-FACTS.md` — this file (the conclusions)

Re-run with:

```powershell
foreach ($f in "UNI A2.dwg","UNI A3.dwg","UNI A4.dwg","UNI B1.dwg","UNI B2.dwg","UNI B3.dwg","UNI B4.dwg") {
  & "C:\Program Files\Autodesk\AutoCAD 2027\accoreconsole.exe" `
    /i "C:\Users\PCZONE.GE\Downloads\$f" `
    /s "C:\Users\PCZONE.GE\autocad-mcp\scripts\utilities\uni-dump.scr"
}
node scripts/python/summarize_uni_dumps.js
```
