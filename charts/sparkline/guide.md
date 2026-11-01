# Sparkline

A sparkline is a **word-sized line chart** with no axes, gridlines or labels. It answers one question at a glance, "which way is this going?", next to the number it belongs to.

## When to use it

- Inside a KPI tile, under or beside the headline number.
- In table rows, to compare the shape of many series in little space.

## When not to

| Situation | Use instead |
|---|---|
| People need exact values or dates | [Line chart](../line/) |
| There's room for a full chart | Line or area chart |
| Several series together | Multi-line chart |

## Anatomy

- **No axes.** The y-range fits the data with a little padding, because the shape is the point. That also means two sparklines with different scales can't be compared by height.
- **The latest value is marked** with a dot: it's the value next to the headline number.
- **A dashed zero line** appears only when values cross zero.
- **Screen readers get a sentence**, such as "Revenue over 30 days, from $1,722 to $2,480, up 44%", since there are no axes to read.

## Edge cases

| State | What it does |
|---|---|
| Empty | "No data yet" in the same small space, so the tile keeps its height |
| Single point | One dot |
| All zeros | Flat along the bottom. In the middle it would look like a steady non-zero value |
| Outlier | Linear scale; the spike dominates, which is the truth |
| Negative values | A dashed zero line appears |
| Gaps in time | The line breaks |
| Long labels, large numbers, many series, no previous period | Not applicable: a sparkline shows no text |

## Code

Same `{ date, value }` rows as the line chart. Set the height to fit your tile (64px by default).
