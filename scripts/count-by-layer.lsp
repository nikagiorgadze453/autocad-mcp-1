;; count-by-layer.lsp - report entity counts per S-* layer
(setq fp (open "C:/Users/PCZONE.GE/autocad-mcp/by-layer.txt" "w"))
(setq layers '("S-BLDG" "S-ROAD" "S-ROAD-LINE" "S-PARKING" "S-PARK-NUM"
               "S-SIDEWALK" "S-TREE" "S-DIM" "S-TEXT" "S-TABLE"))
(foreach l layers
  (setq ss (ssget "_X" (list (cons 8 l))))
  (write-line
    (strcat l " : " (if ss (itoa (sslength ss)) "0"))
    fp)
)
(write-line (strcat "CMDNAMES=[" (getvar "CMDNAMES") "]") fp)
(write-line (strcat "CLAYER=" (getvar "CLAYER")) fp)
(close fp)
(princ "\n[count-by-layer] done")
(princ)
