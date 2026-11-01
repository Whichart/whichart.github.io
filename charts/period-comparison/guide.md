# Current vs previous period

This period's line drawn over the previous period's, **aligned day by day**. A KPI tile tells you revenue is up 12%; this chart shows *where* it got ahead: a strong first week, then a flat stretch.

## When to use it

- "Are we doing better than last month?" when the path matters, not just the total.
- Spotting the slow week, the campaign spike or the outage against a normal period.

## When not to

| Situation | Use instead |
|---|---|
| Only the total change matters | [KPI tile with change](../kpi-tile-delta/) |
| No previous period yet | [Line chart](../line/) |
| Several segments | One comparison per segment, or a multi-line chart |

## Why 28 days, not "this month vs last month"

Calendar months have 28–31 days and start on different weekdays. Lining up 1 October (a Thursday) with 1 September (a Tuesday) compares a weekday with a different weekday, and weekly patterns produce fake differences. **28 days is exactly four weeks**, so Monday lines up with Monday. Pass `days: 7` for week over week, or `days: 364` for year over year (52 weeks).

## Anatomy

- The **current period** in the first series colour, solid.
- The **previous period** in muted grey, dashed. It's context, not a competing series.
- The x-axis shows the current period's dates; the **tooltip shows both dates**: "Sep 3: $2,100" and "Aug 6: $1,900".

## Edge cases

| State | What the chart does |
|---|---|
| Empty | "No data for this period" |
| Single point | One labelled dot |
| All zeros | Both lines flat on a 0–1 axis |
| Outlier | Linear scale; the spike stays in its own period |
| Negative values | Axis extends below zero |
| Long label | Title truncated at 40 characters |
| Large numbers | Compact ticks: `৳1.5Cr` |
| Gaps in time | Each line breaks at its own missing days |
| **No previous period** | Only the current line, with "No previous period to compare yet". Never an empty dashed line or a fake zero |

## Code

Rows are `{ date, value }`, daily, covering both periods. ECharts can't read CSS variables, so pass `palette` from `@whichart/tokens/palette.json` to get the grey previous line. Recharts uses CSS variables, and the Plotly version takes `colors.muted` from `tokens.json`.
