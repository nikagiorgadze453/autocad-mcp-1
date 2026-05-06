;; dump-all.lsp
;; Dump all modelspace entities (type, layer, handle, bbox center+size)

(vl-load-com)

(defun safe-bbox (e / b lo hi)
  (setq b (vlax-ename->vla-object e))
  (setq lo (vlax-3d-point '(0 0 0))
        hi (vlax-3d-point '(0 0 0)))
  (vla-getboundingbox b 'lo 'hi)
  (list (vlax-safearray->list (vlax-variant-value lo))
        (vlax-safearray->list (vlax-variant-value hi)))
)

(setq fp (open "C:/Users/PCZONE.GE/autocad-mcp/all-dump.txt" "w"))
(write-line (strcat "DWG=" (getvar "DWGNAME")) fp)
(write-line (strcat "EXTMIN=" (vl-prin1-to-string (getvar "EXTMIN"))) fp)
(write-line (strcat "EXTMAX=" (vl-prin1-to-string (getvar "EXTMAX"))) fp)

(setq ss (ssget "_X"))
(if ss
  (progn
    (write-line (strcat "TOTAL=" (itoa (sslength ss))) fp)
    (setq i 0)
    (while (< i (sslength ss))
      (setq e (ssname ss i))
      (setq ed (entget e))
      (setq ty (cdr (assoc 0 ed)))
      (setq la (cdr (assoc 8 ed)))
      (setq h  (cdr (assoc 5 ed)))
      (setq bb (vl-catch-all-apply 'safe-bbox (list e)))
      (if (vl-catch-all-error-p bb)
        (write-line (strcat (itoa i) "  " ty "  layer=" la "  h=" h "  bbox=ERR") fp)
        (progn
          (setq lo (car bb) hi (cadr bb))
          (write-line
            (strcat (itoa i) "  " ty "  layer=" la "  h=" h
                    "  bbox=("
                    (rtos (car  lo) 2 1) "," (rtos (cadr lo) 2 1) ")-("
                    (rtos (car  hi) 2 1) "," (rtos (cadr hi) 2 1) ")  size="
                    (rtos (- (car  hi) (car  lo)) 2 1) "x"
                    (rtos (- (cadr hi) (cadr lo)) 2 1))
            fp)
        )
      )
      (setq i (1+ i))
      (if (> i 500) (setq i 99999))
    )
  )
  (write-line "TOTAL=0" fp)
)

(close fp)
(princ "\n[dump-all] done")
(princ)
