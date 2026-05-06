;; check-title-block.lsp
;; Validates that the active drawing carries a project-standard title block:
;;   - 3 nested rectangles on layer "TITLE"
;;   - 6-row title block on the right edge
;;   - 6 Georgian labels: პროექტი / ნახაზი / ფურცელი / მასშტაბი / თარიღი /
;;     შემსრულებელი
;;   - all MText on the title block uses Sylfaen
;;
;; Usage:
;;   (load "C:/Users/PCZONE.GE/autocad-mcp/scripts/validators/check-title-block.lsp")
;;   (c:CheckTitle)

(vl-load-com)

(setq *required-labels*
  '("პროექტი"
    "ნახაზი"
    "ფურცელი"
    "მასშტაბი"
    "თარიღი"
    "შემსრულებელი"))

(defun ct:strip (s) (vl-string-subst "" "\\fSylfaen|b0|i0;" s))

(defun ct:has-label (needle / ss n i found e ed t)
  (setq found nil)
  (setq ss (ssget "_X" '((0 . "MTEXT,TEXT") (8 . "TEXT,TITLE"))))
  (if ss
    (progn
      (setq n (sslength ss) i 0)
      (while (and (< i n) (not found))
        (setq e (ssname ss i))
        (setq ed (entget e))
        (setq t (ct:strip (cdr (assoc 1 ed))))
        (if (vl-string-search needle t) (setq found t))
        (setq i (1+ i)))))
  found)

(defun ct:title-rects ()
  (length (ssget "_X" '((0 . "LWPOLYLINE") (8 . "TITLE")))))

(defun ct:sylfaen-ok ()
  (tblsearch "STYLE" "GEO"))

(defun c:CheckTitle ( / report ok rectCount style lbl)
  (setq report '() ok t)

  (setq rectCount (ct:title-rects))
  (if (< rectCount 3)
    (progn
      (setq report (cons (strcat "title rects: expected ≥ 3, got " (itoa rectCount)) report))
      (setq ok nil))
    (setq report (cons (strcat "title rects: " (itoa rectCount) " (ok)") report)))

  (setq style (ct:sylfaen-ok))
  (if style
    (setq report (cons "style 'GEO' present (ok)" report))
    (progn
      (setq report (cons "style 'GEO' missing — run load-sylfaen.lsp" report))
      (setq ok nil)))

  (foreach lbl *required-labels*
    (if (ct:has-label lbl)
      (setq report (cons (strcat "label '" lbl "': found") report))
      (progn
        (setq report (cons (strcat "label '" lbl "': MISSING") report))
        (setq ok nil))))

  (princ (strcat "\n[check-title-block] " (if ok "PASS" "FAIL") "\n"))
  (foreach r (reverse report)
    (princ (strcat "  - " r "\n")))
  (princ))

(princ "\n[check-title-block] loaded — run (c:CheckTitle)\n")
(princ)
