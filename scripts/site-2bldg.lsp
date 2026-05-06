; ===============================================================
; site-2bldg.lsp  (ASCII-only; Georgian labels added by Node post-pass)
; Two residential buildings 12 x 20 m on 30 x 60 m plot.
;   Block A: 8 stories  (24 m tall)
;   Block B: 10 stories (30 m tall)
;   Tbilisi zone SZ-5 (Ordinance 14-39).
;   K1 = 0.267  (max 0.50)
;   K2 = 2.40   (max 3.50)
;   K3 = 0.38   (min 0.20)
; All coords in millimeters. Origin = SW corner of plot.
; ===============================================================

(vl-load-com)
(setvar "CMDECHO"     0)
(setvar "OSMODE"      0)
(setvar "ATTREQ"      0)
(setvar "ATTDIA"      0)
(setvar "FILEDIA"     0)
(setvar "EXPERT"      5)
(setvar "INSUNITS"    4)
(setvar "MEASUREMENT" 1)
(setvar "LUNITS"      2)
(setvar "AUNITS"      0)
(setvar "PDMODE"     35)
(setvar "PDSIZE"    200)
(command "_.UNDO" "_BE")

;; --- Georgian text style (Sylfaen) -----------------------------
(if (not (tblsearch "STYLE" "GEO"))
  (command "_.-STYLE" "GEO" "Sylfaen.ttf" "0" "1" "0" "N" "N" "N")
)

;; --- Linetypes (only load if missing; prevents Reload? prompt) -
(defun ensureLT (n / )
  (if (not (tblsearch "LTYPE" n))
    (command "_.-LINETYPE" "_L" n "acad.lin" "")
  )
)
(ensureLT "DASHED")
(ensureLT "CENTER")
(ensureLT "HIDDEN")
(ensureLT "DASHED2")

;; --- Layer maker ----------------------------------------------
(defun mklay (n c lt / )
  (if (not (tblsearch "LAYER" n))
    (command "_.-LAYER" "_M" n "_C" c "" "_LT" lt "" "")
    (command "_.-LAYER" "_S" n "_C" c "" "_LT" lt "" "")
  )
)

(mklay "S-SITE-BOUND"  "1"   "Continuous")
(mklay "S-SETBACK"     "8"   "DASHED")
(mklay "S-WALL"        "7"   "Continuous")
(mklay "S-BLDG"        "7"   "Continuous")
(mklay "S-ROAD"        "9"   "Continuous")
(mklay "S-ROAD-LINE"   "7"   "DASHED2")
(mklay "S-PARKING"     "5"   "Continuous")
(mklay "S-PARK-NUM"    "2"   "Continuous")
(mklay "S-SIDEWALK"    "8"   "Continuous")
(mklay "S-GREEN"       "3"   "Continuous")
(mklay "S-TREE"        "92"  "Continuous")
(mklay "S-DIM"         "2"   "Continuous")
(mklay "S-TEXT"        "7"   "Continuous")
(mklay "S-TITLE"       "7"   "Continuous")
(mklay "S-TABLE"       "7"   "Continuous")

;; --- Helpers --------------------------------------------------
(defun rect (x1 y1 x2 y2 lay / )
  (command "_.-LAYER" "_S" lay "")
  (command "_.RECTANG" (list x1 y1) (list x2 y2))
)

(defun lin (x1 y1 x2 y2 lay / )
  (command "_.-LAYER" "_S" lay "")
  (command "_.LINE" (list x1 y1) (list x2 y2) "")
)

(defun cir (x y r lay / )
  (command "_.-LAYER" "_S" lay "")
  (command "_.CIRCLE" (list x y) r)
)

(defun hatchp (cx cy pat scale lay / )
  (command "_.-LAYER" "_S" lay "")
  (command "_.-HATCH" "_P" pat scale "0" (list cx cy) "")
)

(defun atext (x y txt h lay / )
  (command "_.-LAYER" "_S" lay "")
  (command "_.-TEXT" "_S" "Standard" (list x y) h "0" txt)
)

;; --- Site boundary 30 x 60 m ----------------------------------
(rect 0 0 30000 60000 "S-SITE-BOUND")
(command "_.-LAYER" "_S" "S-SITE-BOUND" "")
(command "_.PLINE" "0,0" "_W" "60" "60"
                   "30000,0" "30000,60000" "0,60000" "_C")

;; --- Setback (front 5, rear 5, sides 4 m) ---------------------
(rect 4000 5000 26000 55000 "S-SETBACK")

;; --- BUILDING A (8 storeys) -----------------------------------
(setq AX1 4000 AY1 5000 AX2 16000 AY2 25000)
(rect AX1 AY1 AX2 AY2 "S-BLDG")
(hatchp (/ (+ AX1 AX2) 2.0) (/ (+ AY1 AY2) 2.0) "ANSI31" "60" "S-BLDG")
;; entrance recess on south face
(setq EAX (/ (+ AX1 AX2) 2.0))
(rect (- EAX 1000) (- AY1 600) (+ EAX 1000) AY1 "S-BLDG")

;; --- BUILDING B (10 storeys) ----------------------------------
(setq BX1 4000 BY1 35000 BX2 16000 BY2 55000)
(rect BX1 BY1 BX2 BY2 "S-BLDG")
(hatchp (/ (+ BX1 BX2) 2.0) (/ (+ BY1 BY2) 2.0) "ANSI31" "60" "S-BLDG")
(setq EBX (/ (+ BX1 BX2) 2.0))
(rect (- EBX 1000) (- BY1 600) (+ EBX 1000) BY1 "S-BLDG")

;; --- ROAD / DRIVEWAY 6 m wide --------------------------------
;; runs N-S on x = 19000..25000
(rect 19000 0 25000 60000 "S-ROAD")
(hatchp 22000 30000 "ANSI37" "120" "S-ROAD")
(lin 22000 200 22000 59800 "S-ROAD-LINE")

;; --- SIDEWALK along south boundary 2 m wide -------------------
(rect 0 -2000 30000 0 "S-SIDEWALK")
(hatchp 15000 -1000 "DOTS" "200" "S-SIDEWALK")
;; entry walks to each building
(rect 16000 (- AY1 200) 19000 (+ AY1 1800) "S-SIDEWALK")
(rect 16000 (- BY1 200) 19000 (+ BY1 1800) "S-SIDEWALK")

;; --- PARKING BAYS ---------------------------------------------
;; West-facing bays in middle court (perpendicular, opening east)
(defun bayW (x1 y1 / )
  (rect x1 y1 (+ x1 2500) (+ y1 5000) "S-PARKING")
  (command "_.-LAYER" "_S" "S-PARKING" "")
  (command "_.LINE"
           (list (+ x1 1250) (+ y1 4500))
           (list (+ x1 750)  (+ y1 4000)) "")
  (command "_.LINE"
           (list (+ x1 1250) (+ y1 4500))
           (list (+ x1 1750) (+ y1 4000)) "")
)

;; East-side bays (5x2.5, opening west, north-south orientation)
(defun bayE (x1 y1 / )
  (rect x1 y1 (+ x1 5000) (+ y1 2500) "S-PARKING")
  (command "_.-LAYER" "_S" "S-PARKING" "")
  (command "_.LINE"
           (list (+ x1 4500) (+ y1 1250))
           (list (+ x1 4000) (+ y1 750)) "")
  (command "_.LINE"
           (list (+ x1 4500) (+ y1 1250))
           (list (+ x1 4000) (+ y1 1750)) "")
)

;; middle-court row (3 bays, west of driveway)
(bayW 16500 26500)
(bayW 16500 29000)
(bayW 16500 31500)

;; east-side row (rest)
(bayE 25000  5000)
(bayE 25000  7500)
(bayE 25000 10000)
(bayE 25000 12500)
(bayE 25000 40000)
(bayE 25000 42500)
(bayE 25000 45000)
(bayE 25000 47500)
(bayE 25000 50000)

;; parking numbers (1..12)
(defun pnum (x y n / )
  (atext x y (itoa n) 350 "S-PARK-NUM")
)
(pnum 17600 28800  1)
(pnum 17600 31300  2)
(pnum 17600 33800  3)
(pnum 27300  6000  4)
(pnum 27300  8500  5)
(pnum 27300 11000  6)
(pnum 27300 13500  7)
(pnum 27300 41000  8)
(pnum 27300 43500  9)
(pnum 27300 46000 10)
(pnum 27300 48500 11)
(pnum 27300 51000 12)

;; --- GREEN AREAS ---------------------------------------------
;; west strip
(rect 0 0 4000 60000 "S-GREEN")
(hatchp 2000 30000 "GRASS" "60" "S-GREEN")
;; rear (north of Bldg B inside plot)
(rect 4000 55000 19000 60000 "S-GREEN")
(hatchp 11500 57500 "GRASS" "60" "S-GREEN")
;; in front of buildings (south)
(rect 16000 0 19000 5000 "S-GREEN")
(hatchp 17500 2500 "GRASS" "60" "S-GREEN")
;; central courtyard
(rect 4000 25000 16500 35000 "S-GREEN")
(hatchp 9000 30000 "GRASS" "60" "S-GREEN")
;; east edge greens (gaps in east parking row)
(rect 25000 0 30000 5000 "S-GREEN")
(hatchp 27500 2500 "GRASS" "60" "S-GREEN")
(rect 25000 15000 30000 40000 "S-GREEN")
(hatchp 27500 27500 "GRASS" "60" "S-GREEN")
(rect 25000 53000 30000 56000 "S-GREEN")
(hatchp 27500 54500 "GRASS" "60" "S-GREEN")
(rect 19000 56000 30000 60000 "S-GREEN")
(hatchp 24500 58000 "GRASS" "60" "S-GREEN")

;; --- TREES ----------------------------------------------------
(defun tree (x y / )
  (command "_.-LAYER" "_S" "S-TREE" "")
  (command "_.CIRCLE" (list x y) 800)
  (command "_.CIRCLE" (list x y) 250)
)
(tree 2000  6000)  (tree 2000 14000)  (tree 2000 22000)
(tree 2000 30000)  (tree 2000 38000)  (tree 2000 46000)
(tree 2000 54000)
(tree 28500  3000) (tree 28500 17000) (tree 28500 25000)
(tree 28500 32500) (tree 28500 39000) (tree 28500 54500)
(tree  9000 30000) (tree 12500 27500) (tree  6000 33000)
(tree  6500 57500) (tree 11500 57500) (tree 17000 58000)

;; --- DIMENSION STYLE -----------------------------------------
(setvar "DIMTXT"   350)
(setvar "DIMASZ"   250)
(setvar "DIMEXE"   200)
(setvar "DIMEXO"   150)
(setvar "DIMTXSTY" "Standard")
(setvar "DIMSCALE" 1.0)
(setvar "DIMTAD"   1)
(setvar "DIMDEC"   0)
(setvar "DIMTIH"   0)
(setvar "DIMTOH"   0)

(command "_.-LAYER" "_S" "S-DIM" "")

;; west-side stack
(command "_.DIMLINEAR" (list 0    0)    (list 0  5000) (list -3500  2500))
(command "_.DIMLINEAR" (list 0 5000)    (list 0 25000) (list -3500 15000))
(command "_.DIMLINEAR" (list 0 25000)   (list 0 35000) (list -3500 30000))
(command "_.DIMLINEAR" (list 0 35000)   (list 0 55000) (list -3500 45000))
(command "_.DIMLINEAR" (list 0 55000)   (list 0 60000) (list -3500 57500))
(command "_.DIMLINEAR" (list 0    0)    (list 0 60000) (list -7000 30000))

;; south-side stack
(command "_.DIMLINEAR" (list 0     0) (list 4000  0) (list  2000  -5500))
(command "_.DIMLINEAR" (list 4000  0) (list 16000 0) (list 10000  -5500))
(command "_.DIMLINEAR" (list 16000 0) (list 19000 0) (list 17500  -5500))
(command "_.DIMLINEAR" (list 19000 0) (list 25000 0) (list 22000  -5500))
(command "_.DIMLINEAR" (list 25000 0) (list 30000 0) (list 27500  -5500))
(command "_.DIMLINEAR" (list 0     0) (list 30000 0) (list 15000  -9000))

;; building dims
(command "_.DIMLINEAR" (list AX1 AY2) (list AX2 AY2) (list 10000 26500))
(command "_.DIMLINEAR" (list AX1 AY1) (list AX1 AY2) (list 2500  15000))
(command "_.DIMLINEAR" (list BX1 BY2) (list BX2 BY2) (list 10000 56500))
(command "_.DIMLINEAR" (list BX1 BY1) (list BX1 BY2) (list 2500  45000))

;; gap between buildings
(command "_.DIMLINEAR" (list 16000 25000) (list 16000 35000) (list 17800 30000))

;; --- TITLE BLOCK FRAME (A2 sheet @ 1:200) --------------------
;; Sheet at world-mm: 1mm paper * 200 = 200mm world
;; A2 = 594 x 420 mm paper -> 118800 x 84000 world units
(setq OFX -10000 OFY -15000)
(setq SHX 118800 SHY 84000)
(setq SHX2 (+ OFX SHX))
(setq SHY2 (+ OFY SHY))
(setq IX1 (+ OFX 2000))
(setq IY1 (+ OFY 2000))
(setq IX2 (- SHX2 2000))
(setq IY2 (- SHY2 2000))
(rect OFX OFY SHX2 SHY2 "S-TITLE")
(command "_.-LAYER" "_S" "S-TITLE" "")
(command "_.PLINE" (list IX1 IY1) "_W" "80" "80"
                   (list IX2 IY1)
                   (list IX2 IY2)
                   (list IX1 IY2) "_C")

;; cartouche on right
(setq TBX1 (- IX2 30000) TBX2 IX2)
(setq TBY1 IY1 TBY2 IY2)
(rect TBX1 TBY1 TBX2 TBY2 "S-TITLE")
(setq RH (/ (- TBY2 TBY1) 6.0))
(setq r1 (+ TBY1 RH))
(setq r2 (+ TBY1 (* 2 RH)))
(setq r3 (+ TBY1 (* 3 RH)))
(setq r4 (+ TBY1 (* 4 RH)))
(setq r5 (+ TBY1 (* 5 RH)))
(lin TBX1 r1 TBX2 r1 "S-TITLE")
(lin TBX1 r2 TBX2 r2 "S-TITLE")
(lin TBX1 r3 TBX2 r3 "S-TITLE")
(lin TBX1 r4 TBX2 r4 "S-TITLE")
(lin TBX1 r5 TBX2 r5 "S-TITLE")

;; data table (will be filled with Georgian via Node)
(setq TX1 35000  TX2 75000)
(setq TY1 -10000 TY2  18000)
(rect TX1 TY1 TX2 TY2 "S-TABLE")
(setq RH2 (/ (- TY2 TY1) 9.0))
(setq tr1 (+ TY1 (* 1 RH2)))
(setq tr2 (+ TY1 (* 2 RH2)))
(setq tr3 (+ TY1 (* 3 RH2)))
(setq tr4 (+ TY1 (* 4 RH2)))
(setq tr5 (+ TY1 (* 5 RH2)))
(setq tr6 (+ TY1 (* 6 RH2)))
(setq tr7 (+ TY1 (* 7 RH2)))
(setq tr8 (+ TY1 (* 8 RH2)))
(lin TX1 tr1 TX2 tr1 "S-TABLE")
(lin TX1 tr2 TX2 tr2 "S-TABLE")
(lin TX1 tr3 TX2 tr3 "S-TABLE")
(lin TX1 tr4 TX2 tr4 "S-TABLE")
(lin TX1 tr5 TX2 tr5 "S-TABLE")
(lin TX1 tr6 TX2 tr6 "S-TABLE")
(lin TX1 tr7 TX2 tr7 "S-TABLE")
(lin TX1 tr8 TX2 tr8 "S-TABLE")
(setq TXC1 (+ TX1 22000))
(setq TXC2 (+ TX1 32000))
(lin TXC1 TY1 TXC1 TY2 "S-TABLE")
(lin TXC2 TY1 TXC2 TY2 "S-TABLE")

;; legend frame
(setq LX1 35000 LY1 22000 LX2 75000 LY2 50000)
(rect LX1 LY1 LX2 LY2 "S-TABLE")

(command "_.UNDO" "_E")
(command "_.ZOOM" "_E")
(command "_.ZOOM" "0.95X")
(princ "\n[site-2bldg] Geometry done. Now run Node script for Georgian text.")
(princ)
