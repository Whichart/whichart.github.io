"""Funnel chart: how many people reach each step, and where they drop off. Plotly (Python).

Drawn as left-aligned bars (lengths compare accurately; trapezoids exaggerate), stages in your order.
Usage: fig = figure(rows, {"label": "Checkout funnel"}); fig.update_layout(template=whichart_template)
Rows: [{"stage": "Visited", "value": 48200}, {"stage": "Added to cart", "value": 12400}, ...] in order.
Public domain (CC0): copy, change and ship without attribution.
"""
import plotly.graph_objects as go

MAX_TITLE = 40
MAX_STAGE = 20
COMPACT_FROM = 100_000
SOUTH_ASIAN = ("-IN", "-BD", "-NP", "-PK", "-LK")


def _short(s: str, n: int) -> str:
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def _count(v: float, locale: str) -> str:
    if abs(v) < COMPACT_FROM:
        return f"{v:,.0f}"
    steps = [(1e7, "Cr"), (1e5, "L"), (1e3, "K")] if locale.endswith(SOUTH_ASIAN) else [(1e9, "B"), (1e6, "M"), (1e3, "K")]
    for size, suffix in steps:
        if abs(v) >= size:
            return f"{v / size:.1f}".removesuffix(".0") + suffix
    return f"{v:,.0f}"


def steps(rows: list[dict]) -> list[dict]:
    """Per-stage numbers: share of the first stage, conversion from the previous one, biggest drop."""
    lst = [{"stage": r["stage"], "value": r["value"] or 0} for r in rows if r.get("stage")]
    first = lst[0]["value"] if lst else 0
    rates = [None if i == 0 or lst[i - 1]["value"] <= 0 else s["value"] / lst[i - 1]["value"] for i, s in enumerate(lst)]
    drops = [r for r in rates if r is not None and r <= 1]
    worst = min(drops) if drops else None
    for i, s in enumerate(lst):
        r = rates[i]
        s["of_start"] = f"{s['value'] / first:.0%}" if first > 0 else "—"
        s["from_previous"] = None if r is None else f"{r:.0%} continue"
        s["biggest_drop"] = r is not None and r == worst and len(lst) > 2 and r < 1
        s["increase"] = r is not None and r > 1
    return lst


def figure(rows: list[dict], options: dict | None = None) -> go.Figure:
    o = {"label": "Funnel", "locale": "en-US", "empty_message": "No data for this period", "negative_message": "Funnel stages can’t be negative", **(options or {})}
    lst = steps(rows)
    fig = go.Figure()
    message = o["empty_message"] if not lst else o["negative_message"] if any(s["value"] < 0 for s in lst) else None
    if message:
        fig.add_annotation(text=message, xref="paper", yref="paper", x=0.5, y=0.5, showarrow=False)
        fig.update_xaxes(visible=False)
        fig.update_yaxes(visible=False)
    else:
        # Stage name, then the step conversion: the drop-off is the point of a funnel.
        ticks = [
            _short(s["stage"], MAX_STAGE)
            + (f"<br><span style='font-size:11px'>{'▲ ' if s['increase'] else ''}{s['from_previous']}{' · biggest drop' if s['biggest_drop'] else ''}</span>" if s["from_previous"] else "")
            for s in lst
        ]
        fig.add_bar(
            x=[s["value"] for s in lst],
            y=list(range(len(lst))),
            orientation="h",
            text=[f"{_count(s['value'], o['locale'])} · {s['of_start']}" for s in lst],
            textposition="outside",
            cliponaxis=False,
            marker={"cornerradius": 4},
            hovertemplate="%{text}<extra></extra>",
        )
        top = max((s["value"] for s in lst), default=0)
        fig.update_xaxes(visible=False, range=[0, (top or 1) * 1.45])
        fig.update_yaxes(tickvals=list(range(len(lst))), ticktext=ticks, range=[max(len(lst), 5) - 0.5, -0.5], showgrid=False)
    fig.update_layout(title={"text": _short(o["label"], MAX_TITLE), "x": 0, "xanchor": "left"}, showlegend=False, bargap=0.35, margin={"l": 8, "r": 16, "t": 44, "b": 8})
    return fig
