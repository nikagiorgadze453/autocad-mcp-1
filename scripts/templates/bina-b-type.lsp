;; bina-b-type.lsp
;; Parametric generator for the standard B-type apartment from rule 05.
;; All measurements in millimetres. Values come from rule 05-typology-bina.mdc.
;;
;; Usage:
;;   (load "C:/Users/PCZONE.GE/autocad-mcp/scripts/templates/bina-b-type.lsp")
;;   (c:BinaB 0 0)            ; insert at world 0,0
;;   (c:BinaB 6500 0)         ; second unit, mid bay
;;
;; Output: a complete 2-bedroom apartment plan (~ 65 m² net) including
;; outer wall, inner partitions, doors, windows, and furniture/fix blocks.

(vl-load-com)

(setq *bay-x*       6500.0)
(setq *depth*      10300.0)
(setq *wall-ext*     600.0)
(setq *wall-int*     400.0)
(setq *door-front*   900.0)
(setq *door-int*     800.0)
(setq *door-bath*    700.0)
(setq *win-bedroom* 1600.0)
(setq *win-kitchen* 1000.0)
(setq *win-bath*     700.0)

(defun bn:layer (n c)
  (if (not (tblsearch "LAYER" n))
    (command "_.-LAYER" "_M" n "_C" c "" "")))

(defun bn:setup ()
  (bn:layer "WALL"        "7")
  (bn:layer "WALL-INNER"  "8")
  (bn:layer "DOOR"        "4")
  (bn:layer "WINDOW"      "5")
  (bn:layer "FURN"        "3")
  (bn:layer "FIX"         "6")
  (bn:layer "TEXT"        "7")
  (bn:layer "DIM"         "2"))

(defun bn:rect (x1 y1 x2 y2 layer)
  (command "_.-LAYER" "_S" layer "")
  (command "_.PLINE"
           (list x1 y1) (list x2 y1) (list x2 y2) (list x1 y2) "_C"))

(defun bn:line (x1 y1 x2 y2 layer)
  (command "_.-LAYER" "_S" layer "")
  (command "_.LINE" (list x1 y1) (list x2 y2) ""))

(defun bn:text (x y h s layer)
  (command "_.-LAYER" "_S" layer "")
  (command "_.-MTEXT" (list x y) "_H" h "_S" "GEO" (list (+ x 4000) (- y 1500))
           (strcat "\\fSylfaen|b0|i0;" s) ""))

(defun c:BinaB (ox oy / x0 x1 y0 y1)
  (bn:setup)

  (setq x0 ox y0 oy)
  (setq x1 (+ ox *bay-x*))
  (setq y1 (+ oy *depth*))

  ;; outer wall
  (bn:rect x0 y0 x1 y1 "WALL")

  ;; living + kitchen on the front, bedrooms + bath on the rear
  ;; Internal partition splits at y = y0 + 4500 (kitchen depth)
  (bn:line (+ x0 *wall-ext*) (+ y0 4500.0)
           (- x1 *wall-ext*) (+ y0 4500.0) "WALL-INNER")

  ;; partition between bedrooms (vertical at mid)
  (bn:line (+ x0 (/ *bay-x* 2.0)) (+ y0 4500.0)
           (+ x0 (/ *bay-x* 2.0)) (- y1 *wall-ext*) "WALL-INNER")

  ;; bath partition (small box near entry)
  (bn:rect (+ x0 *wall-ext*) (+ y0 *wall-ext*)
           (+ x0 *wall-ext* 2200.0) (+ y0 *wall-ext* 2300.0) "WALL-INNER")

  ;; front door (entry)
  (bn:line (+ x0 (- (/ *bay-x* 2.0) (/ *door-front* 2.0))) y0
           (+ x0 (+ (/ *bay-x* 2.0) (/ *door-front* 2.0))) y0 "DOOR")

  ;; bedroom windows (rear wall)
  (bn:line (+ x0 1200.0) y1 (+ x0 1200.0 *win-bedroom*) y1 "WINDOW")
  (bn:line (- x1 1200.0 *win-bedroom*) y1 (- x1 1200.0) y1 "WINDOW")

  ;; kitchen window (left wall)
  (bn:line x0 (+ y0 1500.0) x0 (+ y0 1500.0 *win-kitchen*) "WINDOW")

  ;; bath vent
  (bn:line x0 (+ y0 3300.0) x0 (+ y0 3300.0 *win-bath*) "WINDOW")

  ;; furniture (very rough placeholders — block insertion preferred)
  (bn:rect (+ x0 *wall-ext* 200.0) (+ y0 *wall-ext* 200.0)
           (+ x0 *wall-ext* 1000.0) (+ y0 *wall-ext* 700.0) "FIX")    ; toilet
  (bn:rect (+ x0 *wall-ext* 1100.0) (+ y0 *wall-ext* 200.0)
           (+ x0 *wall-ext* 1900.0) (+ y0 *wall-ext* 1900.0) "FIX")  ; bath

  (bn:rect (- x1 *wall-ext* 600.0) (+ y0 *wall-ext* 200.0)
           (- x1 *wall-ext* 200.0) (+ y0 *wall-ext* 800.0) "FURN")    ; cooker
  (bn:rect (- x1 *wall-ext* 1300.0) (+ y0 *wall-ext* 200.0)
           (- x1 *wall-ext* 700.0) (+ y0 *wall-ext* 800.0) "FURN")    ; sink

  (bn:rect (+ x0 (/ *bay-x* 2.0) (- 0.0 800.0)) (- y1 *wall-ext* 2200.0)
           (+ x0 (/ *bay-x* 2.0) 800.0) (- y1 *wall-ext* 200.0) "FURN") ; bed mid-back

  ;; labels
  (bn:text (+ x0 1200.0) (+ y0 1500.0) 250.0 "აბაზანა" "TEXT")
  (bn:text (+ x0 3500.0) (+ y0 2500.0) 350.0 "სამზარეულო"   "TEXT")
  (bn:text (+ x0 1500.0) (+ y0 7000.0) 400.0 "მთავარი საძინებელი" "TEXT")
  (bn:text (+ x0 4200.0) (+ y0 7000.0) 350.0 "საძინებელი"   "TEXT")

  (princ "\n[bina-b-type] generated 1 unit. Net flat ~65 m².\n")
  (princ))

(princ "\n[bina-b-type] loaded — call (c:BinaB ox oy)\n")
(princ)
