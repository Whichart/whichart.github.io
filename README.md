# Whichart

**Modern data visualization examples, tested on real data.**

Find the right chart for your dashboard, see how it handles empty, messy and edge-case data, and copy code that works: ECharts, Recharts and Plotly. For people and AI agents.

- **Choose:** drop your data in and every chart is ranked against it, with reasons why and why not.
- **Edge cases:** see how each chart behaves with empty data, zeros, outliers, long labels, gaps in time, no previous period and more.
- **Code:** tested ECharts, Recharts and Plotly (Python) examples sharing one theme built from swappable design tokens.
- **For agents:** a JSON catalog, `llms.txt`, a local MCP server and an Agent Skill.

Site: <https://whichart.github.io> · Status: early development. See [PLAN.md](PLAN.md).

## For AI agents

Give your coding agent the same rules, as tools. The [MCP server](packages/mcp) has `recommend_chart`, `get_chart`, `list_charts` and `review_chart`; the [Agent Skill](skill) tells it to use them before showing any chart.

```sh
claude mcp add whichart -- npx -y @whichart/mcp   # once @whichart/mcp is on npm; see packages/mcp for from-source setup
```

Files for any agent: [`llms.txt`](https://whichart.github.io/llms.txt), [`llms-full.txt`](https://whichart.github.io/llms-full.txt), `/charts/<id>.md` and [`catalog.json`](https://whichart.github.io/catalog.json). Setup for Cursor, VS Code and Windsurf: <https://whichart.github.io/agents/>.

## Repository layout

```
site/        Astro site (GitHub Pages)
packages/    engine, mcp, tokens
charts/      one folder per chart
skill/       Agent Skill bundle
```

## Development

Requires Node 22+ and pnpm.

```sh
pnpm install
pnpm dev      # local site at http://localhost:4321
pnpm previews # render chart preview images (needs Chromium: pnpm exec playwright install chromium)
pnpm build    # static build in site/dist
```

## Licensing

Free for any purpose: individuals, businesses and AI agents.

| What | License |
|---|---|
| Chart code snippets (`charts/*/code/`) and sample data (`charts/*/data/`) | [CC0 1.0](LICENSES/CC0-1.0.txt): copy freely, no attribution needed |
| Engine, MCP server, site, `chart.yaml` rules, everything else | [MIT](LICENSE) |
| Written guides (`charts/*/guide.md`) | [CC BY 4.0](LICENSES/CC-BY-4.0.txt): credit Whichart when republishing |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
