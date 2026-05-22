# docs/examples/

Historical sample outputs from the autocad-mcp pipeline. Use these as
**look-and-feel references** for what the toolkit produces. They are
not loaded at runtime; they were committed at the time of generation
and preserved here.

## Files

| File | Pipeline that produced it |
|---|---|
| `STAGE_PLAN_REPORT.md` | `analyze-stage-plan` skill (English Markdown report) |
| `STAGE_PLAN_REPORT_GE.docx` | `generate_report_docx.cjs` (Georgian Word report) |
| `stage-report-v3.json` | `analyze_v3.cjs` (machine-readable analyzer output) |

To regenerate from a live drawing in AutoCAD, run the
`analyze-stage-plan` skill or, manually:

```powershell
# 1. Open the target DWG in AutoCAD (must have the .NET plugin loaded)
# 2. Dump stage geometry
node -e "require('fs').writeFileSync('temp/run.lsp', '(load \"./scripts/dump-stage-deep.lsp\") (c:dump-stage-deep)')"

# 3. Parse
node analyze_v3.cjs

# 4. Render the Georgian DOCX
node generate_report_docx.cjs
```

The MCP `analyze_stage_plan` tool wires these together automatically.
