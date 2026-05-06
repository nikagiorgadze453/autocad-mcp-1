;; steal-from-template.lsp
;; Thin wrapper around Lee Mac's Steal.lsp (https://www.lee-mac.com/steal.html).
;; Uses Steal to import blocks / layers / linetypes / dim+text styles /
;; layouts / page setups from a reference DWG into the active drawing.
;;
;; The vendored file lives at scripts/vendor/lee-mac/Steal.lsp.
;; It is NOT bundled with this repo for license reasons — see
;; scripts/vendor/README.md.
;;
;; Usage in AutoCAD:
;;   (load "C:/Users/PCZONE.GE/autocad-mcp/scripts/utilities/steal-from-template.lsp")
;;   (c:StealOurTemplate)         ; opens picker, default template = office reference
;;   (c:StealReferenceDwg "C:/Users/.../xref_zonireba.dwg")
;;
;; The reference DWG list defaults to our office library:
;;   - 03_xref_saproeqto/  (architectural xrefs)
;;   - 19_xref_grg/        (GRG xrefs)

(vl-load-com)

(setq *steal-vendor-path*
  "C:/Users/PCZONE.GE/autocad-mcp/scripts/vendor/lee-mac/Steal.lsp")

(setq *office-templates-saproeqto*
  "C:/Users/PCZONE.GE/Downloads/wetransfer_03_xref_saproeqto_2026-04-29_1038/03_xref_saproeqto/")

(setq *office-templates-grg*
  "C:/Users/PCZONE.GE/Downloads/wetransfer_19_xref_grg_2026-04-29_1051/19_xref_grg/")

(defun st:check-vendor ( / fp)
  (setq fp (open *steal-vendor-path* "r"))
  (if (null fp)
    (progn
      (alert (strcat
        "Steal.lsp not found at:\n"
        *steal-vendor-path*
        "\n\nDownload it from https://www.lee-mac.com/steal.html and "
        "place the file there. See scripts/vendor/README.md for "
        "step-by-step instructions."))
      nil)
    (progn (close fp) t)))

(defun st:load-steal ()
  (if (st:check-vendor)
    (progn
      (load *steal-vendor-path*)
      (princ "\n[steal-from-template] vendored Steal.lsp loaded\n")
      t)
    nil))

(defun c:StealOurTemplate ( / )
  ;; Interactive — pops the Lee Mac dialog so the user picks the source.
  (if (st:load-steal) (c:Steal)))

(defun c:StealReferenceDwg (path / )
  ;; Programmatic — pulls everything from the named DWG.
  (if (st:load-steal)
    (if (and path (findfile path))
      (progn
        ;; Lee Mac exposes c:StealLast which uses *steal:last as the source.
        ;; We set it directly so c:StealAll picks it up without the dialog.
        (setq *steal:last path)
        (c:StealAll))
      (alert (strcat "Reference DWG not found: " (vl-prin1-to-string path))))))

(defun c:StealZonireba ( / )
  (c:StealReferenceDwg (strcat *office-templates-grg* "xref_zonireba.dwg")))

(defun c:StealTopo ( / )
  (c:StealReferenceDwg (strcat *office-templates-saproeqto* "xref_topo.dwg")))

(defun c:StealCadastre ( / )
  (c:StealReferenceDwg (strcat *office-templates-saproeqto* "xref_sakutreba.dwg")))

(princ "\n[steal-from-template] commands:")
(princ "\n  (c:StealOurTemplate)         — interactive picker")
(princ "\n  (c:StealReferenceDwg path)   — bring everything in")
(princ "\n  (c:StealZonireba)            — bring zoning xref styles/layers")
(princ "\n  (c:StealTopo)                — topo xref styles/layers")
(princ "\n  (c:StealCadastre)            — cadastre xref styles/layers")
(princ)
