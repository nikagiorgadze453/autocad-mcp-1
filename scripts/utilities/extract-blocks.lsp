;; extract-blocks.lsp
;; Iterates the BlockTable of the open DWG, exports each
;; user block (not anonymous, not layout, not xref) to a stand-alone
;; .dwg in `<out-dir>/<safe-name>.dwg`, and writes an index.json
;; with name, source layer-occurrence stats, and bounding-box size.
;;
;; Headless call:
;;   accoreconsole /i "UNI B2.dwg" /s extract-blocks.scr
;;
;; Out dir is taken from env var `UNI_BLOCKS_OUT` (Set with
;; `set UNI_BLOCKS_OUT=C:/path/blocks` before launching accoreconsole).
;; Falls back to `<dwg dir>/blocks-extracted` if env is empty.

(vl-load-com)

(defun safe-fname (s / r i c code)
  (setq r "" i 1)
  (while (<= i (strlen s))
    (setq c (substr s i 1) code (ascii c))
    (cond
      ((or (and (>= code 48) (<= code 57))
           (and (>= code 65) (<= code 90))
           (and (>= code 97) (<= code 122))
           (= c "-") (= c "_") (= c "."))
       (setq r (strcat r c)))
      ((or (= c " ") (= c "/") (= c "\\") (= c ":") (= c "*")
           (= c "?") (= c "\"") (= c "<") (= c ">") (= c "|"))
       (setq r (strcat r "_")))
      ((< code 128) (setq r (strcat r "_")))
      (T (setq r (strcat r (strcat "u" (itoa code))))))
    (setq i (1+ i)))
  r)

(defun json-esc (s / r i c)
  (if (null s) (setq s ""))
  (setq r "" i 1)
  (while (<= i (strlen s))
    (setq c (substr s i 1))
    (cond
      ((= c "\\") (setq r (strcat r "\\\\")))
      ((= c "\"") (setq r (strcat r "\\\"")))
      ((= c "\n") (setq r (strcat r "\\n")))
      ((< (ascii c) 32) (setq r (strcat r " ")))
      (T (setq r (strcat r c))))
    (setq i (1+ i)))
  r)

(defun n3 (x) (if (numberp x) (rtos x 2 3) "0"))

(defun get-out-dir ( / d)
  (setq d (getenv "UNI_BLOCKS_OUT"))
  (if (or (null d) (= d "")) (setq d (strcat (getvar "DWGPREFIX") "blocks-extracted")))
  (vl-mkdir d)
  d)

(defun bbox-of (e / o lo hi lo-l hi-l)
  (vl-catch-all-apply
    '(lambda ()
       (setq o (vlax-ename->vla-object e))
       (setq lo (vlax-3d-point '(0 0 0)) hi (vlax-3d-point '(0 0 0)))
       (vla-getboundingbox o 'lo 'hi)
       (setq lo-l (vlax-safearray->list (vlax-variant-value lo)))
       (setq hi-l (vlax-safearray->list (vlax-variant-value hi)))
       (list lo-l hi-l))))

(defun count-inserts ( / counts ss i e name old)
  (setq counts '())
  (setq ss (ssget "_X" '((0 . "INSERT"))))
  (if ss
    (progn
      (setq i 0)
      (while (< i (sslength ss))
        (setq e (ssname ss i))
        (setq name (cdr (assoc 2 (entget e))))
        (setq old (assoc name counts))
        (if old
          (setq counts (subst (cons name (1+ (cdr old))) old counts))
          (setq counts (cons (cons name 1) counts)))
        (setq i (1+ i)))))
  counts)

(defun c:extract-blocks ( / out-dir doc blocks blk name flags fp records n
                            insert-counts inserts bsafe outpath result
                            okcount skipcount idxpath)
  (setq out-dir (get-out-dir))
  (princ (strcat "\nOUT_DIR: " out-dir))

  (setq insert-counts (count-inserts))
  (princ (strcat "\nINSERT types: " (itoa (length insert-counts))))

  ;; Use tblnext (works headless in accoreconsole)
  (setq records '() okcount 0 skipcount 0 n 0)
  (setq blkrec (tblnext "BLOCK" T))
  (while blkrec
    (setq n (1+ n))
    (setq name (cdr (assoc 2 blkrec)))
    (setq flag (cdr (assoc 70 blkrec)))
    ;; bit values per DXF spec:
    ;;  1  Anonymous
    ;;  4  Xref
    ;;  8  Xref overlay
    ;; 16  Xref-dependent
    ;; 32  Xref re-referenced
    ;; 64  Externally referenced layer
    (setq is-anon  (and flag (= 1 (logand 1  flag))))
    (setq is-xref  (and flag (or (= 4  (logand 4  flag))
                                  (= 16 (logand 16 flag)))))
    (setq is-layout (and name (or (= (strcase name) "*PAPER_SPACE")
                                  (vl-string-search "*Paper_Space" name)
                                  (vl-string-search "*Model_Space" name))))
    ;; dynamic-block anonymous instances start with `*U` or `A$C`
    (setq is-dyn-inst
      (and name
           (or (and (>= (strlen name) 3) (= (substr name 1 3) "A$C"))
               (and (>= (strlen name) 2) (= (substr name 1 2) "*U")))))
    (setq inserts (cond ((cdr (assoc name insert-counts))) (T 0)))
    (cond
      ((or is-anon is-xref is-layout is-dyn-inst (= inserts 0))
       (setq skipcount (1+ skipcount)))
      (T
       (setq bsafe (safe-fname name))
       (setq outpath (strcat out-dir "/" bsafe ".dwg"))
       (princ (strcat "\n[" (itoa (1+ okcount)) "] "
                      name " (" (itoa inserts) "x) -> " bsafe ".dwg"))
       (setq result
         (vl-catch-all-apply
           '(lambda ()
              (if (findfile outpath) (vl-file-delete outpath))
              (command "_.-WBLOCK" outpath name))))
       (if (vl-catch-all-error-p result)
         (progn
           (princ (strcat "\n  WBLOCK FAILED: "
                          (vl-catch-all-error-message result)))
           (setq skipcount (1+ skipcount)))
         (progn
           (setq records
             (cons (strcat "{"
                           "\"name\":\""    (json-esc name) "\","
                           "\"file\":\""    (json-esc (strcat bsafe ".dwg")) "\","
                           "\"inserts\":"   (itoa inserts) "}")
                   records))
           (setq okcount (1+ okcount))))))
    (setq blkrec (tblnext "BLOCK" nil)))

  (setq idxpath (strcat out-dir "/index.json"))
  (setq fp (open idxpath "w"))
  (write-line "{" fp)
  (write-line (strcat "  \"source\": \"" (json-esc (getvar "DWGNAME")) "\",") fp)
  (write-line (strcat "  \"out_dir\": \"" (json-esc out-dir) "\",") fp)
  (write-line (strcat "  \"exported\": " (itoa okcount) ",") fp)
  (write-line (strcat "  \"skipped\":  " (itoa skipcount) ",") fp)
  (write-line "  \"blocks\": [" fp)
  (foreach r (reverse records) (write-line (strcat "    " r ",") fp))
  (write-line "    null" fp)
  (write-line "  ]" fp)
  (write-line "}" fp)
  (close fp)
  (princ (strcat "\nBLOCKS_DONE: exported=" (itoa okcount)
                 " skipped=" (itoa skipcount)
                 " index=" idxpath))
  (princ))

(c:extract-blocks)
(princ)
