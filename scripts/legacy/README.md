# scripts/legacy/

Historical one-off Node.js scripts used during the project's early
exploration phase. **Not loaded by the MCP server**, **not part of the
shareable office toolkit**. Preserved in version control because they
contain useful patterns and concrete examples of how to talk to AutoCAD
through the plugin from Node.

## What's here

| File | What it did (historically) |
|---|---|
| `add_12_flats_table.cjs` | Insert a 12-flat summary table into the GRG sheet |
| `add_best_current_roads.cjs` | Overlay best-current road network |
| `add_grg_sheet_block.cjs` | Add the standard GRG title block |
| `analyze_stage.cjs` | First-gen stage analyzer (superseded by `analyze_v3.cjs`) |
| `analyze_stage_deep.cjs` | Deep-stage analyzer, intermediate version |
| `analyze_v2.cjs` | Second-gen analyzer (superseded) |
| `build_12_flats_plan.cjs` | Generate a 12-flat masterplan layout |
| `build_current_area_grg_masterplan.cjs` | Generate the GRG masterplan for the current parcel |
| `build_full_general_plan.cjs` | Full site-plan builder |
| `build_grg_red_masterplan.cjs` | Red-line GRG masterplan |
| `build_site_direct.cjs` | Direct site composition |
| `copy_reference_handles_from_dump.cjs` | Copy by entity handle from a deep dump |
| `demo_linkedin_recording.cjs` | LinkedIn demo recording driver |
| `draw_2bed.js`, `draw_house.js`, `draw_house_3d{,_v2}.js`, `draw_k44.js` | Early geometry generators (now superseded by the `draw-bina-b-type` skill + `scripts/templates/bina-b-type.lsp`) |
| `find_target.cjs` | Distance-to-target finder |
| `hide_generated_layers.cjs` | Hide auto-generated layers |
| `qsave_active_dwg.cjs` | Trigger QSAVE on the active drawing via the MCP plugin |
| `rebuild_best_current_grg_masterplan.cjs` | Rebuild the GRG masterplan |
| `send_georgian.js` | Send Georgian-encoded MText labels to AutoCAD (replaced by `\fSylfaen` rule 00 + Node helper inside MCP) |
| `send_parcel_labels.cjs` | Label parcel polygons |
| `send_site_labels.cjs` | Label site composition |
| `sweep_m2.cjs` | Exhaustive m² label sweep |
| `zoom_copied_target.cjs` | Zoom to a recently copied target entity |

## Current canonical replacements

| Old script | Use instead |
|---|---|
| draw_house.js | skill `draw-bina-b-type` + `scripts/templates/bina-b-type.lsp` |
| analyze_stage / analyze_v2 | `analyze_v3.cjs` (kept at repo root because `src/index.ts` invokes it) |
| draw_k44.js | run a parametric template via `run_lsp_script` |
| send_georgian.js | Use the `\\FSylfaen|b0|i0;` inline override (rule `00-georgian-text.mdc`) and write `.lsp` files instead of HTTP-from-Node |

## Why keep them at all

1. They show **end-to-end Node ↔ AutoCAD plugin** flow including
   authentication header (`MCP_AUTOCAD_TOKEN`) and the JSON-RPC-ish
   request shape — useful if someone needs to call the plugin from a
   non-MCP runtime.
2. Some of them have correct geometry / coordinate math that the
   newer LISP templates don't replicate yet.
3. Git history would carry them anyway; keeping them visible avoids the
   "where did that go?" question every six months.

## Status

**Frozen.** Do not extend these. New work goes in `scripts/templates/`,
`scripts/utilities/`, `scripts/validators/`, or `scripts/python/`.
