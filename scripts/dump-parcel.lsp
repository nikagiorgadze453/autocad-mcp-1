;; dump-parcel.lsp
;; Iterates ALL polylines/lwpolylines in modelspace and writes a JSON-ish
;; report to C:/Users/PCZONE.GE/autocad-mcp/parcel-dump.txt so the agent
;; can read the parcel vertex coordinates back.

(defun dump-vertices (e fp / d code val name)
  ;; e is entity name; we'll print all 10/11 group codes (vertex coords)
  (write-line (strcat "  layer=" (cdr (assoc 8 (entget e)))
                      "  type=" (cdr (assoc 0 (entget e)))
                      "  handle=" (cdr (assoc 5 (entget e))))
              fp)
  (foreach pair (entget e)
    (if (= (car pair) 10)
      (write-line (strcat "    v "
                          (rtos (cadr pair) 2 3) " "
                          (rtos (caddr pair) 2 3))
                  fp)
    )
  )
)

(defun get-bbox (e / b min max)
  (vl-load-com)
  (setq b (vlax-ename->vla-object e))
  (setq min (vlax-3d-point '(0 0 0))
        max (vlax-3d-point '(0 0 0)))
  (vla-getboundingbox b 'min 'max)
  (list (vlax-safearray->list (vlax-variant-value min))
        (vlax-safearray->list (vlax-variant-value max)))
)

(setq fp (open "C:/Users/PCZONE.GE/autocad-mcp/parcel-dump.txt" "w"))
(write-line "[parcel-dump]" fp)
(write-line (strcat "DWG=" (getvar "DWGNAME")) fp)
(write-line (strcat "EXTMIN=" (vl-prin1-to-string (getvar "EXTMIN"))) fp)
(write-line (strcat "EXTMAX=" (vl-prin1-to-string (getvar "EXTMAX"))) fp)

;; List of layer names to probe
(setq targets '("R02_Nakveti" "reg_nak" "გზა_საპროექტო" "A-Wall"))

(foreach lay targets
  (write-line (strcat "[layer=" lay "]") fp)
  (setq ss (ssget "_X" (list (cons 8 lay)
                             (cons 0 "*POLYLINE,LWPOLYLINE,LINE,CIRCLE,ARC"))))
  (if ss
    (progn
      (write-line (strcat "  count=" (itoa (sslength ss))) fp)
      (setq i 0)
      (while (< i (sslength ss))
        (setq e (ssname ss i))
        (write-line (strcat "  --- entity " (itoa i) " ---") fp)
        (dump-vertices e fp)
        ;; bounding box
        (setq bb (vl-catch-all-apply 'get-bbox (list e)))
        (if (not (vl-catch-all-error-p bb))
          (write-line (strcat "    bbox " (vl-prin1-to-string bb)) fp)
        )
        (setq i (1+ i))
      )
    )
    (write-line "  count=0" fp)
  )
)

;; Also dump ALL layers list, just in case the parcel is on another layer
(write-line "[all-layers]" fp)
(setq lst nil)
(setq lay (tblnext "LAYER" T))
(while lay
  (write-line (strcat "  " (cdr (assoc 2 lay))) fp)
  (setq lay (tblnext "LAYER"))
)

(close fp)
(princ "\n[dump-parcel] wrote parcel-dump.txt")
(princ)
