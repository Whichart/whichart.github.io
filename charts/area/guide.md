# Area chart

An area chart is a line chart with the space below it filled. The fill adds one idea: **volume**. Use it when "how much" matters as much as "which way", such as orders, sign-ups or sessions.

## When to use it

- One measure over regular periods, where the amount is the point.
- A single series that should carry visual weight on a dashboard.

## When not to

| Situation | Use instead |
|---|---|
| Values can go negative (net change, profit) | [Line chart](../line/) |
| Several series | Multi-line, or a stacked area for parts of a total |
| You want to zoom in on small changes | A line chart with a non-zero axis |
| It sits in a KPI tile | Sparkline |

## Anatomy

- **The y-axis always starts at zero.** The fill says "this much", so a cropped axis would lie.
- A **light fill** (25% opacity) under a full-strength 2px line. The line carries the data; the fill is emphasis.
- The highest point is labelled, the same as the line chart.

## Edge cases

| State | What the chart does |
|---|---|
| Empty | Keeps the frame; shows "No data for this period" |
| Single point | One labelled dot; nothing to fill |
| All zeros | Flat on the baseline with a 0–1 axis |
| Outlier | Linear scale, highest point labelled |
| Negative values | Fills to zero from both sides. Readable, but a line chart is better |
| Long label | Title truncated at 40 characters; full name in the tooltip |
| Large numbers | Locale-aware compact ticks: `৳24Cr` |
| Gaps in time | Line and fill break at missing days |

## Code

The code is the line chart's code with the fill added: `areaStyle` in ECharts, `<Area baseValue={0}>` in Recharts, `fill="tozeroy"` in Plotly. Same inputs: `{ date, value }` rows, plus `label`, `locale` and `currency`.
