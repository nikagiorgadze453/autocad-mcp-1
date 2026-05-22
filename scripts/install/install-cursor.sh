#!/usr/bin/env bash
# scripts/install/install-cursor.sh
# macOS / Linux mirror of install-cursor.ps1
#
# Usage:  bash scripts/install/install-cursor.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
echo "=== Installing AutoCAD MCP for Cursor ==="
echo "Repo root: $REPO_ROOT"

CURSOR_ROOT="$HOME/.cursor"
mkdir -p "$CURSOR_ROOT/rules" "$CURSOR_ROOT/skills"

# 1. Rules
if [[ -d "$REPO_ROOT/.cursor/rules" ]]; then
  for f in "$REPO_ROOT/.cursor/rules"/*.mdc; do
    [[ -e "$f" ]] || continue
    cp -f "$f" "$CURSOR_ROOT/rules/"
    echo "  + $(basename "$f")"
  done
fi

# 2. Skills
if [[ -d "$REPO_ROOT/.cursor/skills" ]]; then
  for d in "$REPO_ROOT/.cursor/skills"/*/; do
    [[ -d "$d" ]] || continue
    name="$(basename "$d")"
    mkdir -p "$CURSOR_ROOT/skills/$name"
    cp -rf "$d"* "$CURSOR_ROOT/skills/$name/"
    echo "  + skill $name"
  done
fi

# 3. Build MCP
if [[ ! -f "$REPO_ROOT/dist/index.js" ]]; then
  echo "Building MCP server (npm install + build)..."
  (cd "$REPO_ROOT" && npm install --no-audit --no-fund && npm run build)
fi

# 4. mcp.json — minimal merge
MCP_JSON="$CURSOR_ROOT/mcp.json"
SERVER_BLOCK=$(cat <<EOF
{
  "mcpServers": {
    "autocad-mcp": {
      "command": "node",
      "args": ["$REPO_ROOT/dist/index.js"],
      "env": {
        "AUTOCAD_PLUGIN_URL": "http://localhost:12345",
        "MCP_AUTOCAD_TOKEN": "default-secret-token",
        "AUTOCAD_SCRIPTS_DIR": "$REPO_ROOT/scripts"
      }
    }
  }
}
EOF
)

if [[ -f "$MCP_JSON" ]]; then
  echo "WARN: $MCP_JSON exists — merge manually or pass --force."
  echo "Suggested entry:"
  echo "$SERVER_BLOCK"
else
  echo "$SERVER_BLOCK" > "$MCP_JSON"
  echo "+ $MCP_JSON"
fi

echo ""
echo "=== Done ==="
echo "Restart Cursor."
