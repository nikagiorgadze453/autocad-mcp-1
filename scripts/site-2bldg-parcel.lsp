; ===============================================================
; site-2bldg-parcel.lsp
; Two residential buildings 12 x 20 m inside the existing parcel
; (test.dwg, layer 0 polyline, area 14,470.30 m^2, 47 vertices).
;
; Drawing units in this DWG = METERS (despite INSUNITS=4).
;
; Block A: 8 storeys (h ~ 24 m), 12 x 20 = 240 m^2
; Block B: 10 storeys (h ~ 30 m), 12 x 20 = 240 m^2
; Footprint total 480 m^2  -> K1 = 0.033
; GFA total 4320 m^2       -> K2 = 0.299
; (target zone SZ-5: K1<=0.50, K2<=3.50, K3>=0.20  - all OK)
;
; Origin = parcel centroid (477796.965, 4611601.226).
; All sub-coords below are computed off CX/CY.
; ===============================================================

(vl-load-com)
(setvar "CMDECHO" 0)
(setvar "OSMODE"  0)
(setvar "ATTREQ"  0)
(setvar "ATTDIA"  0)
(setvar "FILEDIA" 0)
(setvar "EXPERT"  5)
(command "_.UNDO" "_BE")

;; Sylfaen text style
(if (not (tblsearch "STYLE" "GEO"))
  (command "_.-STYLE" "GEO" "Sylfaen.ttf" "0" "1" "0" "N" "N" "N")
)

;; Linetypes (idempotent)
(defun ensureLT (n / )
  (if (not (tblsearch "LTYPE" n))
    (command "_.-LINETYPE" "_L" n "acad.lin" "")
  )
)
(ensureLT "DASHED")
(ensureLT "DASHED2")
(ensureLT "CENTER")

;; Layer maker
(defun mklay (n c lt / )
  (if (not (tblsearch "LAYER" n))
    (command "_.-LAYER" "_M" n "_C" c "" "_LT" lt "" "")
    (command "_.-LAYER" "_S" n "_C" c "" "_LT" lt "" "")
  )
)
(mklay "S-BLDG"      "7"  "Continuous")
(mklay "S-ROAD"      "9"  "Continuous")
(mklay "S-ROAD-LINE" "7"  "DASHED2")
(mklay "S-PARKING"   "5"  "Continuous")
(mklay "S-PARK-NUM"  "2"  "Continuous")
(mklay "S-SIDEWALK"  "8"  "Continuous")
(mklay "S-GREEN"     "3"  "Continuous")
(mklay "S-TREE"      "92" "Continuous")
(mklay "S-DIM"       "2"  "Continuous")
(mklay "S-TEXT"      "7"  "Continuous")
(mklay "S-TABLE"     "7"  "Continuous")

;; --- Helpers ---
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
(defun atext (x y txt h lay / )
  (command "_.-LAYER" "_S" lay "")
  (command "_.-TEXT" "_S" "Standard" (list x y) h "0" txt)
)
(defun hatchp (cx cy pat scale lay / )
  (command "_.-LAYER" "_S" lay "")
  (command "_.-HATCH" "_P" pat scale "0" (list cx cy) "")
)

;; --- Origin (parcel centroid in meters) ---
(setq CX 477796.965 CY 4611601.226)

;; ===== Building A (8 storeys) =====
;; 12 x 20 m, center along x at CX, south of CY
;; corners: (CX-6, CY-25) - (CX+6, CY-5)
(setq AX1 (- CX  6.0))
(setq AY1 (- CY 25.0))
(setq AX2 (+ CX  6.0))
(setq AY2 (- CY  5.0))
(rect AX1 AY1 AX2 AY2 "S-BLDG")
(hatchp (/ (+ AX1 AX2) 2.0) (/ (+ AY1 AY2) 2.0) "ANSI31" "0.06" "S-BLDG")
;; entrance recess on south face (1 m wide)
(setq EAX (/ (+ AX1 AX2) 2.0))
(rect (- EAX 0.5) (- AY1 0.6) (+ EAX 0.5) AY1 "S-BLDG")

;; ===== Building B (10 storeys) =====
;; corners: (CX-6, CY+5) - (CX+6, CY+25)
(setq BX1 (- CX  6.0))
(setq BY1 (+ CY  5.0))
(setq BX2 (+ CX  6.0))
(setq BY2 (+ CY 25.0))
(rect BX1 BY1 BX2 BY2 "S-BLDG")
(hatchp (/ (+ BX1 BX2) 2.0) (/ (+ BY1 BY2) 2.0) "ANSI31" "0.06" "S-BLDG")
(setq EBX (/ (+ BX1 BX2) 2.0))
(rect (- EBX 0.5) (- BY1 0.6) (+ EBX 0.5) BY1 "S-BLDG")

;; ===== Driveway (6 m wide) =====
;; runs N-S east of buildings: x [CX+10, CX+16], y [CY-30, CY+30]
(setq RX1 (+ CX 10.0))
(setq RX2 (+ CX 16.0))
(setq RY1 (- CY 30.0))
(setq RY2 (+ CY 30.0))
(rect RX1 RY1 RX2 RY2 "S-ROAD")
(hatchp (/ (+ RX1 RX2) 2.0) CY "ANSI37" "0.12" "S-ROAD")
;; centerline
(lin (/ (+ RX1 RX2) 2.0) (+ RY1 0.2) (/ (+ RX1 RX2) 2.0) (- RY2 0.2) "S-ROAD-LINE")

;; ===== Sidewalks =====
;; entry walk from driveway to each building south face
(rect AX2 (- AY1 0.2) RX1 (+ AY1 1.8) "S-SIDEWALK")
(rect BX2 (- BY1 0.2) RX1 (+ BY1 1.8) "S-SIDEWALK")

;; ===== Parking bays =====
;; West-row bays in middle court (perpendicular, 2.5 wide x 5 deep)
(defun bayW (x1 y1 / )
  (rect x1 y1 (+ x1 2.5) (+ y1 5.0) "S-PARKING")
  (command "_.-LAYER" "_S" "S-PARKING" "")
  (command "_.LINE" (list (+ x1 1.25) (+ y1 4.5))
                    (list (+ x1 0.75) (+ y1 4.0)) "")
  (command "_.LINE" (list (+ x1 1.25) (+ y1 4.5))
                    (list (+ x1 1.75) (+ y1 4.0)) "")
)
;; East-row bays (5 deep x 2.5 wide, opening west)
(defun bayE (x1 y1 / )
  (rect x1 y1 (+ x1 5.0) (+ y1 2.5) "S-PARKING")
  (command "_.-LAYER" "_S" "S-PARKING" "")
  (command "_.LINE" (list (+ x1 4.5) (+ y1 1.25))
                    (list (+ x1 4.0) (+ y1 0.75)) "")
  (command "_.LINE" (list (+ x1 4.5) (+ y1 1.25))
                    (list (+ x1 4.0) (+ y1 1.75)) "")
)

;; middle-court row (3 bays west of driveway, in gap between buildings)
;; bays at x (CX+6.5..CX+9), y CY-3.5, CY-1, CY+1.5
(bayW (+ CX 6.5) (- CY 3.5))
(bayW (+ CX 6.5) (- CY 1.0))
(bayW (+ CX 6.5) (+ CY 1.5))

;; east-side row (rest 9 bays along driveway east edge)
(bayE RX2 (- CY 30.0))
(bayE RX2 (- CY 27.5))
(bayE RX2 (- CY 25.0))
(bayE RX2 (- CY 22.5))
(bayE RX2 (- CY 12.5))
(bayE RX2 (- CY 10.0))
(bayE RX2 (- CY  7.5))
(bayE RX2 (+ CY 17.5))
(bayE RX2 (+ CY 20.0))

;; parking numbers (1..12)
(defun pnum (x y n / )
  (atext x y (itoa n) 0.6 "S-PARK-NUM")
)
(pnum (+ CX 7.6) (- CY 1.4) 1)
(pnum (+ CX 7.6) (+ CY 1.1) 2)
(pnum (+ CX 7.6) (+ CY 3.6) 3)
(pnum (+ RX2 2.3) (- CY 28.7) 4)
(pnum (+ RX2 2.3) (- CY 26.2) 5)
(pnum (+ RX2 2.3) (- CY 23.7) 6)
(pnum (+ RX2 2.3) (- CY 21.2) 7)
(pnum (+ RX2 2.3) (- CY 11.2) 8)
(pnum (+ RX2 2.3) (- CY  8.7) 9)
(pnum (+ RX2 2.3) (- CY  6.2) 10)
(pnum (+ RX2 2.3) (+ CY 18.8) 11)
(pnum (+ RX2 2.3) (+ CY 21.3) 12)

;; ===== Trees (decorative, around buildings) =====
(defun tree (x y / )
  (command "_.-LAYER" "_S" "S-TREE" "")
  (command "_.CIRCLE" (list x y) 0.8)
  (command "_.CIRCLE" (list x y) 0.25)
)
(tree (- CX 12.0) (- CY 25.0))
(tree (- CX 12.0) (- CY 15.0))
(tree (- CX 12.0) (-  CY  5.0))
(tree (- CX 12.0) (+ CY  5.0))
(tree (- CX 12.0) (+ CY 15.0))
(tree (- CX 12.0) (+ CY 25.0))
(tree (+ CX  3.0) CY)
(tree (- CX  3.0) CY)

;; ===== Dimensions =====
(setvar "DIMTXT"   1.0)
(setvar "DIMASZ"   0.7)
(setvar "DIMEXE"   0.5)
(setvar "DIMEXO"   0.4)
(setvar "DIMTXSTY" "Standard")
(setvar "DIMSCALE" 1.0)
(setvar "DIMTAD"   1)
(setvar "DIMDEC"   2)
(setvar "DIMTIH"   0)
(setvar "DIMTOH"   0)

(command "_.-LAYER" "_S" "S-DIM" "")
;; Building A dims (south face length, west face height)
(command "_.DIMLINEAR" (list AX1 AY1) (list AX2 AY1) (list (- CX 6.0) (- AY1 4.0)))
(command "_.DIMLINEAR" (list AX1 AY1) (list AX1 AY2) (list (- AX1 4.0) (- CY 15.0)))
;; Building B dims
(command "_.DIMLINEAR" (list BX1 BY2) (list BX2 BY2) (list (- CX 6.0) (+ BY2 4.0)))
(command "_.DIMLINEAR" (list BX1 BY1) (list BX1 BY2) (list (- BX1 4.0) (+ CY 15.0)))
;; Gap between buildings
(command "_.DIMLINEAR" (list AX2 AY2) (list AX2 BY1) (list (+ AX2 1.5) CY))
;; Driveway width
(command "_.DIMLINEAR" (list RX1 (- CY 30.0)) (list RX2 (- CY 30.0)) (list (+ CX 13.0) (- CY 33.5)))

;; ===== Data table beside parcel (40 m east of east bbox edge) =====
(setq TX1 (+ CX 60.0))
(setq TX2 (+ TX1 50.0))
(setq TY1 (- CY 35.0))
(setq TY2 (+ CY 35.0))
(rect TX1 TY1 TX2 TY2 "S-TABLE")
(setq nrows 9)
(setq RH (/ (- TY2 TY1) nrows))
(setq i 1)
(while (< i nrows)
  (lin TX1 (+ TY1 (* i RH)) TX2 (+ TY1 (* i RH)) "S-TABLE")
  (setq i (1+ i))
)
;; vertical splits at +25, +35
(lin (+ TX1 25.0) TY1 (+ TX1 25.0) TY2 "S-TABLE")
(lin (+ TX1 38.0) TY1 (+ TX1 38.0) TY2 "S-TABLE")

(command "_.UNDO" "_E")

(princ "\n[site-2bldg-parcel] geometry done.")
(princ (strcat "\n  CX=" (rtos CX 2 3) " CY=" (rtos CY 2 3)))
(princ "\n  Block A: 8 st (24 m)  Block B: 10 st (30 m)")
(princ "\n  K1=0.033  K2=0.299  K3=~0.93  (within SZ-5 limits)")
(princ)
