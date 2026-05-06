;; dump-parcel-v2.lsp
;; Find the parcel polyline (layer 0, LWPOLYLINE) and write its vertices.
;; Also enumerate every LWPOLYLINE in the drawing with its vertex list,
;; so we can pick the right one if there are several.

(setq fp (open "C:/Users/PCZONE.GE/autocad-mcp/parcel-v2.txt" "w"))
(write-line (strcat "TILEMODE=" (itoa (getvar "TILEMODE"))) fp)
(write-line (strcat "DWGNAME="  (getvar "DWGNAME")) fp)

(setq ss (ssget "_X" '((0 . "LWPOLYLINE,POLYLINE"))))
(if (null ss)
  (write-line "no polylines" fp)
  (progn
    (write-line (strcat "TOTAL=" (itoa (sslength ss))) fp)
    (setq i 0)
    (while (< i (sslength ss))
      (setq e  (ssname ss i))
      (setq ed (entget e))
      (setq la (cdr (assoc 8 ed)))
      (setq h  (cdr (assoc 5 ed)))
      (setq closed (cdr (assoc 70 ed)))
      (setq verts nil)
      (setq sumx 0.0 sumy 0.0 minx 1e99 miny 1e99 maxx -1e99 maxy -1e99 nv 0)
      (foreach pair ed
        (if (= (car pair) 10)
          (progn
            (setq vx (cadr pair) vy (caddr pair))
            (setq verts (cons (list vx vy) verts))
            (if (< vx minx) (setq minx vx))
            (if (< vy miny) (setq miny vy))
            (if (> vx maxx) (setq maxx vx))
            (if (> vy maxy) (setq maxy vy))
            (setq nv (1+ nv))
          )
        )
      )
      (write-line
        (strcat "[" (itoa i) "] layer=" la "  h=" h
                "  closed=" (itoa closed)
                "  nverts=" (itoa nv)
                "  bbox=(" (rtos minx 2 1) "," (rtos miny 2 1)
                "  -  "       (rtos maxx 2 1) "," (rtos maxy 2 1) ")"
                "  size=" (rtos (- maxx minx) 2 1) "x" (rtos (- maxy miny) 2 1))
        fp)
      (foreach v (reverse verts)
        (write-line (strcat "    v "
                            (rtos (car v) 2 3) " "
                            (rtos (cadr v) 2 3))
                    fp)
      )
      (setq i (1+ i))
    )
  )
)

(close fp)
(princ "\n[dump-parcel-v2] done")
(princ)
