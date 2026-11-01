"""Horizontal bar chart: compare one measure across categories, largest first. Plotly (Python).

Usage: fig = figure(rows, {"label": "Revenue by category", "currency": "USD"}); fig.update_layout(template=whichart_template)
Rows: [{"category": "Shoes", "value": 48210}, ...]. Duplicates are summed.
Public domain (CC0): copy, change and ship without attribution.
"""
import math

import plotly.graph_objects as go

MAX_TITLE = 40
MAX_NAME = 24
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


def prepare(rows: list[dict], keep_order: bool = False, max_bars: int = 12, other: str = "Other") -> list[tuple[str, float]]:
    """Sum duplicates, sort largest first, and fold the tail into Other beyond max_bars."""
    sums: dict[str, float] = {}
    for r in rows:
        if r.get("category"):
            sums[r["category"]] = sums.get(r["category"], 0) + (r["value"] or 0)
    bars = list(sums.items())
    if not keep_order:
        bars.sort(key=lambda b: -b[1])
    if len(bars) > max_bars:
        rest = bars[max_bars - 1 :]
        bars = bars[: max_bars - 1] + [(f"{other} ({len(rest)})", sum(v for _, v in rest))]
    return bars


def figure(rows: list[dict], options: dict | None = None) -> go.Figure:
    o = {"label": "Value", "locale": "en-US", "currency": None, "keep_order": False, "max_bars": 12, "other_label": "Other", "empty_message": "No data for this period", **(options or {})}
    full, compact = _formatters(o["locale"], o["currency"])
    bars = prepare(rows, o["keep_order"], o["max_bars"], o["other_label"])
    names = [b[0] for b in bars]
    values = [b[1] for b in bars]
    fig = go.Figure(
        go.Bar(
            x=values,
            y=[_short(n, MAX_NAME) for n in names],
            orientation="h",
            # Every bar is labelled at its end, so exact values never depend on reading the axis.
            text=[compact(v) if abs(v) >= COMPACT_FROM else full(v) for v in values],
            textposition="outside",
            cliponaxis=False,
            customdata=[f"{n}: {full(v)}" for n, v in bars],
            hovertemplate="%{customdata}<extra></extra>",
            marker={"cornerradius": 4},
        )
    )
    all_zero = bool(values) and all(v == 0 for v in values)
    # Bars always start at zero: length is the value. Leave room past the longest bar for its label.
    ticks = _nice_ticks(min(0, *values), max(0, *values)) if values and not all_zero else [0, 1]
    span = ticks[-1] - ticks[0]
    fig.update_xaxes(tickvals=ticks, ticktext=[compact(t) for t in ticks], range=[ticks[0] - (span * 0.3 if ticks[0] < 0 else 0), ticks[-1] + span * 0.12], zeroline=True, showgrid=True)
    # Largest first, top down; at least 6 slots so a few bars keep a normal thickness.
    fig.update_yaxes(range=[max(len(bars), 6) - 0.5, -0.5], showgrid=False, visible=bool(bars))
    if not values:
        fig.add_annotation(text=o["empty_message"], xref="paper", yref="paper", x=0.5, y=0.5, showarrow=False)
    label = o["label"]
    fig.update_layout(
        title={"text": _short(label, MAX_TITLE), "x": 0, "xanchor": "left"},
        showlegend=False,
        bargap=0.3,
        margin={"l": 8, "r": 56, "t": 44, "b": 8},
    )
    return fig
