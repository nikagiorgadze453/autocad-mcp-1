#Requires -Version 5.1
<#
.SYNOPSIS
  Push the current branch to GitHub using a Personal Access Token (PAT).

.DESCRIPTION
  Git on this machine is authenticated as a user that does not have write
  access to moisesbritez92/autocad-mcp (HTTPS 403). This script pushes using
  a PAT you create at: https://github.com/settings/tokens
  Scopes: at minimum `repo` (classic) or fine-grained token with Contents: Read/Write.

  Do NOT commit your token. Pass it only via environment variable:

    $env:GITHUB_TOKEN = "ghp_xxxxxxxx"
    .\scripts\git-push-with-token.ps1

  Or for one line in PowerShell (still ends up in shell history — prefer env):

    $env:GITHUB_TOKEN = "ghp_..." ; .\scripts\git-push-with-token.ps1

.PARAMETER Remote
  Full owner/repo path on github.com (default: moisesbritez92/autocad-mcp).

.PARAMETER Branch
  Branch to push (default: current HEAD branch name).
#>
param(
  [string] $Remote = "moisesbritez92/autocad-mcp",
  [string] $Branch = ""
)

$ErrorActionPreference = "Stop"
$token = $env:GITHUB_TOKEN
if (-not $token) {
  Write-Host "ERROR: Set environment variable GITHUB_TOKEN to a GitHub PAT with push rights to $Remote" -ForegroundColor Red
  Write-Host "Create one at: https://github.com/settings/tokens" -ForegroundColor Yellow
  exit 1
}

if (-not $Branch) {
  $Branch = (git rev-parse --abbrev-ref HEAD).Trim()
  if ($Branch -eq "HEAD") { throw "Detached HEAD — checkout a branch first." }
}

# oauth2 as username is the GitHub-recommended form for PAT over HTTPS
$url = "https://oauth2:$token@github.com/$Remote.git"

Write-Host "Pushing branch '$Branch' to github.com/$Remote ..." -ForegroundColor Cyan
git push --set-upstream $url $Branch
Write-Host "Done. Remote URL in this repo is unchanged (token was not saved to config)." -ForegroundColor Green
