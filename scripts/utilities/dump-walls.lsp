;; dump-walls.lsp v2
;; Dumps ALL LINE / LWPOLYLINE / POLYLINE / ARC entities + every TEXT/MTEXT
;; to <dwg>.walls.json. Python (polygonize_rooms.py) does the filtering,
;; polygonisation and label matching where we have proper Unicode.

(vl-load-com)
(setq *debug* T)

(defun has-utf8-mb (s / i n found)
  ;; returns T if string contains any byte >= 0xC0 (start of UTF-8 multi-byte seq)
  (if (null s) nil
    (progn
      (setq i 1 n (strlen s) found nil)
      (while (and (<= i n) (null found))
        (if (>= (ascii (substr s i 1)) 192) (setq found T))
        (setq i (1+ i)))
      found)))

(defun json-esc (s / r i c code)
  (if (null s) (setq s ""))
  (setq r "" i 1)
  (while (<= i (strlen s))
    (setq c (substr s i 1))
    (setq code (ascii c))
    (cond
      ((= c "\\") (setq r (strcat r "\\\\")))
      ((= c "\"") (setq r (strcat r "\\\"")))
      ((= c "\n") (setq r (strcat r "\\n")))
      ((= c "\r") (setq r (strcat r "\\r")))
      ((= c "\t") (setq r (strcat r "\\t")))
      ((and (>= code 0) (< code 32)) (setq r (strcat r " ")))
      (T (setq r (strcat r c))))
    (setq i (1+ i)))
  r)

(defun n3 (x) (if (numberp x) (rtos x 2 3) "0"))
(defun pt2 (p) (strcat "[" (n3 (car p)) "," (n3 (cadr p)) "]"))

(defun segs-from-poly (e / ed pts closed-flag flag closed segs i p1 p2)
  (setq ed (entget e))
  ;; gather all (10 . (x y ...)) pairs in order
  (setq pts '())
  (foreach pair ed
    (if (= (car pair) 10) (setq pts (cons (cdr pair) pts))))
  (setq pts (reverse pts))
  ;; closed flag is dxf 70 bitmask
  (setq flag (cdr (assoc 70 ed)))
  (setq closed (and flag (= 1 (logand 1 flag))))
  (setq segs '())
  (setq i 0)
  (while (< i (1- (length pts)))
    (setq p1 (nth i pts) p2 (nth (1+ i) pts))
    (setq segs (cons (list p1 p2) segs))
    (setq i (1+ i)))
  (if (and closed (> (length pts) 1))
    (setq segs (cons (list (last pts) (car pts)) segs)))
  segs)

(defun c:dump-walls ( / ss i e ed n out-l out-p out-t outpath fp
                       lcount pcount tcount layer p1 p2 segs tstr)
  (setq out-l '() out-p '() out-t '() lcount 0 pcount 0 tcount 0)

  ;; LINES
  (setq ss (ssget "_X" '((0 . "LINE"))))
  (if ss
    (progn
      (setq i 0 n (sslength ss))
      (princ (strcat "\nLINE pass: " (itoa n)))
      (while (< i n)
        (setq e (ssname ss i) ed (entget e))
        (setq layer (cdr (assoc 8 ed)))
        (setq p1 (cdr (assoc 10 ed)))
        (setq p2 (cdr (assoc 11 ed)))
        (setq out-l
          (cons (strcat "{\"a\":" (pt2 p1)
                        ",\"b\":" (pt2 p2)
                        ",\"l\":\"" (json-esc layer) "\"}")
                out-l))
        (setq lcount (1+ lcount))
        (setq i (1+ i)))))

  ;; LWPOLYLINE
  (setq ss (ssget "_X" '((0 . "LWPOLYLINE"))))
  (if ss
    (progn
      (setq i 0 n (sslength ss))
      (princ (strcat "\nLWPOLY pass: " (itoa n)))
      (while (< i n)
        (setq e (ssname ss i) ed (entget e))
        (setq layer (cdr (assoc 8 ed)))
        (setq segs (segs-from-poly e))
        (foreach s segs
          (setq out-l
            (cons (strcat "{\"a\":" (pt2 (car s))
                          ",\"b\":" (pt2 (cadr s))
                          ",\"l\":\"" (json-esc layer) "\"}")
                  out-l))
          (setq pcount (1+ pcount)))
        (setq i (1+ i)))))

  ;; TEXT / MTEXT
  (setq ss (ssget "_X" '((0 . "MTEXT,TEXT"))))
  (if ss
    (progn
      (setq i 0 n (sslength ss))
      (princ (strcat "\nTEXT pass: " (itoa n)))
      (while (< i n)
        (setq e (ssname ss i) ed (entget e))
        (setq tstr (cond ((cdr (assoc 1 ed))) (T "")))
        (setq layer (cdr (assoc 8 ed)))
        (if (and (> (strlen tstr) 0) (<= (strlen tstr) 400))
          (progn
            (setq out-t
              (cons (strcat "{\"t\":\"" (json-esc tstr) "\","
                            "\"p\":" (pt2 (cdr (assoc 10 ed))) ","
                            "\"l\":\"" (json-esc layer) "\","
                            "\"u\":" (if (has-utf8-mb tstr) "1" "0") "}")
                    out-t))
            (setq tcount (1+ tcount))))
        (setq i (1+ i)))))

  (setq outpath
        (strcat (getvar "DWGPREFIX")
                (vl-filename-base (getvar "DWGNAME"))
                ".walls.json"))
  (setq fp (open outpath "w"))
  (write-line "{" fp)
  (write-line (strcat "  \"file\": \"" (json-esc (getvar "DWGNAME")) "\",") fp)
  (write-line (strcat "  \"lines_from_LINE\": " (itoa lcount) ",") fp)
  (write-line (strcat "  \"segments_from_LWPOLY\": " (itoa pcount) ",") fp)
  (write-line (strcat "  \"texts\": " (itoa tcount) ",") fp)
  (write-line "  \"lines\": [" fp)
  (foreach r (reverse out-l) (write-line (strcat "    " r ",") fp))
  (write-line "    null" fp)
  (write-line "  ]," fp)
  (write-line "  \"texts\": [" fp)
  (foreach r (reverse out-t) (write-line (strcat "    " r ",") fp))
  (write-line "    null" fp)
  (write-line "  ]" fp)
  (write-line "}" fp)
  (close fp)
  (princ (strcat "\nWALLS_WRITTEN: " outpath
                 "  L=" (itoa lcount) " LWP=" (itoa pcount)
                 " T=" (itoa tcount)))
  (princ))

(c:dump-walls)
(princ)
