# scripts/install/sync-rules.ps1
# Regenerates CLAUDE.md from .cursor/rules/*.mdc + .cursor/skills metadata.
# Run after editing any rule so the Claude Code mirror stays in sync.
#
# This is intentionally simple: it appends a "RULES" appendix to CLAUDE.md
# only if asked with -Full. Default mode just sanity-checks that all rule
# files exist and warns if CLAUDE.md is older than any rule.

[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path "$PSScriptRoot\..\..\").Path,
  [switch]$Full
)

$ErrorActionPreference = 'Stop'

$rulesDir   = Join-Path $RepoRoot ".cursor\rules"
$claudeMd   = Join-Path $RepoRoot "CLAUDE.md"
$claudeMtime = (Get-Item $claudeMd -ErrorAction SilentlyContinue).LastWriteTimeUtc

if (-not (Test-Path $claudeMd)) {
  Write-Host "ERROR: $claudeMd not found. Run install first." -ForegroundColor Red
  exit 1
}

# 1. Drift check - warn if any rule is newer than CLAUDE.md
$stale = @()
Get-ChildItem $rulesDir -Filter "*.mdc" | ForEach-Object {
  if ($_.LastWriteTimeUtc -gt $claudeMtime) { $stale += $_.Name }
}

if ($stale.Count -gt 0) {
  Write-Host "Rules newer than CLAUDE.md:" -ForegroundColor Yellow
  $stale | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
  Write-Host ""
  Write-Host "Edit CLAUDE.md to reflect the changes, or re-run with -Full to append" -ForegroundColor Yellow
  Write-Host "a full rules appendix (warning: this duplicates content)." -ForegroundColor Yellow
} else {
  Write-Host "CLAUDE.md is up to date with all rule files." -ForegroundColor Green
}

if ($Full) {
  Write-Host ""
  Write-Host "Appending full rules appendix to $claudeMd ..." -ForegroundColor Cyan
  $appendix = @()
  $appendix += ""
  $appendix += "---"
  $appendix += ""
  $appendix += "# Appendix - Full rule contents"
  $appendix += ""
  Get-ChildItem $rulesDir -Filter "*.mdc" | Sort-Object Name | ForEach-Object {
    $appendix += "## $($_.Name)"
    $appendix += ""
    $appendix += (Get-Content $_.FullName -Raw)
    $appendix += ""
    $appendix += "---"
    $appendix += ""
  }
  Add-Content -Path $claudeMd -Value ($appendix -join "`n") -Encoding UTF8
  Write-Host "Appendix appended." -ForegroundColor Green
}
