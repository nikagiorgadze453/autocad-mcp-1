;; cleanup-and-measure.lsp
;; 1) Erase every entity on any layer starting with "S-"
;; 2) Compute the parcel polyline's true area and centroid
;; 3) Write results to parcel-info.txt

(setvar "CMDECHO" 0)
(setvar "OSMODE"  0)
(setvar "FILEDIA" 0)

;; --- 1. erase S-* layer content -----------------------------------------
(setq layers '("S-SITE-BOUND" "S-SETBACK" "S-WALL" "S-BLDG" "S-ROAD"
               "S-ROAD-LINE" "S-PARKING" "S-PARK-NUM" "S-SIDEWALK"
               "S-GREEN" "S-TREE" "S-DIM" "S-TEXT" "S-TITLE" "S-TABLE"))
(setq killed 0)
(foreach lay layers
  (setq ss (ssget "_X" (list (cons 8 lay))))
  (if ss
    (progn
      (setq killed (+ killed (sslength ss)))
      (command "_.ERASE" ss "")
    )
  )
)

;; --- 2. find parcel polyline (layer 0, LWPOLYLINE) ----------------------
(setq fp (open "C:/Users/PCZONE.GE/autocad-mcp/parcel-info.txt" "w"))
(write-line (strcat "DELETED_ENTITIES=" (itoa killed)) fp)

(setq ss (ssget "_X" '((0 . "LWPOLYLINE,POLYLINE") (8 . "0"))))
(if (null ss)
  (write-line "no parcel polyline found" fp)
  (progn
    (write-line (strcat "candidates=" (itoa (sslength ss))) fp)
    (setq i 0 best nil bestArea 0)
    (while (< i (sslength ss))
      (setq e (ssname ss i))
      (setq area (vl-catch-all-apply 'vlax-curve-getarea (list e)))
      (if (and (not (vl-catch-all-error-p area))
               (> area bestArea))
        (progn (setq bestArea area best e)))
      (setq i (1+ i))
    )

    (if best
      (progn
        (setq ed (entget best))
        (setq h  (cdr (assoc 5 ed)))
        (write-line (strcat "PARCEL_HANDLE=" h) fp)
        (write-line (strcat "PARCEL_AREA="   (rtos bestArea 2 3)) fp)
        ;; perimeter via vla
        (vl-load-com)
        (setq vob (vlax-ename->vla-object best))
        (setq peri (vlax-curve-getDistAtParam best (vlax-curve-getEndParam best)))
        (write-line (strcat "PARCEL_PERIM=" (rtos peri 2 3)) fp)
        ;; bbox + centroid
        (setq minx 1e99 miny 1e99 maxx -1e99 maxy -1e99
              sx 0.0 sy 0.0 nv 0)
        (foreach pair ed
          (if (= (car pair) 10)
            (progn
              (setq vx (cadr pair) vy (caddr pair))
              (if (< vx minx) (setq minx vx))
              (if (< vy miny) (setq miny vy))
              (if (> vx maxx) (setq maxx vx))
              (if (> vy maxy) (setq maxy vy))
              (setq sx (+ sx vx) sy (+ sy vy) nv (1+ nv))
            )
          )
        )
        (write-line (strcat "PARCEL_BBOX=("
                            (rtos minx 2 3) "," (rtos miny 2 3) ")-("
                            (rtos maxx 2 3) "," (rtos maxy 2 3) ")") fp)
        (write-line (strcat "PARCEL_BBOX_SIZE="
                            (rtos (- maxx minx) 2 3) "x"
                            (rtos (- maxy miny) 2 3)) fp)
        (write-line (strcat "PARCEL_CENTROID="
                            (rtos (/ sx nv) 2 3) ","
                            (rtos (/ sy nv) 2 3)) fp)
        (write-line (strcat "PARCEL_NVERTS=" (itoa nv)) fp)
        (write-line (strcat "INSUNITS=" (itoa (getvar "INSUNITS"))) fp)
        (write-line (strcat "EXTMIN="  (vl-prin1-to-string (getvar "EXTMIN"))) fp)
        (write-line (strcat "EXTMAX="  (vl-prin1-to-string (getvar "EXTMAX"))) fp)
      )
      (write-line "no closed polyline area" fp)
    )
  )
)

(close fp)
(princ "\n[cleanup-and-measure] done")
(princ)
