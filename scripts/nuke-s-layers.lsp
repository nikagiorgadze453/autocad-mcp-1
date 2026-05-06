;; nuke-s-layers.lsp
;; Hard-erase every modelspace entity whose layer starts with "S-"
;; Uses entdel directly (no command-line ERASE) so it can't get blocked.

(setvar "CMDECHO" 0)
(setq fp (open "C:/Users/PCZONE.GE/autocad-mcp/nuke-result.txt" "w"))

(setq ss (ssget "_X"))
(setq killed 0 kept 0 misc 0)
(if ss
  (progn
    (setq i 0)
    (while (< i (sslength ss))
      (setq e (ssname ss i))
      (setq la (cdr (assoc 8 (entget e))))
      (if (and la (= (substr la 1 2) "S-"))
        (progn
          (entdel e)
          (setq killed (1+ killed))
        )
        (setq kept (1+ kept))
      )
      (setq i (1+ i))
    )
  )
)
(write-line (strcat "killed=" (itoa killed) "  kept=" (itoa kept)) fp)

;; second pass: list what's left
(setq ss (ssget "_X"))
(if ss
  (progn
    (setq i 0)
    (while (< i (sslength ss))
      (setq e (ssname ss i))
      (setq ed (entget e))
      (write-line (strcat "  remain " (itoa i) " "
                          (cdr (assoc 0 ed)) " layer="
                          (cdr (assoc 8 ed))) fp)
      (setq i (1+ i))
    )
  )
)
(close fp)
(princ "\n[nuke-s-layers] done")
(princ)
