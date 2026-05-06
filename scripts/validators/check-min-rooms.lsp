;; check-min-rooms.lsp
;; Iterates closed polylines on layer "ROOM" (or "FURN") and validates each
;; against the СНиП 2.07.01-89 / Neufert minima from rule 09-snip-neufert.mdc.
;;
;; Room type detection is done by reading the nearest MText label (within
;; 5 m of the polyline centroid) and matching keywords:
;;   "მისაღები"          → living   (>= 16 m²)
;;   "სამზარეულო"        → kitchen  (>= 6 m²)
;;   "მთავარი საძინებელი" → master  (>= 12 m²)
;;   "საძინებელი"        → bedroom  (>= 9 m²)
;;   "აბაზანა"            → bath    (>= 3.3 m²)
;;   "WC"                 → wc      (>= 1.0 m²)
;;
;; Output: room-validation.json + console summary.

(vl-load-com)

(setq *minima*
  '(("living" . 16.0)
    ("kitchen" . 6.0)
    ("master"  . 12.0)
    ("bedroom" . 9.0)
    ("bath"    . 3.3)
    ("wc"      . 1.0)))

(defun cv:type-of (label / u)
  (setq u (strcase label))
  (cond
    ((wcmatch u "*მისაღებ*")          "living")
    ((wcmatch u "*LIVING*")            "living")
    ((wcmatch u "*სამზარ*")            "kitchen")
    ((wcmatch u "*KITCHEN*")           "kitchen")
    ((wcmatch u "*მთავარი*")          "master")
    ((wcmatch u "*MASTER*")            "master")
    ((wcmatch u "*საძინ*")             "bedroom")
    ((wcmatch u "*BEDROOM*")           "bedroom")
    ((wcmatch u "*აბაზან*")           "bath")
    ((wcmatch u "*BATH*")              "bath")
    ((wcmatch u "*WC*")                "wc")
    (t nil)))

(defun cv:area (e / o a)
  (setq o (vlax-ename->vla-object e))
  (setq a (vl-catch-all-apply 'vlax-curve-getarea (list o)))
  (if (vl-catch-all-error-p a) 0.0 (/ a 1000000.0)))

(defun cv:strip-mtext (s)
  (vl-string-translate "{}" "  "
    (vl-string-subst "" "\\fSylfaen|b0|i0;" s)))

(defun cv:nearest-label (cx cy / ss best d dist e ed)
  (setq best "" dist 999999.0)
  (setq ss (ssget "_X" '((0 . "MTEXT,TEXT"))))
  (if ss
    (foreach e (mapcar '(lambda (i) (ssname ss i))
                       (n-list (sslength ss)))
      (setq ed (entget e))
      (setq p (cdr (assoc 10 ed)))
      (setq d (distance (list cx cy 0.0) p))
      (if (and (< d 5000.0) (< d dist))
        (progn (setq dist d)
               (setq best (cdr (assoc 1 ed)))))))
  (cv:strip-mtext best))

(defun n-list (n / r) (setq r '()) (repeat n (setq r (cons (1- (length r)) r))) (reverse r))

(defun c:CheckMinRooms ( / ss n i e ed area lo hi cx cy lbl rt minA pass fp report)
  (setq report '() pass 0 fail 0)
  (setq ss (ssget "_X" '((0 . "LWPOLYLINE") (-4 . "&") (70 . 1))))
  (if ss
    (progn
      (setq n (sslength ss) i 0)
      (while (< i n)
        (setq e (ssname ss i))
        (setq area (cv:area e))
        (setq lo (vlax-3d-point '(0 0 0)) hi (vlax-3d-point '(0 0 0)))
        (vla-getboundingbox (vlax-ename->vla-object e) 'lo 'hi)
        (setq cx (/ (+ (car (vlax-safearray->list (vlax-variant-value lo)))
                       (car (vlax-safearray->list (vlax-variant-value hi)))) 2.0))
        (setq cy (/ (+ (cadr (vlax-safearray->list (vlax-variant-value lo)))
                       (cadr (vlax-safearray->list (vlax-variant-value hi)))) 2.0))
        (setq lbl (cv:nearest-label cx cy))
        (setq rt  (cv:type-of lbl))
        (if rt
          (progn
            (setq minA (cdr (assoc rt *minima*)))
            (setq passOk (>= area minA))
            (setq report (cons (list rt lbl area minA passOk) report))
            (if passOk (setq pass (1+ pass)) (setq fail (1+ fail)))))
        (setq i (1+ i)))))

  (setq fp (open "C:/Users/PCZONE.GE/autocad-mcp/room-validation.json" "w"))
  (write-line "{" fp)
  (write-line (strcat "  \"pass\": " (itoa pass) ",") fp)
  (write-line (strcat "  \"fail\": " (itoa fail) ",") fp)
  (write-line "  \"items\": [" fp)
  (foreach r (reverse report)
    (write-line (strcat "    { \"type\":\"" (car r)
                        "\", \"label\":\"" (cadr r)
                        "\", \"area\":" (rtos (caddr r) 2 2)
                        ", \"min\":"   (rtos (cadddr r) 2 2)
                        ", \"pass\":"  (if (nth 4 r) "true" "false") " },") fp))
  (write-line "  ]" fp)
  (write-line "}" fp)
  (close fp)

  (princ (strcat "\n[check-min-rooms] pass=" (itoa pass) " fail=" (itoa fail)
                 " (room-validation.json)\n"))
  (princ))

(princ "\n[check-min-rooms] loaded — run (c:CheckMinRooms)\n")
(princ)
