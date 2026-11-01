# Cohort retention heatmap

Each row is a **cohort**, the customers who started in the same month. Each column is **months since they started**, and each cell is the share who came back. Read across a row for how one cohort decays; read down a column to see whether **newer customers stick better than older ones**.

## When to use it

- "Are customers coming back?": repeat purchases, subscriptions, app usage.
- At least 3 cohorts and 3 periods.

## When not to

| Situation | Use instead |
|---|---|
| A few cohorts that matter | [Multi-line chart](../multi-line/), one retention curve each |
| One headline retention rate | [KPI tile with change](../kpi-tile-delta/) |

## Give it counts, not percentages

Rows are `{ cohort, period, value }`, where **value is a count of people** and period 0 is the cohort's size. With counts the chart can:
- show **each cohort's size** beside its name;
- **fade and mark small cohorts** (fewer than 30 people, "n=12"), whose percentages swing wildly;
- leave **months that haven't happened yet blank**. A 0% would mean everyone left.

## Anatomy

- One-hue sequential colour, low (light) to high (dark); dark mode flips the ramp. The scale runs to the highest later-month value, so month 0 (always 100%) doesn't squeeze the interesting range into the middle shades.
- **Every cell is labelled** with its percentage; text switches between dark and light ink by cell shade.
- Only the latest 12 cohorts.

## Edge cases

| State | What it does |
|---|---|
| Empty | "No data for this period" |
| One cohort, one month | A single 100% cell |
| No repeat customers | 0% cells in the lightest shade |
| Tiny cohort | Faded, labelled `n=12` |
| Negative counts | "Cohort counts can’t be negative" |
| Many cohorts | Latest 12 |
| Long names | Truncated at 16 characters |
| Large numbers | Sizes compact: `9.6L` |
| Missing month | Blank cell, never 0% |

## Code

ECharts takes `palette` (from `@whichart/tokens/palette.json`) for cell colours and text; without it, the theme's sequential ramp colours the cells. The React version is a plain HTML table using the `--wc-seq-*` CSS variables. Plotly takes `colors.sequential`, `colors.primary` and `colors.surface`.
