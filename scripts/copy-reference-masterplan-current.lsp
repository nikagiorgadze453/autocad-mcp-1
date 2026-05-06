(vl-load-com)

(setq src-cx 477327.656)
(setq src-cy 4618735.204)
(setq tgt-cx 476538.393)
(setq tgt-cy 4618297.161)
(setq copy-scale 0.87)

(defun p3 (x y) (vlax-3d-point (list x y 0.0)))

(defun layer-like (layer patterns / ok p u)
  (setq ok nil)
  (setq u (strcase (vl-princ-to-string layer)))
  (foreach p patterns
    (if (wcmatch u (strcase p)) (setq ok T))
  )
  ok
)

(setq target-delete-patterns
  '(
    "NGRG-*"
    "BEST-*"
    "GRG-*"
    "F12-*"
    "TITLE"
    "TEXT"
    "Parkireba_90"
    "საპროეტო_შენობა"
    "საავტომ.სამოძრაო"
    "საფეხმ.ტროტუარი"
    "გამწვანება ივნისი"
    "შენობის ნომერი"
    "შენობის სართულიანობა"
    "zomis xazebi"
  )
)

(setq source-skip-patterns
  '(
    "NGRG-*"
    "BEST-*"
    "TITLE"
    "TEXT"
    "Defpoints"
  )
)

;; Remove the generated attempts from the target window only.
(setq erased 0)
(setq ss-del (ssget "_C" (list 476320 4618115 0) (list 476760 4618475 0)))
(if ss-del
  (progn
    (setq i 0)
    (while (< i (sslength ss-del))
      (setq e (ssname ss-del i))
      (setq ed (entget e))
      (setq layer (cdr (assoc 8 ed)))
      (if (layer-like layer target-delete-patterns)
        (progn
          (entdel e)
          (setq erased (1+ erased))
        )
      )
      (setq i (1+ i))
    )
  )
)

;; Copy the already-made reference masterplan from the right/source window.
(setq copied 0)
(setq source-ss (ssget "_C" (list 477080 4618585 0) (list 477700 4618900 0)))
(if source-ss
  (progn
    (setq i 0)
    (while (< i (sslength source-ss))
      (setq e (ssname source-ss i))
      (setq ed (entget e))
      (setq typ (cdr (assoc 0 ed)))
      (setq layer (cdr (assoc 8 ed)))
      (if (and
            (/= typ "VIEWPORT")
            (not (layer-like layer source-skip-patterns))
          )
        (progn
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

;; Add a small English note outside the copied content but inside the target view.
(command "_.-LAYER" "_M" "COPY-NOTE" "_C" "7" "" "")
(command "_.TEXT" "_J" "_ML" "476360,4618450" "2.5" "0" "Copied/scaled from the reference masterplan - same building/parking logic")

(command "_.ZOOM" "_W" "476315,4618110" "476765,4618475")

(setq fp (open "C:/Users/PCZONE.GE/autocad-mcp/copy-reference-masterplan-report.txt" "w"))
(write-line (strcat "erased=" (itoa erased)) fp)
(write-line (strcat "copied=" (itoa copied)) fp)
(write-line (strcat "scale=" (rtos copy-scale 2 3)) fp)
(write-line "source_window=(477080,4618585)-(477700,4618900)" fp)
(write-line "target_window=(476320,4618115)-(476760,4618475)" fp)
(write-line "source_center=(477327.656,4618735.204)" fp)
(write-line "target_center=(476538.393,4618297.161)" fp)
(close fp)

(princ (strcat "\n[copy-reference-masterplan-current] erased=" (itoa erased) " copied=" (itoa copied)))
(princ)
