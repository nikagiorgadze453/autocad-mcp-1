# scripts/install/install-cursor.ps1
# One-command setup for Cursor users.
# Copies rules + skills into the user's Cursor config and registers
# the autocad-mcp server in their MCP config.
#
# Usage:  pwsh .\scripts\install\install-cursor.ps1
#
# Idempotent: safe to re-run after pulling a new version.

[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path "$PSScriptRoot\..\..\").Path,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

Write-Host "=== Installing AutoCAD MCP for Cursor ===" -ForegroundColor Cyan
Write-Host "Repo root: $RepoRoot"

# 1. Locate Cursor config
$cursorRoot = Join-Path $HOME ".cursor"
if (-not (Test-Path $cursorRoot)) {
  Write-Host "Creating $cursorRoot" -ForegroundColor Yellow
  New-Item -ItemType Directory -Path $cursorRoot | Out-Null
}

$cursorRules  = Join-Path $cursorRoot "rules"
$cursorSkills = Join-Path $cursorRoot "skills"

foreach ($d in @($cursorRules, $cursorSkills)) {
  if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d | Out-Null }
}

# 2. Copy rules
$srcRules = Join-Path $RepoRoot ".cursor\rules"
if (Test-Path $srcRules) {
  Write-Host "Copying rules -> $cursorRules" -ForegroundColor Green
  Get-ChildItem $srcRules -Filter "*.mdc" | ForEach-Object {
    $dest = Join-Path $cursorRules $_.Name
    if ((Test-Path $dest) -and -not $Force) {
      Write-Host "  skip (exists, use -Force to overwrite): $($_.Name)" -ForegroundColor DarkGray
    } else {
      Copy-Item $_.FullName $dest -Force
      Write-Host "  + $($_.Name)" -ForegroundColor Gray
    }
  }
} else {
  Write-Host "WARNING: no .cursor/rules in repo" -ForegroundColor Yellow
}

# 3. Copy skills
$srcSkills = Join-Path $RepoRoot ".cursor\skills"
if (Test-Path $srcSkills) {
  Write-Host "Copying skills -> $cursorSkills" -ForegroundColor Green
  Get-ChildItem $srcSkills -Directory | ForEach-Object {
    $dest = Join-Path $cursorSkills $_.Name
    if (-not (Test-Path $dest)) {
      New-Item -ItemType Directory -Path $dest | Out-Null
    }
    Copy-Item "$($_.FullName)\*" $dest -Recurse -Force
    Write-Host "  + $($_.Name)" -ForegroundColor Gray
  }
}

# 4. Register MCP server in ~/.cursor/mcp.json (or create one)
$mcpJsonPath = Join-Path $cursorRoot "mcp.json"
$serverEntry = @{
  command = "node"
  args    = @( (Join-Path $RepoRoot "dist\index.js") )
  env     = @{
    AUTOCAD_PLUGIN_URL = "http://localhost:12345"
    MCP_AUTOCAD_TOKEN  = "default-secret-token"
    AUTOCAD_SCRIPTS_DIR = (Join-Path $RepoRoot "scripts")
  }
}

if (Test-Path $mcpJsonPath) {
  Write-Host "Updating $mcpJsonPath" -ForegroundColor Green
  $config = Get-Content $mcpJsonPath -Raw | ConvertFrom-Json
  if (-not $config.PSObject.Properties.Name -contains 'mcpServers') {
    Add-Member -InputObject $config -NotePropertyName 'mcpServers' -NotePropertyValue ([pscustomobject]@{}) -Force
  }
  $serverObj = [pscustomobject]$serverEntry
  Add-Member -InputObject $config.mcpServers -NotePropertyName 'autocad-mcp' -NotePropertyValue $serverObj -Force
} else {
  Write-Host "Creating $mcpJsonPath" -ForegroundColor Green
  $config = [pscustomobject]@{
    mcpServers = [pscustomobject]@{
      'autocad-mcp' = [pscustomobject]$serverEntry
    }
  }
}

$json = $config | ConvertTo-Json -Depth 6
# Write UTF-8 without BOM so Node / Cursor parsers don't choke
[System.IO.File]::WriteAllText($mcpJsonPath, $json, (New-Object System.Text.UTF8Encoding($false)))

# 5. Build the MCP server if dist is missing
$distIdx = Join-Path $RepoRoot "dist\index.js"
if (-not (Test-Path $distIdx)) {
  Write-Host "Building MCP server (npm install + build)..." -ForegroundColor Yellow
  Push-Location $RepoRoot
  npm install --no-audit --no-fund
  npm run build
  Pop-Location
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host "Restart Cursor. The AutoCAD MCP server will appear under MCP Tools."
Write-Host "Rules from .cursor/rules will load automatically in every chat."
