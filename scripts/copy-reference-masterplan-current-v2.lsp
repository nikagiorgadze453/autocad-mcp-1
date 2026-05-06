(vl-load-com)

(setq src-cx 477327.656)
(setq src-cy 4618735.204)
(setq tgt-cx 476538.393)
(setq tgt-cy 4618297.161)
(setq copy-scale 0.87)

(setq src-minx 477080.0)
(setq src-miny 4618585.0)
(setq src-maxx 477700.0)
(setq src-maxy 4618900.0)

(defun p3 (x y) (vlax-3d-point (list x y 0.0)))

(defun layer-like (layer patterns / ok p u)
  (setq ok nil)
  (setq u (strcase (vl-princ-to-string layer)))
  (foreach p patterns
    (if (wcmatch u (strcase p)) (setq ok T))
  )
  ok
)

(defun bbox-of (ename / obj lo hi result)
  (setq obj (vlax-ename->vla-object ename))
  (setq lo (vlax-3d-point '(0 0 0)))
  (setq hi (vlax-3d-point '(0 0 0)))
  (setq result (vl-catch-all-apply 'vla-getboundingbox (list obj 'lo 'hi)))
  (if (vl-catch-all-error-p result)
    nil
    (list
      (vlax-safearray->list (vlax-variant-value lo))
      (vlax-safearray->list (vlax-variant-value hi))
    )
  )
)

(defun bbox-intersects-source (bb / lo hi minx miny maxx maxy)
  (if bb
    (progn
      (setq lo (car bb))
      (setq hi (cadr bb))
      (setq minx (car lo))
      (setq miny (cadr lo))
      (setq maxx (car hi))
      (setq maxy (cadr hi))
      (and
        (< minx src-maxx)
        (> maxx src-minx)
        (< miny src-maxy)
        (> maxy src-miny)
      )
    )
    nil
  )
)

(setq source-skip-patterns
  '(
    "NGRG-*"
    "BEST-*"
    "TITLE"
    "TEXT"
    "Defpoints"
    "COPY-NOTE"
  )
)

(setq copied 0)
(setq considered 0)
(setq ss (ssget "_X"))
(if ss
  (progn
    (setq i 0)
    (while (< i (sslength ss))
      (setq e (ssname ss i))
      (setq ed (entget e))
      (setq typ (cdr (assoc 0 ed)))
      (setq layer (cdr (assoc 8 ed)))
      (setq bb (bbox-of e))
      (if (and
            bb
            (bbox-intersects-source bb)
            (/= typ "VIEWPORT")
            (not (layer-like layer source-skip-patterns))
          )
        (progn
          (setq considered (1+ considered))
          (setq obj (vlax-ename->vla-object e))
          (setq newobj (vla-copy obj))
          (vla-ScaleEntity newobj (p3 src-cx src-cy) copy-scale)
          (vla-Move newobj (p3 src-cx src-cy) (p3 tgt-cx tgt-cy))
          (setq copied (1+ copied))
        )
      )
      (setq i (1+ i))
    )
  )
)

(command "_.-LAYER" "_M" "COPY-NOTE" "_C" "7" "" "")
(command "_.TEXT" "_J" "_ML" "476360,4618450" "2.5" "0" "Copied/scaled from the reference masterplan")
(command "_.ZOOM" "_W" "476315,4618110" "476765,4618475")

(setq fp (open "C:/Users/PCZONE.GE/autocad-mcp/copy-reference-masterplan-report.txt" "w"))
(write-line "method=database_bbox_scan" fp)
(write-line (strcat "considered=" (itoa considered)) fp)
(write-line (strcat "copied=" (itoa copied)) fp)
(write-line (strcat "scale=" (rtos copy-scale 2 3)) fp)
(write-line "source_window=(477080,4618585)-(477700,4618900)" fp)
(write-line "target_window=(476320,4618115)-(476760,4618475)" fp)
(close fp)

(princ (strcat "\n[copy-reference-masterplan-current-v2] copied=" (itoa copied)))
(princ)
