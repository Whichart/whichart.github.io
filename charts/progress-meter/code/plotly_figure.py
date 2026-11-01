"""Progress meter: a value against a target, with an optional pace marker. Plotly (Python), for notebooks and Dash.

Usage:
    fig = figure([{"value": 35000, "target": 50000, "elapsed": 0.6}], {"label": "Monthly revenue", "currency": "USD", "colors": colors})
    fig.update_layout(template=whichart_template)
`colors` holds good/bad/neutral (tokens.json delta), plus series, track and primary from the theme.
Public domain (CC0): copy, change and ship without attribution.
"""
import plotly.graph_objects as go

COMPACT_FROM = 100_000
MAX_LINE = 34
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
            head, tail, groups = s[:-3], s[-3:], []
            while len(head) > 2:
                groups.insert(0, head[-2:])
                head = head[:-2]
            s = ",".join(([head] if head else []) + groups + [tail])
        else:
            s = f"{n:,}"
        return f"{'-' if v < 0 else ''}{symbol}{s}"

    def display(v: float) -> str:
        if abs(v) < COMPACT_FROM:
            return full(v)
        sign, a = ("-" if v < 0 else ""), abs(v)
        for size, suffix in steps:
            if a >= size:
                return f"{sign}{symbol}{a / size:.1f}".removesuffix(".0") + suffix
        return full(v)

    return display


def meter_state(row: dict, o: dict):
    """Everything the meter shows, decided in one place: fill, pace, texts and status."""
    display = _formatters(o["locale"], o["currency"])
    value, target, elapsed = row.get("value"), row.get("target"), row.get("elapsed")
    if value is None:
        return None
    if target is None or target <= 0:
        return {"fill": 0, "pace": None, "track": False, "value": display(value), "of": o["no_target_message"], "status": None}
    ratio = value / target
    # Pace only matters until the target is reached.
    pace = elapsed if elapsed is not None and 0 < elapsed < 1 and ratio < 1 else None
    status = None
    if ratio >= 1:
        status = ("▲", f"{ratio:.0%} of target" if ratio > 1 else "Target met", "good")
    elif elapsed is not None and elapsed >= 1:
        status = ("▼", f"Missed by {display(target - value)}", "bad")
    elif pace is not None:
        expected = target * pace
        status = ("▲", f"Ahead of pace · {display(expected)} expected", "good") if value >= expected else ("▼", f"Behind pace · {display(expected)} expected", "bad")
    return {"fill": max(0.0, min(1.0, ratio)), "pace": pace, "track": True, "value": display(value), "of": f"of {display(target)} · {ratio:.0%}", "status": status}


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
    o = {"label": "Progress", "locale": "en-US", "currency": None, "empty_message": "No data yet", "no_target_message": "No target set", "colors": None, **(options or {})}
    colors = o["colors"] or {}
    s = meter_state(rows[0], o) if rows else None
    fig = go.Figure()
    common = {"xref": "paper", "yref": "paper", "x": 0, "xanchor": "left", "showarrow": False, "align": "left"}
    fig.add_annotation(text=_wrap(o["label"]), y=1, yanchor="top", font={"size": 14, "color": colors.get("neutral")}, **common)
    fig.add_annotation(text=f"<b>{s['value'] if s else '—'}</b>  <span style='font-size:14px'>{s['of'] if s else o['empty_message']}</span>", y=0.62, yanchor="middle", font={"size": 26}, **common)
    # Track and fill in one hue; the pace marker in primary ink.
    bar = {"xref": "paper", "yref": "paper", "y0": 0.30, "y1": 0.40, "line": {"width": 0}}
    if not s or s["track"]:
        fig.add_shape(type="rect", x0=0, x1=1, fillcolor=colors.get("track"), **bar)
    if s:
        if s["fill"] > 0:
            fig.add_shape(type="rect", x0=0, x1=s["fill"], fillcolor=(colors.get("series") or [None])[0], **bar)
        if s["pace"] is not None:
            fig.add_shape(type="line", x0=s["pace"], x1=s["pace"], xref="paper", yref="paper", y0=0.24, y1=0.46, line={"width": 2, "color": colors.get("primary")})
        if s["status"]:
            arrow, text, tone = s["status"]
            fig.add_annotation(text=f"{arrow} {text}", y=0, yanchor="bottom", font={"size": 14, "color": colors.get(tone)}, **common)
    fig.update_xaxes(visible=False)
    fig.update_yaxes(visible=False)
    fig.update_layout(height=170, margin={"l": 16, "r": 16, "t": 16, "b": 16}, showlegend=False)
    return fig
