# Stacked bar chart

A bar per group, such as each month, split into **a few parts**, such as each sales channel. It answers two questions at once: how big is the total, and what is it made of?

## When to use it

- Revenue per month by channel, tickets per week by priority, sign-ups per region by plan.
- 2–5 parts that genuinely add up.

## When not to

| Situation | Use instead |
|---|---|
| Comparing the parts with each other across groups | Grouped bars or small multiples. Only the bottom part sits on a shared baseline |
| Only the mix matters, not the totals | 100% stacked bar |
| One group only | Donut (≤ 5 parts) or a horizontal bar chart |
| The values are rates or averages | They don't add up; use lines |

## Anatomy

- **Totals labelled** on top of every stack.
- **A 2px gap** in the background colour between segments, so neighbouring colours never blur.
- **Colours follow the part**, in fixed order: Web is the same blue in every month.
- **Beyond 5 parts**, the top 4 stay and the rest become **"Other"**.
- Put the part people care about most at the bottom (first in your data): it's the only one on a common baseline.

## Edge cases

| State | What the chart does |
|---|---|
| Empty | "No data for this period" |
| One group | One stack with its total |
| All zeros | Empty stacks on a 0–1 axis |
| Outlier | Linear scale; totals keep the short stacks readable |
| Negative parts | Stack below zero; the label is the net total |
| Many parts | Top 4 + "Other" |
| Long names | Legend truncated at 20 characters, group labels at 12 |
| Large numbers | `৳77.2Cr` |

## Code

Rows are long format: `{ group, series, value }`. Groups keep the order you give them. ECharts takes `palette.surface` (from `@whichart/tokens/palette.json`) for the segment gaps; Plotly takes `colors.surface`.
