# KPI tile with sparkline

The headline number for the period, its honest change against the previous period, and a **sparkline of how it got there**. It's the most common tile on modern analytics dashboards, and the most commonly wrong one.

## When to use it

- Leading a dashboard: revenue, orders, sessions or sign-ups for the last 28 days.
- When "up 12%" isn't enough and people ask "steadily, or one big day?".

## When not to

| Situation | Use instead |
|---|---|
| No daily data, or the shape doesn't matter | [KPI tile with change](../kpi-tile-delta/) |
| This period against the last, day by day | [Current vs previous period](../period-comparison/) |
| The full history with axes | [Line chart](../line/) |

## Summing is usually right, and sometimes very wrong

The tile reduces a period of daily values to one number. Pick how with `aggregate`:

| Metric | aggregate | Why |
|---|---|---|
| Revenue, orders, sign-ups | `sum` (default) | Daily values add up |
| Conversion rate, average order value | `average` | Rates don't add up: 2% + 3% is not 5% |
| Subscribers, account balance, stock | `last` | A stock is measured at a point in time |

## Anatomy

- The **label** wraps to two lines.
- The **number**, compact from 100,000, with the full value in the tooltip.
- The **sparkline** on the right: no axes, latest day marked, breaks at missing days, dashed zero line when values cross zero.
- The **change line**, using the same rules as the KPI tile: percent when it means something; otherwise an absolute amount, a multiple (from 6×) or "New".

The default period is **28 days**, so weekdays line up with the previous period.

## Edge cases

| State | What the tile does |
|---|---|
| Empty | `—` and "No data yet" |
| Single point | The day's value, "New", one dot |
| All zeros | `0`, "No change" in grey, flat sparkline at the bottom |
| Outlier | "▲ 9×" instead of "+800%" |
| Negative values | Sign kept; sign flips show the absolute change; dashed zero line |
| Long label | Two lines, then ellipsis |
| Large numbers | `৳1.6Cr` |
| Gaps in time | Total over the days with data; sparkline breaks |
| No previous period | "New" badge |

## Code

Plain DOM and React draw the sparkline as a small SVG path with **no chart library**, so the tile weighs a few kilobytes. Rows are `{ date, value }`, daily. Options: `label`, `locale`, `currency`, `goodDirection`, `days`, `aggregate`.
