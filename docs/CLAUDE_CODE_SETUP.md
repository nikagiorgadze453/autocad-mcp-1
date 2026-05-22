# Claude Code setup — AutoCAD MCP for Georgian Architecture

Claude Code is Anthropic's terminal-based coding agent. This page
explains how the AutoCAD MCP pack works inside Claude Code and where
each Cursor concept maps.

---

## Concept mapping: Cursor → Claude Code

| Cursor | Claude Code |
|---|---|
| `.cursor/rules/*.mdc` auto-loaded | `CLAUDE.md` (project + user-level) |
| `.cursor/skills/*/SKILL.md` | Same files — invoked manually |
| `.cursor/mcp.json` | `~/.claude/mcp.json` or `claude mcp add` |
| Cursor Chat | `claude` terminal session |
| Slash commands (`/skill`) | Just say the skill name in a prompt |

---

## What `install:claude-code` does

```powershell
npm run install:claude-code
```

1. Copies the repo's **`CLAUDE.md`** → `~/.claude/CLAUDE.md` so every
   Claude Code session in any project starts with office rules.
2. Registers the MCP server:
   ```powershell
   claude mcp add autocad-mcp `
     --scope user `
     --env AUTOCAD_PLUGIN_URL="http://localhost:12345" `
     --env MCP_AUTOCAD_TOKEN="default-secret-token" `
     --env AUTOCAD_SCRIPTS_DIR="$(pwd)/scripts" `
     -- node "$(pwd)/dist/index.js"
   ```

After restart, `claude mcp list` should show `autocad-mcp` as `active`
with 45+ tools.

---

## Using skills from Claude Code

Cursor has built-in skill discovery; Claude Code does not. Two patterns
work well:

### Pattern A — Read the SKILL.md first

```
> Read .cursor/skills/draw-bina-b-type/SKILL.md and then follow it
  to generate a standard B-type apartment.
```

Claude Code reads the markdown, then executes the steps. This is the
recommended pattern.

### Pattern B — Custom slash commands (advanced)

You can wire a `~/.claude/commands/` folder where each `.md` file is a
slash command. For each skill:

```bash
mkdir -p ~/.claude/commands
cp .cursor/skills/draw-bina-b-type/SKILL.md ~/.claude/commands/draw-bina-b-type.md
cp .cursor/skills/analyze-stage-plan/SKILL.md ~/.claude/commands/analyze-stage-plan.md
# … and so on
```

Then invoke as:

```
/draw-bina-b-type
/analyze-stage-plan
```

---

## Where Claude Code differs from Cursor

1. **No automatic skill picker.** You must name the skill or read its
   `SKILL.md`. `CLAUDE.md` lists every skill — Claude Code will find
   them when you ask.
2. **Terminal-first.** Claude Code is excellent for batch and CI jobs.
   Use it for headless `ezdxf_batch.py` runs across many DWGs.
3. **Better for long sessions.** Multi-hour LISP generation that would
   hit Cursor's context limit usually runs fine in Claude Code.
4. **Less visual.** No IDE preview of files; you rely on `cat` /
   `head` / `tail` and the agent's tool output.

---

## Recommended workflow split

Use **both** clients:

| Task | Best tool |
|---|---|
| Interactive drafting, fine-tuning a plan | **Cursor** |
| Generating an apartment from scratch | Either |
| Batch processing 50 legacy DWGs | **Claude Code** |
| Running validation + PDF export | Either |
| Long automation sessions (1+ hour) | **Claude Code** |
| CI/CD pipelines (GitHub Actions) | **Claude Code** |

---

## Sanity check

In a Claude Code session inside this repo:

```
> What apartment types does the office support?
```

Claude should answer with **A (45 m²), B (65 m²), C (85 m²)** — that
information is in `CLAUDE.md` § Apartment typologies. If it doesn't,
the install didn't pick up `CLAUDE.md`. Re-run the installer with
`-Force`.

---

## Updating

```powershell
git pull
npm run install:claude-code   # idempotent, overwrites CLAUDE.md
npm run sync-rules            # warns if CLAUDE.md is stale vs .cursor/rules
```

`sync-rules -Full` appends the full text of every rule file as an
appendix to `CLAUDE.md` — useful if you want zero ambiguity but
inflates the file (~80 KB total).

---

## CI usage example

A GitHub Actions job that runs the validation pipeline on a DWG:

```yaml
name: Validate DWG
on: pull_request
jobs:
  validate:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install && npm run build
      - run: pip install -r requirements.txt
      - run: |
          npm run install:claude-code -- -Scope project
      - run: |
          claude --batch <<'EOF'
          Read .cursor/skills/validate-and-issue-pdf/SKILL.md.
          Then validate the file outputs/current.dwg and emit the PDF.
          EOF
```

(Adapt to your CI; this is illustrative.)
