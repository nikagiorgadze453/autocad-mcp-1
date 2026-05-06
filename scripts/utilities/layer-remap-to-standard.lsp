;; layer-remap-to-standard.lsp
;; Migrates legacy Cyrillic / `_Pen_No__N` layer naming to the project
;; standard 11-layer set defined in `02-units-dims.mdc`.
;;
;; Usage:
;;   (load "C:/Users/PCZONE.GE/autocad-mcp/scripts/utilities/layer-remap-to-standard.lsp")
;;   (c:LayerRemap)
;;
;; Reports counts of moved entities to layer-remap-report.txt.

(vl-load-com)

(defun lr:upper (s) (strcase (vl-princ-to-string (if s s ""))))
(defun lr:matches (patterns name / u match)
  (setq u (lr:upper name) match nil)
  (foreach p patterns
    (if (wcmatch u p) (setq match t)))
  match)

(defun lr:target-layer (oldName / u)
  (setq u (lr:upper oldName))
  (cond
    ((lr:matches '("*WALL*" "*BEARING*" "*SHENOBEB*" "*KEDLEB*") u) "WALL")
    ((lr:matches '("*PARTITION*" "*TIXAR*" "*INNER*")            u) "WALL-INNER")
    ((lr:matches '("*DOOR*" "*KAR-*" "*KARI*")                   u) "DOOR")
    ((lr:matches '("*PANJAR*" "*WINDOW*" "*KAR-PANJARA*")        u) "WINDOW")
    ((lr:matches '("*FURNITURE*" "*INTERIOR*" "*AVEJI*")         u) "FURN")
    ((lr:matches '("*WC*" "*LAVABO*" "*SHOWER*" "*BIDET*"
                   "*PLUMB*" "*SVELI*")                          u) "FIX")
    ((lr:matches '("*GRID*" "*REG_NAK*" "*AXIS*" "*GERdZ*")      u) "GRID")
    ((lr:matches '("*BUBBLE*" "*AXIS-LABEL*")                    u) "AXIS-LABEL")
    ((lr:matches '("*ZOMA*" "*DIM*" "*COTA*")                    u) "DIM")
    ((lr:matches '("*TEXT*" "*ANNO*" "*ANNOTATION*"
                   "*WERWERA*")                                  u) "TEXT")
    ((lr:matches '("*TITLE*" "*FRAME*")                          u) "TITLE")
    ((lr:matches '("*SAKUTREB*" "*NAKVET*" "*NAVET*"
                   "*PARCEL*")                                   u) "PARCEL")
    ((lr:matches '("*TOPO*" "*GAZI*" "*SXIVEB*" "*MOMIJNAVE*")   u) nil) ; keep
    (t nil)))

(defun lr:ensure-layer (name / sn)
  (setq sn (tblsearch "LAYER" name))
  (if (not sn)
    (command "_.-LAYER" "_M" name "_C"
             (cond ((= name "WALL") "7") ((= name "WALL-INNER") "8")
                   ((= name "DOOR") "4") ((= name "WINDOW") "5")
                   ((= name "FURN") "3") ((= name "FIX") "6")
                   ((= name "GRID") "1") ((= name "AXIS-LABEL") "1")
                   ((= name "DIM") "2") ((= name "TEXT") "7")
                   ((= name "TITLE") "7") ((= name "PARCEL") "30")
                   (t "7"))
             "" "")))

(defun c:LayerRemap ( / fp ss n i e ed la newLa moved keptOld)
  (setq fp (open "C:/Users/PCZONE.GE/autocad-mcp/layer-remap-report.txt" "w"))
  (write-line "[layer-remap] starting" fp)
  (write-line (strcat "DWG=" (getvar "DWGNAME")) fp)

  ;; ensure all standard layers exist
  (foreach s '("WALL" "WALL-INNER" "DOOR" "WINDOW" "FURN" "FIX"
               "GRID" "AXIS-LABEL" "DIM" "TEXT" "TITLE" "PARCEL")
    (lr:ensure-layer s))

  (setq moved 0 keptOld 0)
  (setq ss (ssget "_X"))
  (if ss
    (progn
      (setq n (sslength ss) i 0)
      (while (< i n)
        (setq e (ssname ss i))
        (setq ed (entget e))
        (setq la (cdr (assoc 8 ed)))
        (setq newLa (lr:target-layer la))
        (cond
          ((null newLa) (setq keptOld (1+ keptOld)))
          ((/= la newLa)
            (entmod (subst (cons 8 newLa) (assoc 8 ed) ed))
            (write-line (strcat la " -> " newLa) fp)
            (setq moved (1+ moved))))
        (setq i (1+ i)))))

  (write-line (strcat "MOVED=" (itoa moved)) fp)
  (write-line (strcat "KEPT=" (itoa keptOld)) fp)
  (close fp)

  (princ (strcat "\n[layer-remap] moved=" (itoa moved)
                 "  kept=" (itoa keptOld)
                 "  report at C:/Users/PCZONE.GE/autocad-mcp/layer-remap-report.txt\n"))
  (princ))

(princ "\n[layer-remap] loaded — run (c:LayerRemap) to migrate.\n")
(princ)
