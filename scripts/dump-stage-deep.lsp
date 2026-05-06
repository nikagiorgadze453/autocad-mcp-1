;; dump-stage-deep.lsp
;; Exhaustive snapshot:
;;   - extents, units
;;   - per-entity: type, layer, handle, bbox (via DXF 10/11/40 fallback when
;;     vla-getboundingbox fails), and entity-specific data
;;   - LINE: start/end, length
;;   - LWPOLYLINE: closed/open, vertices, area, perimeter, bbox
;;   - CIRCLE/ARC: center, radius, angle, area
;;   - DIMENSION: measurement (DXF 42), text, defpoints (10..14)
;;   - TEXT/MTEXT: text content, position, height, layer
;;   - INSERT: block name, position, scale, rotation, layer
;;   - HATCH: bounding pattern (skipped), area via vlax-curve-getarea where possible
;; Output: C:/Users/PCZONE.GE/autocad-mcp/stage-dump-deep.txt

(vl-load-com)

(defun dd:bb (e / b lo hi)
  (vl-catch-all-apply
    '(lambda ()
      (setq b (vlax-ename->vla-object e))
      (setq lo (vlax-3d-point '(0 0 0))
            hi (vlax-3d-point '(0 0 0)))
      (vla-getboundingbox b 'lo 'hi)
      (list (vlax-safearray->list (vlax-variant-value lo))
            (vlax-safearray->list (vlax-variant-value hi))))))

(defun dd:fmt (n) (rtos n 2 3))

(defun dd:str (s)
  (cond
    ((null s) "")
    ((numberp s) (rtos s 2 3))
    (t (vl-string-translate "\n" "|" (vl-princ-to-string s)))))

(defun dd:lwverts (ed / o lst)
  (setq o '() lst ed)
  (while lst
    (if (= (caar lst) 10)
      (setq o (cons (list (cadar lst) (caddar lst)) o)))
    (setq lst (cdr lst)))
  (reverse o))

(defun dd:area (pts / n i p1 p2 s)
  (setq n (length pts) i 0 s 0.0)
  (if (> n 2)
    (progn
      (while (< i n)
        (setq p1 (nth i pts))
        (setq p2 (nth (rem (1+ i) n) pts))
        (setq s (+ s (- (* (car p1) (cadr p2)) (* (car p2) (cadr p1)))))
        (setq i (1+ i)))
      (/ (abs s) 2.0))
    0.0))

(defun dd:perim (pts closed / n total prev)
  (setq n (length pts) total 0.0)
  (if (> n 1)
    (progn
      (setq prev (car pts))
      (foreach p (cdr pts)
        (setq total (+ total (distance prev p)))
        (setq prev p))
      (if (and closed (> n 2))
        (setq total (+ total (distance prev (car pts)))))))
  total)

(defun dd:bbox-from-pts (pts / minx miny maxx maxy)
  (setq minx (car (car pts)) miny (cadr (car pts))
        maxx minx maxy miny)
  (foreach p (cdr pts)
    (if (< (car p) minx) (setq minx (car p)))
    (if (< (cadr p) miny) (setq miny (cadr p)))
    (if (> (car p) maxx) (setq maxx (car p)))
    (if (> (cadr p) maxy) (setq maxy (cadr p))))
  (list (list minx miny) (list maxx maxy)))

(defun c:DumpStageDeep ( / fp ss n i e ed ty la h bb lo hi
                          pts closed area perim
                          p10 p11 r ang1 ang2
                          txt blk pos sx sy rot
                          dimType dimMeas dimText defpt p13 p14)
  (setq fp (open "C:/Users/PCZONE.GE/autocad-mcp/stage-dump-deep.txt" "w"))
  (write-line (strcat "DWG=" (getvar "DWGNAME")) fp)
  (write-line (strcat "PATH=" (getvar "DWGPREFIX")) fp)
  (write-line (strcat "INSUNITS=" (itoa (getvar "INSUNITS"))) fp)
  (write-line (strcat "MEASUREMENT=" (itoa (getvar "MEASUREMENT"))) fp)
  (write-line (strcat "LUNITS=" (itoa (getvar "LUNITS"))) fp)
  (write-line (strcat "EXTMIN=" (vl-prin1-to-string (getvar "EXTMIN"))) fp)
  (write-line (strcat "EXTMAX=" (vl-prin1-to-string (getvar "EXTMAX"))) fp)

  (setq ss (ssget "_X"))
  (if ss
    (progn
      (setq n (sslength ss))
      (write-line (strcat "TOTAL=" (itoa n)) fp)
      (setq i 0)
      (while (< i n)
        (setq e  (ssname ss i))
        (setq ed (entget e))
        (setq ty (cdr (assoc 0 ed)))
        (setq la (cdr (assoc 8 ed)))
        (setq h  (cdr (assoc 5 ed)))
        (setq bb (dd:bb e))
        (cond
          ;;; LINE — start/end, length
          ((= ty "LINE")
            (setq p10 (cdr (assoc 10 ed))
                  p11 (cdr (assoc 11 ed)))
            (write-line
              (strcat "L " (itoa i) " LINE layer=" la " h=" h
                      " s=(" (dd:fmt (car p10)) "," (dd:fmt (cadr p10)) ")"
                      " e=(" (dd:fmt (car p11)) "," (dd:fmt (cadr p11)) ")"
                      " len=" (dd:fmt (distance p10 p11)))
              fp))
          ;;; LWPOLYLINE — full data
          ((= ty "LWPOLYLINE")
            (setq pts (dd:lwverts ed))
            (setq closed (= 1 (logand 1 (cdr (assoc 70 ed)))))
            (setq area (if closed (dd:area pts) 0.0))
            (setq perim (dd:perim pts closed))
            (if pts
              (progn
                (setq bb (dd:bbox-from-pts pts))
                (setq lo (car bb) hi (cadr bb))
                (write-line
                  (strcat "P " (itoa i) " LWPOLYLINE layer=" la " h=" h
                          " closed=" (if closed "1" "0")
                          " npts=" (itoa (length pts))
                          " area=" (dd:fmt area)
                          " perim=" (dd:fmt perim)
                          " bbox=(" (dd:fmt (car lo)) "," (dd:fmt (cadr lo)) ")-("
                                    (dd:fmt (car hi)) "," (dd:fmt (cadr hi)) ")")
                  fp))
              (write-line (strcat "P " (itoa i) " LWPOLYLINE layer=" la " h=" h " (no pts)") fp)))
          ;;; CIRCLE — center, radius, area
          ((= ty "CIRCLE")
            (setq p10 (cdr (assoc 10 ed))
                  r (cdr (assoc 40 ed)))
            (write-line
              (strcat "C " (itoa i) " CIRCLE layer=" la " h=" h
                      " c=(" (dd:fmt (car p10)) "," (dd:fmt (cadr p10)) ")"
                      " r=" (dd:fmt r)
                      " area=" (dd:fmt (* pi r r)))
              fp))
          ;;; ARC
          ((= ty "ARC")
            (setq p10 (cdr (assoc 10 ed))
                  r (cdr (assoc 40 ed))
                  ang1 (cdr (assoc 50 ed))
                  ang2 (cdr (assoc 51 ed)))
            (write-line
              (strcat "A " (itoa i) " ARC layer=" la " h=" h
                      " c=(" (dd:fmt (car p10)) "," (dd:fmt (cadr p10)) ")"
                      " r=" (dd:fmt r)
                      " a1=" (dd:fmt ang1) " a2=" (dd:fmt ang2))
              fp))
          ;;; TEXT or MTEXT
          ((or (= ty "TEXT") (= ty "MTEXT"))
            (setq txt (cdr (assoc 1 ed)))
            (setq pos (cdr (assoc 10 ed)))
            (setq r (cdr (assoc 40 ed)))
            (write-line
              (strcat "T " (itoa i) " " ty " layer=" la " h=" h
                      " pos=(" (dd:fmt (car pos)) "," (dd:fmt (cadr pos)) ")"
                      " hgt=" (if r (dd:fmt r) "0")
                      " text=\"" (dd:str txt) "\"")
              fp))
          ;;; INSERT — block name, position, scale, rotation
          ((= ty "INSERT")
            (setq blk (cdr (assoc 2 ed)))
            (setq pos (cdr (assoc 10 ed)))
            (setq sx (cdr (assoc 41 ed)))
            (setq sy (cdr (assoc 42 ed)))
            (setq rot (cdr (assoc 50 ed)))
            (write-line
              (strcat "B " (itoa i) " INSERT layer=" la " h=" h
                      " block=\"" blk "\""
                      " pos=(" (dd:fmt (car pos)) "," (dd:fmt (cadr pos)) ")"
                      " sx=" (dd:fmt (if sx sx 1.0))
                      " sy=" (dd:fmt (if sy sy 1.0))
                      " rot=" (dd:fmt (if rot rot 0.0)))
              fp))
          ;;; DIMENSION (any kind)
          ((wcmatch ty "DIMENSION,*DIMENSION")
            (setq dimMeas (cdr (assoc 42 ed)))
            (setq dimText (cdr (assoc 1 ed)))
            (setq p10 (cdr (assoc 10 ed)))   ; def pt 1
            (setq p13 (cdr (assoc 13 ed)))   ; def pt 13
            (setq p14 (cdr (assoc 14 ed)))   ; def pt 14
            (write-line
              (strcat "D " (itoa i) " " ty " layer=" la " h=" h
                      " meas=" (if dimMeas (dd:fmt dimMeas) "?")
                      " text=\"" (dd:str dimText) "\""
                      " p10=" (if p10 (strcat "(" (dd:fmt (car p10)) "," (dd:fmt (cadr p10)) ")") "?")
                      " p13=" (if p13 (strcat "(" (dd:fmt (car p13)) "," (dd:fmt (cadr p13)) ")") "?")
                      " p14=" (if p14 (strcat "(" (dd:fmt (car p14)) "," (dd:fmt (cadr p14)) ")") "?"))
              fp))
          ;;; HATCH — get area if possible
          ((= ty "HATCH")
            (setq area (vl-catch-all-apply
              '(lambda () (vlax-curve-getarea (vlax-ename->vla-object e)))))
            (write-line
              (strcat "H " (itoa i) " HATCH layer=" la " h=" h
                      " area=" (if (vl-catch-all-error-p area) "?" (dd:str area)))
              fp))
          ;;; REGION
          ((= ty "REGION")
            (setq area (vl-catch-all-apply
              '(lambda () (vlax-curve-getarea (vlax-ename->vla-object e)))))
            (write-line
              (strcat "R " (itoa i) " REGION layer=" la " h=" h
                      " area=" (if (vl-catch-all-error-p area) "?" (dd:str area)))
              fp))
          ;;; default
          (t
            (write-line
              (strcat "X " (itoa i) " " ty " layer=" la " h=" h)
              fp)))
        (setq i (1+ i))))
    (write-line "TOTAL=0" fp))
  (close fp)
  (princ "\n[dump-stage-deep] done\n")
  (princ))

(c:DumpStageDeep)
(princ)
