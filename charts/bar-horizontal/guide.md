# Horizontal bar chart

Bars on a common baseline are the shape people compare most accurately. Turned horizontal and **sorted largest first**, they answer "which is biggest, and by how much?" in one glance, and long category names fit.

## When to use it

- Revenue by product, sessions by channel, tickets by team.
- Category names longer than a word or two.

## When not to

| Situation | Use instead |
|---|---|
| The categories are dates | [Line chart](../line/) or a column chart |
| Exact values for many rows | Top-N table or data table |
| Each category splits into parts | Stacked bar chart |
| Values are huge and close (98, 99, 101) | Dot plot. Bars would look identical |

## Anatomy

- **Sorted largest first**, unless the categories have a natural order (sizes, age bands): pass `keepOrder`.
- **One colour.** The length already shows the value; colouring by value repeats it.
- **The axis starts at zero.** A cropped axis makes small differences look huge.
- **Every bar is labelled** with its value at the end.
- **Beyond 12 bars**, the top 11 stay and the rest become "Other (n)".

## Edge cases

| State | What the chart does |
|---|---|
| Empty | "No data for this period" |
| Single category | One labelled bar; a KPI tile is usually better |
| All zeros | Zero-length bars labelled 0, on a 0–1 axis |
| Outlier | Linear scale; labels keep the short bars readable |
| Negative values | Bars extend left from a zero line |
| Many categories | Top 11 + "Other (n)" |
| Long names | Truncated at 24 characters, full name in the tooltip |
| Large numbers | `৳35.2Cr` |

## Code

Rows are `{ category, value }`; duplicates are summed. Options: `label`, `locale`, `currency`, `keepOrder`, `maxBars`, `otherLabel`.
