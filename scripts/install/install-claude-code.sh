#!/usr/bin/env bash
# scripts/install/install-claude-code.sh
# macOS / Linux mirror of install-claude-code.ps1
#
# Usage:  bash scripts/install/install-claude-code.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
echo "=== Installing AutoCAD MCP for Claude Code ==="
echo "Repo root: $REPO_ROOT"

# 1. CLAUDE.md
SRC_MD="$REPO_ROOT/CLAUDE.md"
if [[ ! -f "$SRC_MD" ]]; then
  echo "ERROR: $SRC_MD not found." >&2
  exit 1
fi

mkdir -p "$HOME/.claude"
cp -f "$SRC_MD" "$HOME/.claude/CLAUDE.md"
echo "+ $HOME/.claude/CLAUDE.md"

# 2. Build MCP server
if [[ ! -f "$REPO_ROOT/dist/index.js" ]]; then
  echo "Building MCP server (npm install + build)..."
  (cd "$REPO_ROOT" && npm install --no-audit --no-fund && npm run build)
fi

# 3. Register MCP
if command -v claude >/dev/null 2>&1; then
  claude mcp remove autocad-mcp --scope user 2>/dev/null || true
  claude mcp add autocad-mcp \
    --scope user \
    --env AUTOCAD_PLUGIN_URL="http://localhost:12345" \
    --env MCP_AUTOCAD_TOKEN="default-secret-token" \
    --env AUTOCAD_SCRIPTS_DIR="$REPO_ROOT/scripts" \
    -- node "$REPO_ROOT/dist/index.js"
  echo "  registered with claude CLI"
else
  echo "claude CLI not found. Install from https://claude.com/code, then add manually:"
  echo ""
  echo "  claude mcp add autocad-mcp \\"
  echo "    --env AUTOCAD_PLUGIN_URL='http://localhost:12345' \\"
  echo "    --env MCP_AUTOCAD_TOKEN='default-secret-token' \\"
  echo "    --env AUTOCAD_SCRIPTS_DIR='$REPO_ROOT/scripts' \\"
  echo "    -- node '$REPO_ROOT/dist/index.js'"
fi

echo ""
echo "=== Done ==="
echo "Restart Claude Code."
