# Funnel chart

How many people reach each step of a process, such as visit → product → cart → checkout → purchase, and **where most of them drop off**.

## When to use it

- Checkout, sign-up and onboarding flows with ordered steps.
- The question is "where do we lose people?".

## When not to

| Situation | Use instead |
|---|---|
| Steps can be skipped or happen in any order | [Horizontal bar chart](../bar-horizontal/) with a note |
| People branch into several paths | Sankey diagram |
| Comparing funnels across many segments | A table of conversion rates |

## Bars, not trapezoids

Classic funnels are drawn as centred trapezoids, which look good but make drops look bigger and harder to compare. Whichart draws **left-aligned bars on a common baseline**: lengths are what people compare accurately.

## Anatomy

- Stages **in your order**, top to bottom.
- Each bar is labelled with its **count** and its **share of the first stage**: "9,860 · 20%".
- Under each stage name is the **step conversion**: "31% continue". The drop between steps is the story.
- The **biggest drop** is named in text ("· biggest drop"), not just shown by length.
- A stage with **more people than the one before** gets a ▲. It usually means steps are counted differently (express checkout skipping the cart), so check it before presenting.

## Edge cases

| State | What the chart does |
|---|---|
| Empty | "No data for this period" |
| One stage | One bar at 100% |
| All zeros | Bars labelled 0 with "—" |
| A later stage is bigger | Flagged with ▲ |
| Negative counts | "Funnel stages can’t be negative" |
| Long stage names | Truncated at 20 characters, full in the tooltip |
| Large numbers | `4.6Cr` |

## Code

Rows are `{ stage, value }` **in order**. The profiler recognises a column named `stage` or `step` as ordered.
