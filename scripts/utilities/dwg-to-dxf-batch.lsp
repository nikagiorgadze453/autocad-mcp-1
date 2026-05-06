;; dwg-to-dxf-batch.lsp
;; Convert .dwg files to .dxf using AutoCAD itself (no ODA File Converter
;; required). After conversion the DXFs can be fed to the headless tools
;; under scripts/python/ (ezdxf_batch.py, cad_to_gis.py).
;;
;; Usage from inside an open AutoCAD:
;;   (load "C:/Users/PCZONE.GE/autocad-mcp/scripts/utilities/dwg-to-dxf-batch.lsp")
;;
;;   ;; convert the active drawing only (most common):
;;   (c:DwgToDxf)
;;
;;   ;; convert every DWG in a folder (no recursion):
;;   (c:DwgToDxfFolder "C:/.../03_xref_saproeqto/")
;;
;;   ;; convert recursively:
;;   (c:DwgToDxfFolderR "C:/.../wetransfer_19_xref_grg_2026-04-29_1051/")
;;
;; Output: alongside each .dwg, a .dxf with the same stem.
;; Existing .dxf files are overwritten without prompt.

(vl-load-com)

(defun d2d:to-dxf-name (dwg)
  (strcat (vl-filename-base dwg) ".dxf"))

(defun d2d:save-active-as-dxf (out / saveDir base)
  (setq saveDir (vl-string-translate "\\" "/" (getvar "DWGPREFIX")))
  (setq base    (strcat saveDir (vl-filename-base (getvar "DWGNAME")) ".dxf"))
  (setq out     (if out out base))
  ;; SAVEAS to DXF, AutoCAD 2018 format, decimal precision 6
  (command "_.SAVEAS" "DXF" "_V" "2018" "16" "_Y" out)
  (princ (strcat "\n[dwg-to-dxf] active -> " out))
  out)

(defun c:DwgToDxf ( / )
  (d2d:save-active-as-dxf nil)
  (princ))

(defun d2d:script-path () "C:/Users/PCZONE.GE/autocad-mcp/temp/_dwg2dxf.scr")

(defun d2d:write-script (dwgs / fp out)
  ;; build a SCR file that opens each DWG and DXFOUTs it, then closes
  (setq fp (open (d2d:script-path) "w"))
  (foreach d dwgs
    (setq out (strcat (vl-filename-directory d) "/" (d2d:to-dxf-name d)))
    (write-line (strcat "OPEN \""    d   "\"") fp)
    (write-line (strcat "DXFOUT \"" out "\" V 2018 16 Y") fp)
    (write-line "CLOSE Y" fp))
  (close fp)
  (d2d:script-path))

(defun d2d:list-dwgs (folder recurse / fs files)
  (setq folder (vl-string-translate "\\" "/" folder))
  (if (not (vl-string-search "/" (substr folder (- (strlen folder) 1))))
    (setq folder (strcat folder "/")))
  (setq files (vl-directory-files folder "*.dwg" 1))
  (setq files (mapcar '(lambda (f) (strcat folder f)) files))
  (if recurse
    (foreach sub (vl-directory-files folder nil -1)
      (if (and sub (/= sub ".") (/= sub ".."))
        (setq files (append files
                            (d2d:list-dwgs (strcat folder sub) recurse))))))
  files)

(defun c:DwgToDxfFolder (folder / dwgs scr)
  (setq dwgs (d2d:list-dwgs folder nil))
  (princ (strcat "\n[dwg-to-dxf] " (itoa (length dwgs)) " files in " folder))
  (if dwgs
    (progn
      (setq scr (d2d:write-script dwgs))
      (princ (strcat "\n[dwg-to-dxf] script written to " scr))
      (princ "\n  → run it from a fresh AutoCAD via:")
      (princ (strcat "\n      (command \"_.SCRIPT\" \"" scr "\")"))
      (princ "\n  Or load this file and call (c:DwgToDxf) per drawing.\n")))
  (princ))

(defun c:DwgToDxfFolderR (folder / dwgs scr)
  (setq dwgs (d2d:list-dwgs folder t))
  (princ (strcat "\n[dwg-to-dxf] " (itoa (length dwgs))
                 " files (recursive) in " folder))
  (if dwgs
    (progn
      (setq scr (d2d:write-script dwgs))
      (princ (strcat "\n[dwg-to-dxf] script written to " scr))
      (princ "\n  → run it from a fresh AutoCAD via:")
      (princ (strcat "\n      (command \"_.SCRIPT\" \"" scr "\")\n"))))
  (princ))

(princ "\n[dwg-to-dxf-batch] commands:")
(princ "\n  (c:DwgToDxf)            — convert active drawing")
(princ "\n  (c:DwgToDxfFolder p)    — list+script a flat folder")
(princ "\n  (c:DwgToDxfFolderR p)   — list+script recursively")
(princ)
