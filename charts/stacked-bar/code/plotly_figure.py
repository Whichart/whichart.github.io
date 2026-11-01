"""Stacked bar chart: a total per group, split into its parts. Plotly (Python).

Usage: fig = figure(rows, {"label": "Revenue by channel", "currency": "USD", "colors": {"surface": "<surface from tokens.json>"}})
       fig.update_layout(template=whichart_template)
Rows (long format): [{"group": "Jul", "series": "Web", "value": 48210}, ...]. Groups keep their input order.
Public domain (CC0): copy, change and ship without attribution.
"""
import math

import plotly.graph_objects as go

MAX_TITLE = 40
MAX_NAME = 20
MAX_PARTS = 5
COMPACT_FROM = 100_000
SYMBOLS = {"USD": "$", "EUR": "€", "GBP": "£", "INR": "₹", "BDT": "৳", "JPY": "¥"}
SOUTH_ASIAN = ("-IN", "-BD", "-NP", "-PK", "-LK")


def _short(s: str, n: int) -> str:
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def _formatters(locale: str, currency: str | None):
    symbol = SYMBOLS.get(currency, f"{currency} ") if currency else ""
    south_asian = locale.endswith(SOUTH_ASIAN)
    steps = [(1e7, "Cr"), (1e5, "L"), (1e3, "K")] if south_asian else [(1e12, "T"), (1e9, "B"), (1e6, "M"), (1e3, "K")]

    def full(v: float) -> str:
        n = round(abs(v))
        s = str(n)
        if south_asian and len(s) > 3:
            head, tail, groups = s[:-3], s[-3:], []
            while len(head) > 2:
                groups.insert(0, head[-2:])
                head = head[:-2]
            s = ",".join(([head] if head else []) + groups + [tail])
        else:
            s = f"{n:,}"
        return f"{'-' if v < 0 else ''}{symbol}{s}"

    def compact(v: float) -> str:
        sign, a = ("-" if v < 0 else ""), abs(v)
        for size, suffix in steps:
            if a >= size:
                return f"{sign}{symbol}{a / size:.1f}".removesuffix(".0") + suffix
        return f"{sign}{symbol}{a:.1f}".removesuffix(".0")

    return full, compact


def _nice_ticks(lo: float, hi: float, count: int = 5) -> list[float]:
    if hi <= lo:
        hi = lo + 1
    raw = (hi - lo) / count
    mag = 10 ** math.floor(math.log10(raw))
    step = next(m * mag for m in (1, 2, 2.5, 5, 10) if m * mag >= raw)
    ticks, t = [], math.floor(lo / step) * step
    while True:
        ticks.append(round(t, 10))
        if t >= hi - step * 1e-9:
            return ticks
        t += step


def prepare(rows: list[dict], other: str):
    """Groups in input order, parts in order of first appearance, small parts folded into Other."""
    groups = list(dict.fromkeys(r["group"] for r in rows))
    order = list(dict.fromkeys(r["series"] for r in rows))
    totals = {s: 0.0 for s in order}
    for r in rows:
        totals[r["series"]] += abs(r["value"] or 0)
    folded: set[str] = set()
    keep = order
    if len(order) > MAX_PARTS:
        top = set(sorted(order, key=lambda s: -totals[s])[: MAX_PARTS - 1])
        keep = [s for s in order if s in top]
        folded = {s for s in order if s not in top}
    parts = keep + ([other] if folded else [])
    cell: dict[tuple[str, str], float] = {}
    for r in rows:
        if r["value"] is None:
            continue
        k = (other if r["series"] in folded else r["series"], r["group"])
        cell[k] = cell.get(k, 0) + r["value"]
    return groups, parts, cell


def figure(rows: list[dict], options: dict | None = None) -> go.Figure:
    o = {"label": "Value", "locale": "en-US", "currency": None, "other_label": "Other", "empty_message": "No data for this period", "colors": None, **(options or {})}
    full, compact = _formatters(o["locale"], o["currency"])
    surface = (o["colors"] or {}).get("surface")
    groups, parts, cell = prepare(rows, o["other_label"])
    fig = go.Figure()
    for part in parts:
        fig.add_bar(
            x=groups,
            y=[cell.get((part, g), 0) for g in groups],
            name=_short(part, MAX_NAME),
            # A 2px gap in the surface colour separates the segments.
            marker={"line": {"width": 1, "color": surface}} if surface else None,
            customdata=[f"{part}: {full(cell.get((part, g), 0))}" for g in groups],
            hovertemplate="%{customdata}<extra></extra>",
        )
    totals = [sum(cell.get((p, g), 0) for p in parts) for g in groups]
    tops = [sum(max(0, cell.get((p, g), 0)) for p in parts) for g in groups]
    lows = [sum(min(0, cell.get((p, g), 0)) for p in parts) for g in groups]
    all_zero = bool(groups) and all(v == 0 for v in cell.values())
    if groups and not all_zero:
        # Net total on top of each stack.
        for g, top, tot in zip(groups, tops, totals):
            fig.add_annotation(x=g, y=top, text=compact(tot) if abs(tot) >= COMPACT_FROM else full(tot), showarrow=False, yanchor="bottom", yshift=2, font={"size": 12})
    ticks = _nice_ticks(min(0, *lows), max(tops) * 1.08) if groups and not all_zero else [0, 1]
    fig.update_yaxes(tickvals=ticks, ticktext=[compact(t) for t in ticks], range=[ticks[0], ticks[-1]], zeroline=True)
    fig.update_xaxes(tickvals=groups, ticktext=[_short(g, 12) for g in groups], visible=bool(groups))
    if 0 < len(groups) < 4:
        # A few groups keep a normal bar width instead of filling the plot.
        pad = (4 - len(groups)) / 2
        fig.update_xaxes(range=[-0.5 - pad, len(groups) - 0.5 + pad])
    if not groups:
        fig.add_annotation(text=o["empty_message"], xref="paper", yref="paper", x=0.5, y=0.5, showarrow=False)
    rows_needed, row = 1, 0.0
    for p in parts:
        w = len(_short(p, MAX_NAME)) * 7 + 48
        if row and row + w > 400:
            rows_needed, row = rows_needed + 1, 0.0
        row += w
    label = o["label"]
    fig.update_layout(
        barmode="relative",  # negative parts stack below zero
        title={"text": _short(label, MAX_TITLE), "x": 0, "xanchor": "left", "y": 1, "yref": "container", "yanchor": "top", "pad": {"t": 8}},
        legend={"orientation": "h", "y": 1, "yanchor": "bottom", "x": 0, "traceorder": "normal"},
        bargap=0.35,
        margin={"l": 8, "r": 16, "t": 44 + 22 * rows_needed, "b": 8},
    )
    return fig
