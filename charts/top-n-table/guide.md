# Top-N table

A ranked list with **exact values, shares and inline bars**. People scan names and want real numbers; the bars add the comparison without losing the table.

## When to use it

- "What sells best?", top pages, biggest customers, top referrers.
- More than 8 items, or names too long for a chart axis.

## When not to

| Situation | Use instead |
|---|---|
| Fewer than 4 items | [Horizontal bar chart](../bar-horizontal/) |
| Several columns, sorting, filtering | Data table |
| The ranking over time | Line or slope chart |

## Anatomy

- **Rank**, **name**, **value** (right-aligned, tabular figures), **share** with an inline bar.
- **Full values**, grouped the reader's way (`৳35,19,33,000` in en-IN). Exactness is why people use a table.
- **Bars scale to the largest value**; one colour.
- **Beyond 10 rows**, the rest become "Other (n)" with no rank.
- A real `<table>` with a caption and column headers.

## Edge cases

| State | What it does |
|---|---|
| Empty | Header stays, one row: "No data yet" |
| One item | One row at 100% |
| All zeros | 0 values, empty bars, share "—" |
| Outlier | Its bar fills; others are tiny but keep exact values |
| Negative values | Sign kept, sorted last, no bar, no share |
| Many items | Top 10 + "Other (n)" |
| Long names | Truncated at 28 characters, full in the tooltip |

## Code

Plain DOM and React need no chart library. Plotly tables can't draw inline bars, so the Plotly version shows the share as a number. Options: `label`, `nameLabel`, `valueLabel`, `locale`, `currency`, `n`, `otherLabel`.
