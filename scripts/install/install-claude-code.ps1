# scripts/install/install-claude-code.ps1
# One-command setup for Claude Code users.
#  - Writes CLAUDE.md into the user's home so every session loads office rules.
#  - Registers the autocad-mcp server with `claude mcp add`.
#
# Usage:  pwsh .\scripts\install\install-claude-code.ps1
#
# Idempotent: safe to re-run.

[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path "$PSScriptRoot\..\..\").Path,
  [switch]$Force,
  [string]$Scope = "user"   # user | local | project
)

$ErrorActionPreference = 'Stop'

Write-Host "=== Installing AutoCAD MCP for Claude Code ===" -ForegroundColor Cyan
Write-Host "Repo root: $RepoRoot"

# 1. CLAUDE.md - copy to repo root (project-level) and ~/.claude (user-level)
$srcClaudeMd  = Join-Path $RepoRoot "CLAUDE.md"
if (-not (Test-Path $srcClaudeMd)) {
  Write-Host "ERROR: $srcClaudeMd not found in repo." -ForegroundColor Red
  exit 1
}

# 1a. User-level CLAUDE.md  (~/.claude/CLAUDE.md)
$claudeHome = Join-Path $HOME ".claude"
if (-not (Test-Path $claudeHome)) { New-Item -ItemType Directory -Path $claudeHome | Out-Null }
$userClaudeMd = Join-Path $claudeHome "CLAUDE.md"

if ((Test-Path $userClaudeMd) -and -not $Force) {
  Write-Host "skip ~/.claude/CLAUDE.md (use -Force to overwrite)" -ForegroundColor DarkGray
} else {
  Copy-Item $srcClaudeMd $userClaudeMd -Force
  Write-Host "+ $userClaudeMd" -ForegroundColor Gray
}

# 2. Build MCP server if missing
$distIdx = Join-Path $RepoRoot "dist\index.js"
if (-not (Test-Path $distIdx)) {
  Write-Host "Building MCP server (npm install + build)..." -ForegroundColor Yellow
  Push-Location $RepoRoot
  npm install --no-audit --no-fund
  npm run build
  Pop-Location
}

# 3. Register MCP via `claude mcp add` if Claude Code CLI is on PATH
$claudeCli = Get-Command claude -ErrorAction SilentlyContinue
if ($claudeCli) {
  Write-Host "Registering autocad-mcp with claude CLI ($Scope scope)..." -ForegroundColor Green

  # remove any existing entry of the same name (idempotency)
  & claude mcp remove autocad-mcp --scope $Scope 2>$null | Out-Null

  & claude mcp add autocad-mcp `
      --scope $Scope `
      --env AUTOCAD_PLUGIN_URL="http://localhost:12345" `
      --env MCP_AUTOCAD_TOKEN="default-secret-token" `
      --env AUTOCAD_SCRIPTS_DIR="$(Join-Path $RepoRoot 'scripts')" `
      -- node "$distIdx"

  Write-Host "  registered (scope: $Scope)" -ForegroundColor Gray
} else {
  Write-Host "claude CLI not found on PATH." -ForegroundColor Yellow
  Write-Host "Install from https://claude.com/code then re-run, or add manually:" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  claude mcp add autocad-mcp \\" -ForegroundColor Gray
  Write-Host "    --env AUTOCAD_PLUGIN_URL='http://localhost:12345' \\" -ForegroundColor Gray
  Write-Host "    --env MCP_AUTOCAD_TOKEN='default-secret-token' \\" -ForegroundColor Gray
  Write-Host "    --env AUTOCAD_SCRIPTS_DIR='$(Join-Path $RepoRoot 'scripts')' \\" -ForegroundColor Gray
  Write-Host "    -- node '$distIdx'" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host "Restart Claude Code. Office rules load from:"
Write-Host "  - $srcClaudeMd  (project-level, when working in this repo)"
Write-Host "  - $userClaudeMd  (user-level, every project)"
Write-Host ""
Write-Host "Skill workflows (analyze-stage-plan, draw-bina-b-type, etc.) are"
Write-Host "documented in .cursor/skills/<name>/SKILL.md and can be invoked by"
Write-Host "asking Claude to read the matching SKILL.md before running."
