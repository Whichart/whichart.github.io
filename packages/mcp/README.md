# @whichart/mcp

An [MCP](https://modelcontextprotocol.io) server for [Whichart](https://whichart.github.io): modern data visualization examples, tested on real data. It gives your coding agent the same rules people see on the site, so it picks the right chart, handles empty and messy data, and starts from tested code.

Everything is bundled. It runs locally over stdio, needs no API key, and your data never leaves your machine.

## Tools

| Tool | What it does |
|---|---|
| `recommend_chart` | Data (`csv`, `rows`, or a `schema` describing it) plus an optional `goal`, `space`, `audience` and `medium` → ranked charts with reasons, warnings and an encoding, plus charts to avoid and why. |
| `get_chart` | A chart id and optional `library` (`echarts`, `recharts`, `plotly`, `vanilla`) → Markdown: when to use it, data it needs, edge-case rules, pitfalls, guide and code. |
| `list_charts` | Every written chart, filtered by `goal` or `industry`. |
| `review_chart` | A chart id plus the data → a verdict (`good`, `ok`, `poor`, `avoid`), problems with fixes, and better charts. Call it before showing a chart. |

## Set up

Claude Code:

```sh
claude mcp add whichart -- npx -y @whichart/mcp
```

Cursor (`.cursor/mcp.json`) and Windsurf (`~/.codeium/windsurf/mcp_config.json`):

```json
{ "mcpServers": { "whichart": { "command": "npx", "args": ["-y", "@whichart/mcp"] } } }
```

VS Code (`.vscode/mcp.json`):

```json
{ "servers": { "whichart": { "type": "stdio", "command": "npx", "args": ["-y", "@whichart/mcp"] } } }
```

Pair it with the [Whichart Agent Skill](https://github.com/Whichart/whichart.github.io/tree/main/skill) so your agent calls it at the right moments.

## From source

```sh
git clone https://github.com/Whichart/whichart.github.io && cd whichart.github.io
pnpm install && pnpm --filter @whichart/mcp build
claude mcp add whichart -- node "$PWD/packages/mcp/dist/index.js"
```

`pnpm --filter @whichart/mcp test` builds the server and calls every tool through a real MCP client.

## Licence

The server is MIT. The chart code it returns is public domain (CC0); the guides are CC BY 4.0.
