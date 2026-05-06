;; dump-stage.lsp
;; Comprehensive snapshot of the active model space with focus on closed
;; polylines (areas), block inserts, text content and bounding boxes.
;; Output: C:/Users/PCZONE.GE/autocad-mcp/stage-dump.txt

(vl-load-com)

(defun ds:safe-bbox (e / b lo hi)
  (setq b (vlax-ename->vla-object e))
  (setq lo (vlax-3d-point '(0 0 0))
        hi (vlax-3d-point '(0 0 0)))
  (vla-getboundingbox b 'lo 'hi)
  (list (vlax-safearray->list (vlax-variant-value lo))
        (vlax-safearray->list (vlax-variant-value hi))))

(defun ds:bbox-center (bb / lo hi)
  (setq lo (car bb) hi (cadr bb))
  (list (/ (+ (car  lo) (car  hi)) 2.0)
        (/ (+ (cadr lo) (cadr hi)) 2.0)))

(defun ds:bbox-size (bb / lo hi)
  (setq lo (car bb) hi (cadr bb))
  (list (- (car  hi) (car  lo))
        (- (cadr hi) (cadr lo))))

(defun ds:lwpoly-vertices (ed / lst out)
  (setq lst ed out '())
  (while lst
    (if (= (caar lst) 10)
      (setq out (cons (list (cadar lst) (caddar lst)) out)))
    (setq lst (cdr lst)))
  (reverse out))

(defun ds:poly-area (pts / n i p1 p2 sum)
  (setq n (length pts) i 0 sum 0.0)
  (if (> n 2)
    (progn
      (while (< i n)
        (setq p1 (nth i pts))
        (setq p2 (nth (rem (1+ i) n) pts))
        (setq sum (+ sum (- (* (car p1) (cadr p2)) (* (car p2) (cadr p1)))))
        (setq i (1+ i)))
      (/ (abs sum) 2.0))
    0.0))

(defun ds:poly-perim (pts closed / n total prev)
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

(defun ds:fmt-num (x) (rtos x 2 3))

(defun c:DumpStage ( / fp ss i n e ed ty la h bb lo hi cx cy sx sy
                       pts closed area perim txt blk pos
                       layerArea ass cell)
  (setq fp (open "C:/Users/PCZONE.GE/autocad-mcp/stage-dump.txt" "w"))
  (write-line (strcat "DWG=" (getvar "DWGNAME")) fp)
  (write-line (strcat "PATH=" (getvar "DWGPREFIX")) fp)
  (write-line (strcat "INSUNITS=" (itoa (getvar "INSUNITS"))) fp)
  (write-line (strcat "EXTMIN=" (vl-prin1-to-string (getvar "EXTMIN"))) fp)
  (write-line (strcat "EXTMAX=" (vl-prin1-to-string (getvar "EXTMAX"))) fp)

  (setq layerArea '())
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
        (setq bb (vl-catch-all-apply 'ds:safe-bbox (list e)))
        (cond
          ((vl-catch-all-error-p bb)
           (cond
             ((or (= ty "TEXT") (= ty "MTEXT"))
              (setq txt (cdr (assoc 1 ed)))
              (setq pos (cdr (assoc 10 ed)))
              (write-line
                (strcat "T " (itoa i) " " ty " layer=" la " h=" h
                        " pos=(" (ds:fmt-num (car pos)) "," (ds:fmt-num (cadr pos)) ")"
                        " text=\"" (vl-string-translate "\n" "|" (vl-princ-to-string txt)) "\"")
                fp))
             ((= ty "INSERT")
              (setq blk (cdr (assoc 2 ed)))
              (setq pos (cdr (assoc 10 ed)))
              (write-line
                (strcat "B " (itoa i) " INSERT layer=" la " h=" h
                        " block=" blk
                        " pos=(" (ds:fmt-num (car pos)) "," (ds:fmt-num (cadr pos)) ")")
                fp))
             (t
              (write-line (strcat "X " (itoa i) " " ty " layer=" la " h=" h " bbox=ERR") fp))))
          (t
           (setq lo (car bb) hi (cadr bb))
           (setq cx (/ (+ (car  lo) (car  hi)) 2.0))
           (setq cy (/ (+ (cadr lo) (cadr hi)) 2.0))
           (setq sx (- (car  hi) (car  lo)))
           (setq sy (- (cadr hi) (cadr lo)))
           (cond
             ((= ty "LWPOLYLINE")
              (setq pts (ds:lwpoly-vertices ed))
              (setq closed (= 1 (logand 1 (cdr (assoc 70 ed)))))
              (setq area (if closed (ds:poly-area pts) 0.0))
              (setq perim (ds:poly-perim pts closed))
              (write-line
                (strcat "P " (itoa i) " LWPOLYLINE layer=" la " h=" h
                        " closed=" (if closed "1" "0")
                        " area=" (ds:fmt-num area)
                        " perim=" (ds:fmt-num perim)
                        " bbox=(" (ds:fmt-num (car lo)) "," (ds:fmt-num (cadr lo)) ")-("
                                  (ds:fmt-num (car hi)) "," (ds:fmt-num (cadr hi)) ")"
                        " size=" (ds:fmt-num sx) "x" (ds:fmt-num sy))
                fp)
              (if closed
                (progn
                  (setq cell (assoc la layerArea))
                  (if cell
                    (setq layerArea (subst (cons la (+ (cdr cell) area)) cell layerArea))
                    (setq layerArea (cons (cons la area) layerArea))))))
             ((or (= ty "TEXT") (= ty "MTEXT"))
              (setq txt (cdr (assoc 1 ed)))
              (write-line
                (strcat "T " (itoa i) " " ty " layer=" la " h=" h
                        " pos=(" (ds:fmt-num cx) "," (ds:fmt-num cy) ")"
                        " bbox=(" (ds:fmt-num (car lo)) "," (ds:fmt-num (cadr lo)) ")-("
                                  (ds:fmt-num (car hi)) "," (ds:fmt-num (cadr hi)) ")"
                        " text=\"" (vl-string-translate "\n" "|" (vl-princ-to-string txt)) "\"")
                fp))
             ((= ty "INSERT")
              (setq blk (cdr (assoc 2 ed)))
              (setq pos (cdr (assoc 10 ed)))
              (write-line
                (strcat "B " (itoa i) " INSERT layer=" la " h=" h
                        " block=" blk
                        " pos=(" (ds:fmt-num (car pos)) "," (ds:fmt-num (cadr pos)) ")"
                        " bbox=(" (ds:fmt-num (car lo)) "," (ds:fmt-num (cadr lo)) ")-("
                                  (ds:fmt-num (car hi)) "," (ds:fmt-num (cadr hi)) ")")
                fp))
             ((= ty "CIRCLE")
              (setq area (* pi (cdr (assoc 40 ed)) (cdr (assoc 40 ed)))) 
              (write-line
                (strcat "C " (itoa i) " CIRCLE layer=" la " h=" h
                        " r=" (ds:fmt-num (cdr (assoc 40 ed)))
                        " area=" (ds:fmt-num area)
                        " bbox=(" (ds:fmt-num (car lo)) "," (ds:fmt-num (cadr lo)) ")-("
                                  (ds:fmt-num (car hi)) "," (ds:fmt-num (cadr hi)) ")")
                fp))
             ((or (= ty "REGION") (= ty "HATCH"))
              (setq area (vlax-curve-getarea (vlax-ename->vla-object e)))
              (write-line
                (strcat "R " (itoa i) " " ty " layer=" la " h=" h
                        " area=" (vl-princ-to-string area)
                        " bbox=(" (ds:fmt-num (car lo)) "," (ds:fmt-num (cadr lo)) ")-("
                                  (ds:fmt-num (car hi)) "," (ds:fmt-num (cadr hi)) ")")
                fp))
             (t
              (write-line
                (strcat "E " (itoa i) " " ty " layer=" la " h=" h
                        " bbox=(" (ds:fmt-num (car lo)) "," (ds:fmt-num (cadr lo)) ")-("
                                  (ds:fmt-num (car hi)) "," (ds:fmt-num (cadr hi)) ")"
                        " size=" (ds:fmt-num sx) "x" (ds:fmt-num sy))
                fp)))))
        (setq i (1+ i))))
    (write-line "TOTAL=0" fp))

  (write-line "" fp)
  (write-line "==== AREA BY LAYER (closed LWPOLYLINEs only) ====" fp)
  (foreach pair layerArea
    (write-line (strcat (car pair) " => " (ds:fmt-num (cdr pair))) fp))

  (close fp)
  (princ "\n[dump-stage] done\n")
  (princ))

(c:DumpStage)
(princ)
