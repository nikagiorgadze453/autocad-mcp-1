;; compute-grg-k.lsp
;; Computes K-coefficients (K1, K2, K2-1 / FAR, K3) of a GRG project.
;;
;; Usage:
;;   (load "C:/Users/PCZONE.GE/autocad-mcp/scripts/utilities/compute-grg-k.lsp")
;;   (c:GrgK 4)        ; argument = number of above-ground floors
;;
;; Inputs (read from the active drawing):
;;   - parcel boundary  : closed LWPOLYLINE on layer "PARCEL" or
;;                        any layer containing "ნაკვეთ" / "sakutreb"
;;   - building footprints : closed LWPOLYLINEs on layer "WALL"
;;                            (or matching `*WALL*`, `*BEARING*`, `*SHENOBEB*`)
;;   - green areas      : closed LWPOLYLINEs on any layer matching
;;                        `*GAMWVANEB*`, `*GREEN*`, `*MWVAN*`
;;
;; Output: prints + writes JSON to grg-k-report.json.

(vl-load-com)

(defun grg:layer-match (pat name / u)
  (setq u (strcase name))
  (vl-some '(lambda (p) (wcmatch u p)) pat))

(defun grg:area (e / o a)
  (setq o (vlax-ename->vla-object e))
  (setq a (vl-catch-all-apply 'vlax-curve-getarea (list o)))
  (if (vl-catch-all-error-p a) 0.0 a))

(defun grg:sum-area (patterns / total ss n i e ed la)
  (setq total 0.0)
  (setq ss (ssget "_X" '((0 . "LWPOLYLINE") (-4 . "&") (70 . 1))))
  (if ss
    (progn
      (setq n (sslength ss) i 0)
      (while (< i n)
        (setq e (ssname ss i))
        (setq ed (entget e))
        (setq la (cdr (assoc 8 ed)))
        (if (grg:layer-match patterns la)
          (setq total (+ total (grg:area e))))
        (setq i (1+ i)))))
  total)

(defun grg:json-line (k v) (strcat "  \"" k "\": " (rtos v 2 4)))

(defun c:GrgK (floors / parcel-area footprint green farValue k1 k2-1 k3 fp)
  (if (or (not floors) (not (numberp floors))) (setq floors 1))

  (setq parcel-area (grg:sum-area '("*PARCEL*" "*NAKVET*" "*NAVET*" "*SAKUTREB*")))
  (setq footprint   (grg:sum-area '("WALL" "*WALL*" "*BEARING*" "*SHENOBEB*")))
  (setq green       (grg:sum-area '("*GAMWVANEB*" "*GREEN*" "*MWVAN*")))

  (if (= parcel-area 0.0)
    (progn
      (princ "\n[grg-k] no parcel found — please draw closed polyline on PARCEL layer\n")
      (princ))
    (progn
      (setq parcel-area (/ parcel-area 1000000.0)) ; mm² → m²
      (setq footprint   (/ footprint   1000000.0))
      (setq green       (/ green       1000000.0))

      (setq k1   (/ footprint parcel-area))
      (setq k2-1 (/ (* footprint floors) parcel-area))
      (setq k3   (if (> green 0.0) (/ green parcel-area) 0.0))

      (princ (strcat "\n[grg-k] parcel = " (rtos parcel-area 2 1) " m²"))
      (princ (strcat "\n        footprint = " (rtos footprint 2 1) " m²"))
      (princ (strcat "\n        floors = " (itoa floors)))
      (princ (strcat "\n        K-1 (footprint coef) = " (rtos k1 2 3)))
      (princ (strcat "\n        K-2-1 / FAR          = " (rtos k2-1 2 3)))
      (princ (strcat "\n        K-3 (green coef)     = " (rtos k3 2 3)))

      (setq fp (open "C:/Users/PCZONE.GE/autocad-mcp/grg-k-report.json" "w"))
      (write-line "{" fp)
      (write-line (strcat "  \"dwg\": \"" (getvar "DWGNAME") "\",") fp)
      (write-line (grg:json-line "parcel_m2"      parcel-area) fp) (write-line "," fp)
      (write-line (grg:json-line "footprint_m2"   footprint)   fp) (write-line "," fp)
      (write-line (grg:json-line "green_m2"       green)       fp) (write-line "," fp)
      (write-line (strcat "  \"floors\": " (itoa floors) ",") fp)
      (write-line (grg:json-line "K1"             k1)          fp) (write-line "," fp)
      (write-line (grg:json-line "K2_1_FAR"       k2-1)        fp) (write-line "," fp)
      (write-line (grg:json-line "K3"             k3)          fp)
      (write-line "}" fp)
      (close fp)

      (princ "\n[grg-k] report saved to grg-k-report.json\n")))
  (princ))

(princ "\n[compute-grg-k] loaded — call (c:GrgK <floors>)\n")
(princ)
