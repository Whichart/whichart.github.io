"""Current vs previous period: this period's line over the previous one, aligned day by day. Plotly (Python).

Usage:
    fig = figure(rows, {"label": "Revenue", "currency": "USD", "colors": {"muted": "<ink.muted from tokens.json>"}})
    fig.update_layout(template=whichart_template)
Rows: [{"date": "2026-08-04", "value": 1722}, ...] daily, covering two periods (56 days for the default 28).
Public domain (CC0): copy, change and ship without attribution.
"""
from datetime import date, timedelta
import math

import plotly.graph_objects as go

MAX_TITLE = 40
COMPACT_FROM = 100_000
SYMBOLS = {"USD": "$", "EUR": "€", "GBP": "£", "INR": "₹", "BDT": "৳", "JPY": "¥"}
SOUTH_ASIAN = ("-IN", "-BD", "-NP", "-PK", "-LK")


def _formatters(locale: str, currency: str | None):
    symbol = SYMBOLS.get(currency, f"{currency} ") if currency else ""
    south_asian = locale.endswith(SOUTH_ASIAN)
    steps = [(1e7, "Cr"), (1e5, "L"), (1e3, "K")] if south_asian else [(1e12, "T"), (1e9, "B"), (1e6, "M"), (1e3, "K")]

    def full(v: float) -> str:
        n = round(abs(v))
        s = str(n)
        if south_asian and len(s) > 3:
            head, tail = s[:-3], s[-3:]
            groups = []
            while len(head) > 2:
                groups.insert(0, head[-2:])
                head = head[:-2]
            s = ",".join(([head] if head else []) + groups + [tail])
        elif not south_asian:
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


def windows(rows: list[dict], n: int):
    """The last n days and the n before them, aligned by position. Missing days are None."""
    by_date = {r["date"]: r["value"] for r in rows if r.get("date")}
    if not by_date:
        return [], [], False
    end, first = date.fromisoformat(max(by_date)), date.fromisoformat(min(by_date))
    start = max(end - timedelta(n - 1), first)
    current, previous = [], []
    for i in range((end - start).days + 1):
        d = start + timedelta(i)
        current.append((d.isoformat(), by_date.get(d.isoformat())))
        p = d - timedelta(n)
        previous.append((p.isoformat(), by_date.get(p.isoformat())))
    return current, previous, any(v is not None for _, v in previous)


def figure(rows: list[dict], options: dict | None = None) -> go.Figure:
    o = {
        "label": "Value",
        "locale": "en-US",
        "currency": None,
        "days": 28,
        "empty_message": "No data for this period",
        "no_previous_message": "No previous period to compare yet",
        "colors": None,
        **(options or {}),
    }
    full, compact = _formatters(o["locale"], o["currency"])
    n = o["days"]
    current, previous, has_previous = windows(rows, n)
    x = [d for d, _ in current]
    fig = go.Figure()
    # The current period is added first so it keeps the first series colour.
    single = len(current) == 1
    fig.add_scatter(
        x=x,
        y=[v for _, v in current],
        name=f"Last {n} days",
        mode="lines+markers+text" if single else "lines",
        text=[compact(v) if v is not None and abs(v) >= COMPACT_FROM else full(v) if v is not None else "" for _, v in current] if single else None,
        textposition="top center",
        connectgaps=False,
        # Explicit colour, because the traces are reordered below.
        line={"color": ((o["colors"] or {}).get("series") or [None])[0]},
        customdata=[f"{d}: {full(v) if v is not None else '—'}" for d, v in current],
        hovertemplate="%{customdata}<extra></extra>",
    )
    if has_previous:
        fig.add_scatter(
            x=x,
            y=[v for _, v in previous],
            name=f"Previous {n} days",
            mode="lines",
            line={"dash": "dash", "color": (o["colors"] or {}).get("muted")},
            connectgaps=False,
            customdata=[f"{d}: {full(v) if v is not None else '—'}" for d, v in previous],
            hovertemplate="%{customdata}<extra></extra>",
        )
        # Draw the previous period underneath the current one.
        fig.data = fig.data[::-1]
    values = [v for _, v in current + previous if v is not None]
    all_zero = bool(values) and all(v == 0 for v in values)
    ticks = _nice_ticks(min(0, *values), max(values)) if values and not all_zero else [0, 1]
    fig.update_yaxes(tickvals=ticks, ticktext=[compact(t) for t in ticks], range=[ticks[0], ticks[-1]])
    fig.update_xaxes(type="date", tickformat="%b %-d", showticklabels=bool(current))
    if single:
        d = date.fromisoformat(x[0])
        fig.update_xaxes(range=[(d - timedelta(1)).isoformat(), (d + timedelta(1)).isoformat()], dtick=86400000)
    if not current:
        fig.add_annotation(text=o["empty_message"], xref="paper", yref="paper", x=0.5, y=0.5, showarrow=False)
    elif not has_previous:
        fig.add_annotation(text=o["no_previous_message"], xref="paper", yref="paper", x=1, y=1.12, xanchor="right", showarrow=False, font={"size": 12})
    label = o["label"]
    fig.update_layout(
        title={"text": label if len(label) <= MAX_TITLE else label[: MAX_TITLE - 1].rstrip() + "…", "x": 0, "xanchor": "left", "y": 1, "yref": "container", "yanchor": "top", "pad": {"t": 8}},
        legend={"orientation": "h", "y": 1, "yanchor": "bottom", "x": 0, "traceorder": "reversed" if has_previous else "normal"},
        hovermode="x unified",
        margin={"l": 8, "r": 16, "t": 66, "b": 8},
    )
    return fig
