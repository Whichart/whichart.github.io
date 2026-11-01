# Multi-line chart

A multi-line chart compares how **2–5 segments** move over time on one shared axis, for example revenue by channel or sign-ups by region.

## When to use it

- A few segments that share a unit and a scale.
- The question is "which is growing faster?" or "did they move together?".

## When not to

| Situation | Use instead |
|---|---|
| One series | [Line chart](../line/) |
| Different units or scales | Two charts, or index each to 100. **Never a second y-axis** |
| More than 5 series that all matter | Small multiples |
| The total and its parts | Stacked area or stacked bar |

## Anatomy

- **Colours in fixed order, following the entity.** Web is always blue, even if you filter App out.
- **A legend is always shown**, and with up to 4 series each line is **named at its end**, so colour isn't the only cue. That matters because light-mode colours 3–5 are below 3:1 contrast.
- **Beyond 5 series**, the top 4 by total keep their colours and the rest are summed into **"Other"**. Never generate a 9th colour.

## Edge cases

| State | What the chart does |
|---|---|
| Empty | Keeps the frame; "No data for this period" |
| Single point | One dot per series, named in the legend |
| All zeros | Flat lines on a 0–1 axis |
| Outlier | Linear scale kept so series stay comparable |
| Negative values | Axis extends below zero |
| Many series | Top 4 + "Other" |
| Long labels | Legend names truncated at 24 characters, end labels at 14 |
| Large numbers | Compact locale-aware ticks |
| Gaps in time | Every line breaks at missing days |

## Code

Rows are **long format**: `{ date, series, value }`, one row per series per day. Duplicates are summed. Options: `label`, `locale`, `currency`, `otherLabel`.
