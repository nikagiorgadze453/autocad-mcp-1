;; uni-dump.lsp
;; Dumps a structured analysis of the active drawing to a JSON file.
;; Invoked headlessly via accoreconsole.exe:
;;   accoreconsole -i "UNI B1.dwg" -s "scripts/utilities/uni-dump.scr"
;; Output: <DWG dir>/<DWG basename>.uni-dump.json

(vl-load-com)

(defun json-esc (s / r i c)
  (if (null s) (setq s ""))
  (setq r "")
  (setq i 1)
  (while (<= i (strlen s))
    (setq c (substr s i 1))
    (cond
      ((= c "\\") (setq r (strcat r "\\\\")))
      ((= c "\"") (setq r (strcat r "\\\"")))
      ((= c "\n") (setq r (strcat r "\\n")))
      ((= c "\r") (setq r (strcat r "\\r")))
      ((= c "\t") (setq r (strcat r "\\t")))
      (T (setq r (strcat r c))))
    (setq i (1+ i)))
  r)

(defun rtos3 (x)
  (if (numberp x) (rtos x 2 3) "0"))

(defun pt2json (p)
  (if (and p (listp p) (>= (length p) 2))
    (strcat "["
            (rtos3 (car p)) ","
            (rtos3 (cadr p)) ","
            (rtos3 (if (>= (length p) 3) (caddr p) 0.0)) "]")
    "[0,0,0]"))

;; -------- layers --------
(defun gather-layers ( / out e n)
  (setq out '())
  (setq e (tblnext "LAYER" T))
  (while e
    (setq n (cdr (assoc 2 e)))
    (setq out (cons
      (strcat "{\"name\":\"" (json-esc n)
              "\",\"color\":" (itoa (cond ((cdr (assoc 62 e))) (T 7)))
              ",\"linetype\":\"" (json-esc (cond ((cdr (assoc 6 e))) (T ""))) "\"}")
      out))
    (setq e (tblnext "LAYER" nil)))
  (reverse out))

;; -------- block defs --------
(defun gather-blocks ( / out e n)
  (setq out '())
  (setq e (tblnext "BLOCK" T))
  (while e
    (setq n (cdr (assoc 2 e)))
    (if (and n (/= (substr n 1 1) "*"))
      (setq out (cons (strcat "\"" (json-esc n) "\"") out)))
    (setq e (tblnext "BLOCK" nil)))
  (reverse out))

;; -------- text style table --------
(defun gather-styles ( / out e n f)
  (setq out '())
  (setq e (tblnext "STYLE" T))
  (while e
    (setq n (cdr (assoc 2 e)))
    (setq f (cdr (assoc 3 e)))
    (setq out (cons
      (strcat "{\"name\":\"" (json-esc n)
              "\",\"font\":\"" (json-esc (cond (f) (T ""))) "\"}")
      out))
    (setq e (tblnext "STYLE" nil)))
  (reverse out))

;; -------- per-entity processing --------
;; mutate global lists declared in gather-modelspace
(defun proc-entity (e / ed kind layer area cnt)
  (setq ed (entget e))
  (setq kind (cdr (assoc 0 ed)))
  (setq layer (cond ((cdr (assoc 8 ed))) (T "")))

  ;; count by kind+layer
  (setq cnt (assoc (cons kind layer) *counts*))
  (if cnt
    (setq *counts* (subst (cons (car cnt) (1+ (cdr cnt))) cnt *counts*))
    (setq *counts* (cons (cons (cons kind layer) 1) *counts*)))

  (cond
    ;; closed LWPOLYLINE -> area
    ((and (= kind "LWPOLYLINE")
          (assoc 70 ed)
          (cdr (assoc 70 ed))
          (= 1 (logand 1 (cdr (assoc 70 ed)))))
     (setq area (vl-catch-all-apply
                 'vlax-curve-getarea
                 (list (vlax-ename->vla-object e))))
     (if (and (numberp area) (> area 1.0))
       (setq *poly-areas*
             (cons (strcat "{\"layer\":\"" (json-esc layer)
                           "\",\"area_mm2\":" (rtos3 area)
                           ",\"handle\":\"" (json-esc (cdr (assoc 5 ed))) "\"}")
                   *poly-areas*))))

    ;; MText
    ((= kind "MTEXT")
     (setq *mtext-list*
           (cons (strcat "{\"layer\":\"" (json-esc layer)
                         "\",\"insert\":" (pt2json (cdr (assoc 10 ed)))
                         ",\"style\":\"" (json-esc (cond ((cdr (assoc 7 ed))) (T "")))
                         "\",\"text\":\""
                         (json-esc (cond ((cdr (assoc 1 ed))) (T ""))) "\"}")
                 *mtext-list*)))

    ;; Single-line text (TEXT / DBText)
    ((= kind "TEXT")
     (setq *mtext-list*
           (cons (strcat "{\"layer\":\"" (json-esc layer)
                         "\",\"insert\":" (pt2json (cdr (assoc 10 ed)))
                         ",\"style\":\"" (json-esc (cond ((cdr (assoc 7 ed))) (T "")))
                         "\",\"text\":\""
                         (json-esc (cond ((cdr (assoc 1 ed))) (T ""))) "\"}")
                 *mtext-list*)))

    ;; Block insert
    ((= kind "INSERT")
     (setq *block-list*
           (cons (strcat "{\"layer\":\"" (json-esc layer)
                         "\",\"name\":\"" (json-esc (cond ((cdr (assoc 2 ed))) (T "")))
                         "\",\"insert\":" (pt2json (cdr (assoc 10 ed))) "}")
                 *block-list*)))

    ;; Dimension
    ((= kind "DIMENSION")
     (if (assoc 42 ed)
       (setq *dim-list*
             (cons (strcat "{\"layer\":\"" (json-esc layer)
                           "\",\"measurement\":" (rtos3 (cdr (assoc 42 ed))) "}")
                   *dim-list*)))))
  T)

(defun gather-modelspace ( / ss i e err)
  (setq *counts* '())
  (setq *poly-areas* '())
  (setq *mtext-list* '())
  (setq *block-list* '())
  (setq *dim-list* '())
  (setq ss (ssget "_X" '((410 . "Model"))))
  (if ss
    (progn
      (setq i 0)
      (while (< i (sslength ss))
        (setq e (ssname ss i))
        (setq err (vl-catch-all-apply 'proc-entity (list e)))
        ;; ignore per-entity errors silently
        (setq i (1+ i)))))
  (list *counts* *poly-areas* *mtext-list* *block-list* *dim-list*))

(defun count-list->json (counts / out)
  (setq out '())
  (foreach c counts
    (setq out (cons (strcat "{\"kind\":\"" (json-esc (caar c))
                            "\",\"layer\":\"" (json-esc (cdar c))
                            "\",\"count\":" (itoa (cdr c)) "}")
                    out)))
  (reverse out))

;; Write list of pre-formatted JSON object strings as a JSON array
;; (last comma stripped by appending "null" then ignoring it — simple and robust)
(defun write-arr (fp items)
  (foreach s items
    (write-line (strcat "    " s ",") fp))
  (write-line "    null" fp))

(defun write-dump ( / outpath data layers blocks styles
                     counts poly-areas mtext-list block-list dim-list
                     ext-min ext-max fp)
  (setq layers (gather-layers))
  (setq blocks (gather-blocks))
  (setq styles (gather-styles))
  (setq data (gather-modelspace))
  (setq counts     (nth 0 data))
  (setq poly-areas (nth 1 data))
  (setq mtext-list (nth 2 data))
  (setq block-list (nth 3 data))
  (setq dim-list   (nth 4 data))

  (setq ext-min (getvar "EXTMIN"))
  (setq ext-max (getvar "EXTMAX"))

  (setq outpath
        (strcat (getvar "DWGPREFIX")
                (vl-filename-base (getvar "DWGNAME"))
                ".uni-dump.json"))
  (setq fp (open outpath "w"))
  (write-line "{" fp)
  (write-line (strcat "  \"file\": \"" (json-esc (getvar "DWGNAME")) "\",") fp)
  (write-line (strcat "  \"prefix\": \"" (json-esc (getvar "DWGPREFIX")) "\",") fp)
  (write-line (strcat "  \"units_insunits\": " (itoa (getvar "INSUNITS")) ",") fp)
  (write-line (strcat "  \"extents_min\": " (pt2json ext-min) ",") fp)
  (write-line (strcat "  \"extents_max\": " (pt2json ext-max) ",") fp)
  (write-line "  \"layers\": [" fp) (write-arr fp layers)        (write-line "  ]," fp)
  (write-line "  \"blocks\": [" fp) (write-arr fp blocks)         (write-line "  ]," fp)
  (write-line "  \"styles\": [" fp) (write-arr fp styles)         (write-line "  ]," fp)
  (write-line "  \"entity_counts\": [" fp) (write-arr fp (count-list->json counts)) (write-line "  ]," fp)
  (write-line "  \"closed_polys\": [" fp)  (write-arr fp poly-areas) (write-line "  ]," fp)
  (write-line "  \"texts\": [" fp)         (write-arr fp mtext-list) (write-line "  ]," fp)
  (write-line "  \"inserts\": [" fp)       (write-arr fp block-list) (write-line "  ]," fp)
  (write-line "  \"dimensions\": [" fp)    (write-arr fp dim-list)   (write-line "  ]" fp)
  (write-line "}" fp)
  (close fp)
  (princ (strcat "\nDUMP_WRITTEN: " outpath)))

(write-dump)
(princ)
