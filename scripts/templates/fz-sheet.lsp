;; fz-sheet.lsp
;; Generates an empty FZ-N (Functional Zone) GRG sheet skeleton including:
;;   - A0 sheet trim (1189 x 841 mm)
;;   - 3 nested frames: outer trim, inner frame (margin 600), content (margin 800)
;;   - Title block on the right edge with 6 rows (rule 01)
;;   - Empty xref placeholders for: zonireba, gengegma, topo, sakutreba
;;
;; Usage:
;;   (load "C:/Users/PCZONE.GE/autocad-mcp/scripts/templates/fz-sheet.lsp")
;;   (c:FzSheet "FZ-3" "ფუნქციური ზონა")
;;
;; The sheet anchor is at world (0,0). Move/rotate after generation.

(vl-load-com)

(defun fz:layer (n c)
  (if (not (tblsearch "LAYER" n))
    (command "_.-LAYER" "_M" n "_C" c "" "")))

(defun fz:rect (x1 y1 x2 y2 layer)
  (command "_.-LAYER" "_S" layer "")
  (command "_.PLINE"
           (list x1 y1) (list x2 y1) (list x2 y2) (list x1 y2) "_C"))

(defun fz:line (x1 y1 x2 y2 layer)
  (command "_.-LAYER" "_S" layer "")
  (command "_.LINE" (list x1 y1) (list x2 y2) ""))

(defun fz:mtext (x y h s layer)
  (command "_.-LAYER" "_S" layer "")
  (command "_.-MTEXT" (list x y) "_H" h "_S" "GEO" (list (+ x 5000) (- y h))
           (strcat "\\fSylfaen|b0|i0;" s) ""))

(defun c:FzSheet (sheetCode sheetTitle / sw sh tbW tbH r1 r2 r3 r4 r5 r6)
  (fz:layer "TITLE" "7")
  (fz:layer "TEXT"  "7")

  (setq sw 1189000.0 sh 841000.0)         ; A0 in mm * 1000? — no, plain mm
  (setq sw 1189.0  sh  841.0)             ; A0 in mm
  ;; we'll work at paper scale (mm). Plotting handles the scale ratio.

  ;; outer trim
  (fz:rect 0 0 sw sh "TITLE")
  ;; inner frame margin 6
  (fz:rect 6 6 (- sw 6) (- sh 6) "TITLE")
  ;; content margin extra 8
  (fz:rect 14 14 (- sw 14) (- sh 14) "TITLE")

  ;; title block right edge: 60 mm wide, 6 rows of equal height
  (setq tbW 60.0 tbH (/ (- sh 28) 6.0))
  (setq r1 (- sh 14))
  (setq r2 (- r1 tbH))
  (setq r3 (- r2 tbH))
  (setq r4 (- r3 tbH))
  (setq r5 (- r4 tbH))
  (setq r6 (- r5 tbH))

  (fz:rect (- sw 14 tbW) 14 (- sw 14) (- sh 14) "TITLE")
  (fz:line (- sw 14 tbW) r2 (- sw 14) r2 "TITLE")
  (fz:line (- sw 14 tbW) r3 (- sw 14) r3 "TITLE")
  (fz:line (- sw 14 tbW) r4 (- sw 14) r4 "TITLE")
  (fz:line (- sw 14 tbW) r5 (- sw 14) r5 "TITLE")
  (fz:line (- sw 14 tbW) r6 (- sw 14) r6 "TITLE")

  ;; labels (Georgian)
  (fz:mtext (- sw 14 tbW -2.0) (- r1 4.0) 4.0 "პროექტი:"      "TEXT")
  (fz:mtext (- sw 14 tbW -2.0) (- r2 4.0) 4.0 "ნახაზი:"        "TEXT")
  (fz:mtext (- sw 14 tbW -2.0) (- r3 4.0) 4.0 "ფურცელი:"       "TEXT")
  (fz:mtext (- sw 14 tbW -2.0) (- r4 4.0) 4.0 "მასშტაბი:"      "TEXT")
  (fz:mtext (- sw 14 tbW -2.0) (- r5 4.0) 4.0 "თარიღი:"        "TEXT")
  (fz:mtext (- sw 14 tbW -2.0) (- r6 4.0) 4.0 "შემსრულებელი:" "TEXT")

  ;; sheet code (row 3 right side, large)
  (fz:mtext (- sw 14 (/ tbW 2.0)) (- r3 6.0) 8.0 sheetCode "TEXT")

  ;; sheet title above content (centered)
  (fz:mtext (/ sw 2.0) (- sh 30.0) 12.0 sheetTitle "TEXT")

  (princ (strcat "\n[fz-sheet] generated " sheetCode " — A0 sheet ready.\n"))
  (princ))

(princ "\n[fz-sheet] loaded — call (c:FzSheet \"FZ-3\" \"ფუნქციური ზონა\")\n")
(princ)
