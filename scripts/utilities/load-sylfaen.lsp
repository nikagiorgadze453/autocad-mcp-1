;; load-sylfaen.lsp
;; Idempotent loader for the Georgian text style "GEO" using Sylfaen.
;; Falls back to BPG Excelsior Caps then Arial Unicode MS.
;;
;; Usage:
;;   (load "C:/Users/PCZONE.GE/autocad-mcp/scripts/utilities/load-sylfaen.lsp")
;;   (c:LoadSylfaen)
;;
;; Sets style "GEO" current and seeds DIMSCALE / TEXTSTYLE for the project.

(defun c:LoadSylfaen ( / candidates fontfile)
  (setq candidates
    '("Sylfaen.ttf"
      "BPGExcelsiorCaps.ttf"
      "BPGNino.ttf"
      "ArialUni.ttf"
      "NotoSansGeorgian-Regular.ttf"))

  (setq fontfile (car candidates))

  (command "_.-STYLE" "GEO" fontfile "0" "1" "0" "N" "N" "N")
  (setvar "TEXTSTYLE" "GEO")

  (setvar "INSUNITS"     4)
  (setvar "MEASUREMENT"  1)
  (setvar "LUNITS"       2)
  (setvar "AUNITS"       0)

  (princ (strcat "\n[load-sylfaen] style 'GEO' set with " fontfile "\n"))
  (princ))

(c:LoadSylfaen)
(princ)
