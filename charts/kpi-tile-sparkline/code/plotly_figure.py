"""KPI tile with sparkline: the period's number, its change, and its daily shape. Plotly (Python), for notebooks and Dash.

Usage:
    tokens = json.load(open("tokens.json"))  # from @whichart/tokens
    fig = figure(rows, {"label": "Revenue", "currency": "USD", "colors": tokens["modes"]["light"]["delta"]})
    fig.update_layout(template=json.load(open("plotly-light.json")))
Rows: daily [{"date": "2026-09-01", "value": 1722}, ...] covering two periods (56 days for the default 28).
Public domain (CC0): copy, change and ship without attribution.
"""
from datetime import date, timedelta

import plotly.graph_objects as go

COMPACT_FROM = 100_000
MULTIPLE_FROM = 6
MAX_LINE = 32
SYMBOLS = {"USD": "$", "EUR": "€", "GBP": "£", "INR": "₹", "BDT": "৳", "JPY": "¥"}
SOUTH_ASIAN = ("-IN", "-BD", "-NP", "-PK", "-LK")


def _formatters(locale: str, currency: str | None):
    symbol = SYMBOLS.get(currency, f"{currency} ") if currency else ""
    south_asian = locale.endswith(SOUTH_ASIAN)
    steps = [(1e7, "Cr"), (1e5, "L"), (1e3, "K")] if south_asian else [(1e12, "T"), (1e9, "B"), (1e6, "M"), (1e3, "K")]

    def group(n: int) -> str:
        s = str(n)
        if not south_asian or len(s) <= 3:
            return f"{n:,}"
        head, tail, groups = s[:-3], s[-3:], []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        return ",".join(([head] if head else []) + groups + [tail])

    def full(v: float) -> str:
        a = abs(v)
        whole = int(a)
        frac = "" if a == whole else f"{a - whole:.2f}"[1:] if currency else f"{a - whole:.2f}"[1:].rstrip("0")
        return f"{'-' if v < 0 else ''}{symbol}{group(whole)}{frac}"

    def display(v: float) -> str:
        if abs(v) < COMPACT_FROM:
            return full(v)
        sign, a = ("-" if v < 0 else ""), abs(v)
        for size, suffix in steps:
            if a >= size:
                return f"{sign}{symbol}{a / size:.1f}".removesuffix(".0") + suffix
        return full(v)

    return full, display


def summarise(rows: list[dict], days: int, aggregate: str):
    """The current period (last `days` days) and the one before, reduced to one number each, plus the daily series."""
    by_date = {r["date"]: r["value"] for r in rows if r.get("date")}
    if not by_date:
        return None, None, []
    end, first = date.fromisoformat(max(by_date)), date.fromisoformat(min(by_date))

    def take(start: date, stop: date) -> list:
        start = max(start, first)
        return [by_date.get((start + timedelta(i)).isoformat()) for i in range((stop - start).days + 1)]

    def reduce(xs: list):
        v = [x for x in xs if x is not None]
        if not v:
            return None
        if aggregate == "last":
            return v[-1]
        return sum(v) / len(v) if aggregate == "average" else sum(v)

    series = take(end - timedelta(days - 1), end)
    prev_end = end - timedelta(days)
    previous = reduce(take(prev_end - timedelta(days - 1), prev_end)) if prev_end >= first else None
    return reduce(series), previous, series


def describe_change(value: float, previous: float | None, o: dict) -> tuple[str, str]:
    _, display = _formatters(o["locale"], o["currency"])
    label = o["comparison_label"]
    if previous is None:
        return o["new_label"], "neutral"
    diff = value - previous
    if diff == 0:
        return f"No change {label}", "neutral"
    up = diff > 0
    arrow = "▲" if up else "▼"
    tone = "good" if up == (o["good_direction"] == "up") else "bad"
    if previous <= 0 or (value < 0) != (previous < 0) or value == 0:
        return f"{arrow} {'+' if up else '−'}{display(abs(diff))} {label}", tone
    ratio = value / previous
    if ratio >= MULTIPLE_FROM:
        return f"{arrow} {ratio:.1f}".removesuffix(".0") + f"× {label}", tone
    return f"{arrow} {abs(diff / previous) * 100:.1f}% {label}", tone


def _wrap(text: str) -> str:
    words, lines, line = text.split(), [], ""
    for w in words:
        if len(line) + len(w) + 1 > MAX_LINE and line:
            lines.append(line)
            line = w
        else:
            line = f"{line} {w}".strip()
    lines.append(line)
    if len(lines) > 2:
        lines = [lines[0], lines[1][: MAX_LINE - 1].rstrip() + "…"]
    return "<br>".join(lines)


def figure(rows: list[dict], options: dict | None = None) -> go.Figure:
    o = {
        "label": "Value",
        "locale": "en-US",
        "currency": None,
        "good_direction": "up",
        "days": 28,
        "aggregate": "sum",
        "comparison_label": None,
        "empty_message": "No data yet",
        "new_label": "New",
        "colors": None,
        **(options or {}),
    }
    o["comparison_label"] = o["comparison_label"] or f"vs previous {o['days']} days"
    full, display = _formatters(o["locale"], o["currency"])
    colors = o["colors"] or {}
    value, previous, series = summarise(rows, o["days"], o["aggregate"])
    if value is None:
        big, change, tone = "—", o["empty_message"], "neutral"
    else:
        big = display(value)
        change, tone = describe_change(value, previous, o)

    fig = go.Figure()
    common = {"xref": "paper", "yref": "paper", "x": 0, "xanchor": "left", "showarrow": False, "align": "left"}
    fig.add_annotation(text=_wrap(o["label"]), y=1, yanchor="top", font={"size": 14, "color": colors.get("neutral")}, **common)
    fig.add_annotation(text=f"<b>{big}</b>", y=0.5, yanchor="middle", font={"size": 32}, **common)
    fig.add_annotation(text=change, y=0, yanchor="bottom", font={"size": 14, "color": colors.get(tone)}, **common)

    values = [v for v in series if v is not None]
    if values:
        lo, hi = min(values), max(values)
        last = max(i for i, v in enumerate(series) if v is not None)
        # The sparkline sits to the right of the number; it breaks at missing days.
        fig.add_scatter(
            x=list(range(len(series))),
            y=series,
            mode="lines+markers",
            marker={"size": [6 if i == last else 0 for i in range(len(series))]},
            line={"width": 2, "color": (colors.get("series") or [None])[0]},
            connectgaps=False,
            hoverinfo="skip",
            xaxis="x",
            yaxis="y",
        )
        if lo < 0 < hi:
            fig.add_hline(y=0, line={"dash": "dot", "width": 1, "color": colors.get("muted")})
        pad = (hi - lo) * 0.1 or 1
        fig.update_yaxes(range=[0, 1] if lo == hi == 0 else [lo - pad, hi + pad])
    fig.update_xaxes(visible=False, domain=[0.64, 1])
    fig.update_yaxes(visible=False, domain=[0.35, 0.72])
    fig.update_layout(height=170, margin={"l": 16, "r": 16, "t": 16, "b": 16}, showlegend=False)
    return fig
