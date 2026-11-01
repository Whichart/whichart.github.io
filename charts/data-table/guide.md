# Data table

When people need to **look things up**, a well-formatted table beats any chart. The work is in the formatting: typed columns, right-aligned figures, and colour only where something needs attention.

## When to use it

- Exact values, several measures per item: products with orders, revenue and change.
- Under a chart, as its detail and accessible fallback.

## When not to

| Situation | Use instead |
|---|---|
| The message is a shape | A chart, with the table beside it |
| One measure, ranked | [Top-N table](../top-n-table/) |
| A slide | A chart; nobody reads a table across a room |

## Anatomy

- **Typed columns**: `text`, `number`, `currency`, `percent`, `change`. Numbers are right-aligned with tabular figures.
- **Full values**, grouped the reader's way (`৳35,19,33,000` in en-IN). Exactness is the point.
- **Change cells** carry an arrow, a sign and a colour; colour follows whether the move is good (`goodDirection: 'down'` for refunds or churn).
- **Never a blank**: "—" for missing values, "New" when there's no previous period, "No change" for zero.
- **Sortable headers** (keyboard-reachable buttons, with `aria-sort`); empty values always sort last.
- **The first 10 rows**, then "Show all N rows".

## Edge cases

| State | What it does |
|---|---|
| Empty | Headers stay, one row: "No data yet" |
| All zeros | 0 shown (a real value); change "No change" |
| Negative values | Sign kept; change coloured by good or bad |
| Many rows | First 10 + "Show all N rows" |
| Long text | Truncated at 28 characters, full in the tooltip |
| No previous period | Change shows "New" |

## Code

Pass `columns` with a `format` for each, or let it infer (numbers become number columns). Plain DOM and React sort and page; Plotly tables can't, so that version shows the first rows sorted by `sort_by` with a "Showing 10 of N rows" note.
