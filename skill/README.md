# Whichart Agent Skill

[`whichart/SKILL.md`](whichart/SKILL.md) tells an agent to check Whichart before it draws any chart: pick with `recommend_chart`, build from `get_chart`, and call `review_chart` before showing a chart it chose itself. Without the MCP server it falls back to `llms.txt` and the chart Markdown pages.

## Install

Claude Code (all projects):

```sh
mkdir -p ~/.claude/skills/whichart
curl -fsSL https://raw.githubusercontent.com/Whichart/whichart.github.io/main/skill/whichart/SKILL.md -o ~/.claude/skills/whichart/SKILL.md
```

For one project, put it in `.claude/skills/whichart/SKILL.md` instead. Other agents that read `SKILL.md` bundles use the same file; agents that don't can take its body as instructions (`AGENTS.md`, `.cursorrules`, `CLAUDE.md`).

The skill is MIT licensed.
