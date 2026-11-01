# Progress meter

A filled bar for a value against its target. It answers "how far along are we?" and, with **pace**, the question people actually mean: "**are we on track?**".

## When to use it

- A number with a real target: monthly revenue goal, quota, fundraising, a storage limit.
- At the top of a dashboard, next to KPI tiles.

## When not to

| Situation | Use instead |
|---|---|
| No target, only a previous period | [KPI tile with change](../kpi-tile-delta/) |
| Qualitative ranges (poor, fair, good) or several targets | Bullet chart |
| "It looks more dashboard-y" | Not a gauge. A gauge shows the same thing in more space and is harder to read |

## Progress without pace misleads

60% of the monthly target is great on day 10 and a problem on day 28. Pass `elapsed`, the share of the period that has passed (0–1), and the meter adds:

- a **pace marker** on the track where you'd expect to be by now;
- a **status line**: "▲ Ahead of pace · $30K expected" or "▼ Behind pace".

When the period is over (`elapsed: 1`), it says "Target met" or "Missed by $4,800".

## Anatomy

- The **value** large, with "of $50,000 · 70%" beside it.
- A **track in a light step of the ramp** and a **fill in the series colour**, one hue, so no red-amber-green bar. Good and bad live in the status line, with an arrow and words.
- The **pace marker**, a thin line in primary ink.

## Edge cases

| State | What it does |
|---|---|
| Empty | `—`, an empty track, "No data yet" |
| All zeros | 0 and 0%; pace says whether that's a problem yet |
| Over target | Full bar, "▲ 180% of target". Never capped at 100% |
| Negative value | The number keeps its sign; the bar stays empty instead of drawing backwards |
| Long label | Two lines, then ellipsis |
| Large numbers | `৳25.7Cr of ৳36.5Cr` |
| No target | The value and "No target set". Never an invented target |

## Code

Rows are `[{ value, target, elapsed }]`. Plain DOM and React need no chart library. The Plotly version draws the bar with shapes and takes theme colours (`series`, `track`, `primary` and the delta colours) as `colors`.
