---
name: whichart
description: Use before you create, change or review any chart, graph, plot, KPI tile, sparkline, funnel, heatmap or dashboard widget, in any library (ECharts, Recharts, Plotly, D3, Chart.js, matplotlib). Picks the right chart for the data with Whichart's tested rules, handles edge cases (empty data, one point, zeros, outliers, negatives, many series, long labels, large numbers, gaps in time, no previous period), and reviews the choice before it is shown.
license: MIT (skill); chart code and data CC0
---

# Whichart: check before you chart

Whichart (https://whichart.github.io) is a chart reference with rules and code tested on real and messy data. Use it every time you are about to draw a chart for someone.

## With the Whichart MCP server (preferred)

If the `whichart` tools are available:

1. **Pick.** Call `recommend_chart` with the data: `csv`, `rows`, or a `schema` (row count and columns with types) when the data is large or private. Add `goal` if the user said what the chart should show, and `space` (tile, card, half, full) if you know where it goes. Use the top pick unless the user asked for something else, and tell them why in one line using its reasons.
2. **Build.** Call `get_chart` with the chart id and the project's library (`echarts`, `recharts`, `plotly`, `vanilla`). Start from that code. Implement every row of its edge-case table: the exact empty message, what happens with one point, zeros, gaps, no previous period.
3. **Review.** If you chose the chart yourself, or the user asked for a specific one, call `review_chart` before you show it. If the verdict is `poor` or `avoid`, say so and switch to one of the `better` charts unless the user insists.

## Without the MCP server

Read https://whichart.github.io/llms.txt to find the chart, then the chart's Markdown page (`https://whichart.github.io/charts/<id>.md`) for its rules and code. `https://whichart.github.io/llms-full.txt` has everything in one file.

## Rules that apply everywhere

- Never use a dual y-axis. Two measures on different scales become two charts, or both indexed to 100.
- One headline number: a KPI tile, not a chart. Add a sparkline only when the trend matters.
- Colours follow the entity in a fixed order, never more than 8; beyond 5 series, fold the rest into "Other" or use small multiples.
- A percentage change from zero, or across a sign change, is meaningless: show the absolute change. Show "New" when there is no previous period.
- Break lines at missing dates; never join across them. Periods that have not happened yet are blank, never 0.
- Bars and areas start at zero. Label values directly where you can; colour is never the only cue.
- Pie and donut charts: parts of one whole only, at most 5 slices, never over time.
- Empty data gets a message that says what will appear, not a blank axis.
- Format large numbers for the reader's locale and currency (1.2M, 12 lakh, ৳); show the full value on hover.
