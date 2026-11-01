# Donut chart

A donut splits **one total into a few parts at one moment**, with the total in the middle. It's good for one message, such as "Web is half of our revenue". It's poor at precise comparison: people judge angles far less accurately than lengths.

## When to use it

- 2–5 parts of one total, one moment: this month's revenue by channel, traffic by device.
- The story is "one part dominates" or "roughly even".

## When not to

| Situation | Use instead |
|---|---|
| Comparing close values (31% vs 28%) | [Horizontal bar chart](../bar-horizontal/) |
| More than 5 parts | Horizontal bar chart |
| The mix over time | [Stacked bar chart](../stacked-bar/) |
| Values can be negative | Bars. A share can't be below zero |

## Anatomy

- **The total in the centre**, compact in the reader's locale.
- **Shares in the legend** beside each name, so nobody has to guess percentages from angles and colour is never the only cue.
- **Largest slice first**, starting at 12 o'clock, clockwise.
- **A 2px gap** between slices.
- **Beyond 5 slices**, the top 4 stay and the rest become "Other (n)".

## Edge cases

| State | What the chart does |
|---|---|
| Empty | "No data for this period" |
| One category | A full ring, 100%. A KPI tile usually says this better |
| All zeros | "Nothing to split yet". A ring of zeros has no shape |
| One huge slice | Drawn as is; that dominance is the message |
| Negative values | "A donut can’t show negative values". Never a misleading ring |
| Many categories | Top 4 + "Other (n)" |
| Long names | Truncated at 22 characters, full in the tooltip |
| Large numbers | Centre total `৳83.2Cr` |

## Code

Rows are `{ category, value }`; duplicates are summed. The Plotly version takes `colors.series` and `colors.surface` from `tokens.json` for slice colours and gaps.
