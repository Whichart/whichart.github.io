"""Multi-line chart: 2–5 measures or segments over time, on one shared axis. Plotly (Python).

Usage: fig = figure(rows, {"label": "Revenue by channel", "currency": "USD"}); fig.update_layout(template=whichart_template)
Rows (long format): [{"date": "2026-07-01", "series": "Web", "value": 1722}, ...] at daily intervals.
Colours come from the template, in fixed order. Public domain (CC0).
"""
from datetime import date, timedelta
import math

import plotly.graph_objects as go

MAX_TITLE = 40
MAX_NAME = 24
MAX_SERIES = 5
END_LABELS_UP_TO = 4
LABEL_GAP = 0.08  # end labels need endpoints at least 8% of the value range apart
SYMBOLS = {"USD": "$", "EUR": "€", "GBP": "£", "INR": "₹", "BDT": "৳", "JPY": "¥"}
SOUTH_ASIAN = ("-IN", "-BD", "-NP", "-PK", "-LK")


def _short(s: str, n: int) -> str:
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def _formatters(locale: str, currency: str | None):
    symbol = SYMBOLS.get(currency, f"{currency} ") if currency else ""
    steps = [(1e7, "Cr"), (1e5, "L"), (1e3, "K")] if locale.endswith(SOUTH_ASIAN) else [(1e12, "T"), (1e9, "B"), (1e6, "M"), (1e3, "K")]

    def compact(v: float) -> str:
        sign, a = ("-" if v < 0 else ""), abs(v)
        for size, suffix in steps:
            if a >= size:
                return f"{sign}{symbol}{a / size:.1f}".removesuffix(".0") + suffix
        return f"{sign}{symbol}{a:.1f}".removesuffix(".0")

    return compact


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


def _prepare(rows: list[dict], other: str):
    """Group by series, sum duplicates, fold small series into Other, fill missing days with None."""
    order = list(dict.fromkeys(r["series"] for r in rows))
    totals = {s: 0.0 for s in order}
    for r in rows:
        totals[r["series"]] += r["value"] or 0
    folded: list[str] = []
    keep = order
    if len(order) > MAX_SERIES:
        top = set(sorted(order, key=lambda s: -totals[s])[: MAX_SERIES - 1])
        keep = [s for s in order if s in top]
        folded = [s for s in order if s not in top]
    names = keep + ([other] if folded else [])
    dates = sorted({r["date"] for r in rows})
    days = []
    if dates:
        start, end = date.fromisoformat(dates[0]), date.fromisoformat(dates[-1])
        days = [(start + timedelta(i)).isoformat() for i in range((end - start).days + 1)]
    cell: dict[tuple[str, str], float] = {}
    for r in rows:
        if r["value"] is None:
            continue
        k = (other if r["series"] in folded else r["series"], r["date"])
        cell[k] = cell.get(k, 0) + r["value"]
    return names, days, cell


def figure(rows: list[dict], options: dict | None = None) -> go.Figure:
    o = {"label": "Value", "locale": "en-US", "currency": None, "empty_message": "No data for this period", "other_label": "Other", **(options or {})}
    compact = _formatters(o["locale"], o["currency"])
    names, days, cell = _prepare(rows, o["other_label"])
    fig = go.Figure()
    for name in names:
        fig.add_scatter(
            x=days,
            y=[cell.get((name, d)) for d in days],
            name=_short(name, MAX_NAME),
            mode="lines+markers" if len(days) == 1 else "lines",
            connectgaps=False,
        )
    values = [v for v in cell.values()]
    all_zero = bool(values) and all(v == 0 for v in values)
    ticks = _nice_ticks(min(0, *values), max(values)) if values and not all_zero else [0, 1]
    fig.update_yaxes(tickvals=ticks, ticktext=[compact(t) for t in ticks], range=[ticks[0], ticks[-1]])
    fig.update_xaxes(type="date", tickformat="%b %-d", showticklabels=bool(days))
    if len(days) == 1:
        d = date.fromisoformat(days[0])
        fig.update_xaxes(range=[(d - timedelta(1)).isoformat(), (d + timedelta(1)).isoformat()], dtick=86400000)
    # Name each line at its end (up to 4), unless two endpoints are close enough for labels to collide.
    lasts = {n: next((d for d in reversed(days) if cell.get((n, d)) is not None), None) for n in names}
    ends = sorted(cell[(n, d)] for n, d in lasts.items() if d)
    span = (max(values) - min(0, *values)) if values else 0
    end_labels = len(names) <= END_LABELS_UP_TO and len(days) > 1 and span > 0 and all(b - a >= span * LABEL_GAP for a, b in zip(ends, ends[1:]))
    if end_labels:
        for name in names:
            last = lasts[name]
            if last:
                fig.add_annotation(x=last, y=cell[(name, last)], text=_short(name, 14), showarrow=False, xanchor="left", xshift=6, font={"size": 12})
    if not days:
        fig.add_annotation(text=o["empty_message"], xref="paper", yref="paper", x=0.5, y=0.5, showarrow=False)
    # The legend sits between the title and the plot; leave a row of space per line of legend items.
    legend_rows, row = 1, 0.0
    for n in names:
        w = len(_short(n, MAX_NAME)) * 7 + 48
        if row and row + w > 400:
            legend_rows, row = legend_rows + 1, 0.0
        row += w
    fig.update_layout(
        title={"text": _short(o["label"], MAX_TITLE), "x": 0, "xanchor": "left", "y": 1, "yref": "container", "yanchor": "top", "pad": {"t": 8}},
        legend={"orientation": "h", "y": 1, "yanchor": "bottom", "x": 0},
        hovermode="x unified",
        margin={"l": 8, "r": 96 if end_labels else 16, "t": 44 + 22 * legend_rows, "b": 8},
    )
    return fig
