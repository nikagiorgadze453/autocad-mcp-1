;; demo-cluster.lsp
;; Builds a 3-bina B-type test cluster on the active drawing:
;;   - 3 apartments side by side (3 x 6500 mm = 19 500 mm wide x 10 300 deep)
;;   - standard 11-layer set
;;   - Sylfaen text style "GEO"
;;   - linear dimensions on both axes
;;   - A1 title block (rule 01) framed at world scale
;;   - centered sheet title in Georgian
;;
;; After running, the drawing is suitable to save and then send through
;; extract_rooms + compute_insolation.

(vl-load-com)
(load "C:/Users/PCZONE.GE/autocad-mcp/scripts/utilities/load-sylfaen.lsp")
(load "C:/Users/PCZONE.GE/autocad-mcp/scripts/templates/bina-b-type.lsp")

;; ---- standard layers (rule 02) ----
(defun ensure-layer (n c)
  (if (not (tblsearch "LAYER" n))
    (command "_.-LAYER" "_M" n "_C" c "" "")))

(defun std-layers ()
  (ensure-layer "WALL"        "7")
  (ensure-layer "WALL-INNER"  "8")
  (ensure-layer "DOOR"        "4")
  (ensure-layer "WINDOW"      "5")
  (ensure-layer "FURN"        "3")
  (ensure-layer "FIX"         "6")
  (ensure-layer "GRID"        "1")
  (ensure-layer "AXIS-LABEL"  "1")
  (ensure-layer "DIM"         "2")
  (ensure-layer "TEXT"        "7")
  (ensure-layer "TITLE"       "7"))

(defun gset (s) (strcat "\\fSylfaen|b0|i0;" s))

(defun put-rect (x1 y1 x2 y2 layer)
  (command "_.-LAYER" "_S" layer "")
  (command "_.PLINE"
           (list x1 y1) (list x2 y1) (list x2 y2) (list x1 y2) "_C"))

(defun put-mtext (x y h s layer)
  (command "_.-LAYER" "_S" layer "")
  (command "_.-MTEXT" (list x y) "_H" h "_S" "GEO"
           (list (+ x 20000) (- y (* h 2.0)))
           (gset s) ""))

(defun put-text-left (x y h s layer)
  ;; small left-anchored single-line text via MTEXT with narrow width
  (command "_.-LAYER" "_S" layer "")
  (command "_.-MTEXT" (list x y) "_H" h "_S" "GEO"
           (list (+ x 8000) (- y (* h 1.8)))
           (gset s) ""))

;; ---- dimensions ----
(defun dim-linear-h (x1 y1 x2 y2 yoff)
  (command "_.-LAYER" "_S" "DIM" "")
  (command "_.DIMLINEAR" (list x1 y1) (list x2 y2) (list (+ x1 1000) yoff)))

(defun dim-linear-v (x1 y1 x2 y2 xoff)
  (command "_.-LAYER" "_S" "DIM" "")
  (command "_.DIMLINEAR" (list x1 y1) (list x2 y2) (list xoff (+ y1 1000))))

;; ---- title block (rule 01) ----
;; A1 = 841 x 594 mm.  At 1:50 the world rectangle is 42 050 x 29 700 mm.
(defun title-block (ox oy)
  (setq sw 42050.0 sh 29700.0)   ; sheet width / height in world mm
  (setq tb-w 6000.0)             ; title block strip width
  (command "_.-LAYER" "_S" "TITLE" "")
  ;; outer trim
  (put-rect ox oy (+ ox sw) (+ oy sh) "TITLE")
  ;; inner frame (margin 1200 mm)
  (put-rect (+ ox 1200) (+ oy 1200) (- (+ ox sw) 1200) (- (+ oy sh) 1200) "TITLE")
  ;; content area (margin 1500 mm)
  (put-rect (+ ox 1500) (+ oy 1500) (- (+ ox sw) 1500 tb-w) (- (+ oy sh) 1500) "TITLE")
  ;; title block strip on right
  (setq tb-x1 (- (+ ox sw) 1500 tb-w))
  (setq tb-y1 (+ oy 1500))
  (setq tb-x2 (- (+ ox sw) 1500))
  (setq tb-y2 (- (+ oy sh) 1500))
  (put-rect tb-x1 tb-y1 tb-x2 tb-y2 "TITLE")
  ;; 6 horizontal rows
  (setq row-h (/ (- tb-y2 tb-y1) 6.0))
  (setq i 1)
  (while (< i 6)
    (command "_.-LAYER" "_S" "TITLE" "")
    (command "_.LINE"
             (list tb-x1 (+ tb-y1 (* i row-h)))
             (list tb-x2 (+ tb-y1 (* i row-h))) "")
    (setq i (1+ i)))
  ;; fill rows with content (bottom = row 0, top = row 5)
  ;; rule 01 order top->bottom: project / drawing / sheet code / scale / date / drawn by
  (setq labels
    (list
      ;; (row_from_top  georgian_label  value)
      (list 0 "პროექტი:"      "B ტიპის კლასტერი - სატესტო")
      (list 1 "ნახაზი:"       "ბინების გეგმა")
      (list 2 "ფურცელი:"     "ა-01")
      (list 3 "მასშტაბი:"     "1:50")
      (list 4 "თარიღი:"       "2026-05")
      (list 5 "შემსრულებელი:" "autocad-mcp")))
  (foreach r labels
    (setq row (car r) lab (cadr r) val (caddr r))
    (setq cy (- tb-y2 (* (+ row 0.5) row-h)))
    (put-text-left (+ tb-x1 300)  cy 280.0 lab "TEXT")
    (put-text-left (+ tb-x1 2700) cy 280.0 val "TEXT")))

;; ---- main demo ----
(defun c:DemoCluster ( / ox oy ex ey)
  (std-layers)

  ;; sheet origin
  (setq ox 0.0 oy 0.0)
  (title-block ox oy)

  ;; cluster origin (with margin inside content area)
  ;; content area starts at (1500, 1500) and is 42050 - 1500 - 6000 - 1500 = 33 050 mm wide
  ;; bina cluster: 3 * 6500 = 19 500 mm wide, 10 300 deep
  (setq cx (+ ox 4000.0))   ; 4 m from left edge
  (setq cy (+ oy 8000.0))   ; 8 m from bottom edge

  ;; draw 3 binas
  (c:BinaB cx cy)
  (c:BinaB (+ cx 6500.0) cy)
  (c:BinaB (+ cx 13000.0) cy)

  ;; dimensions
  (setq dy-bottom (- cy 2200.0))     ; horizontal dim chain below
  (dim-linear-h cx              cy (+ cx 6500.0)  cy dy-bottom)
  (dim-linear-h (+ cx 6500.0)   cy (+ cx 13000.0) cy dy-bottom)
  (dim-linear-h (+ cx 13000.0)  cy (+ cx 19500.0) cy dy-bottom)
  ;; total dim
  (dim-linear-h cx cy (+ cx 19500.0) cy (- cy 3800.0))
  ;; vertical dim (depth)
  (dim-linear-v (+ cx 19500.0) cy (+ cx 19500.0) (+ cy 10300.0)
                (+ cx 21500.0))

  ;; centered sheet title above the plan
  (put-mtext (+ cx 2000.0) (+ cy 12500.0) 700.0
             "სამი ბინა - ბ ტიპის კლასტერი" "TEXT")
  (put-mtext (+ cx 2000.0) (+ cy 11300.0) 350.0
             "ფართი: 3 x 65 მ2 = 195 მ2 (ნომინალური)" "TEXT")

  (command "_.ZOOM" "_E")

  ;; save under a known path so headless tools can pick it up
  (setq save-path "C:/Users/PCZONE.GE/autocad-mcp/outputs/demo-cluster.dwg")
  (setvar "FILEDIA" 0)
  (if (findfile save-path) (vl-file-delete save-path))
  (command "_.SAVEAS" "" save-path)
  (setvar "FILEDIA" 1)

  ;; sentinel file we can stat from outside to confirm completion
  (setq fp (open "C:/Users/PCZONE.GE/autocad-mcp/outputs/demo-cluster.done" "w"))
  (write-line (rtos (getvar "CDATE") 2 6) fp)
  (close fp)

  (princ "\n[demo-cluster] generated 3 binas + title block + dims.\n")
  (princ (strcat "\n[demo-cluster] saved to " save-path "\n"))
  (princ))

(c:DemoCluster)
(princ)
