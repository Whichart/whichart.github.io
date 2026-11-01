"""Sparkline: the shape of one measure over time, small enough for a KPI tile. Plotly (Python).

Usage: fig = figure(rows, {"label": "Revenue"}); fig.update_layout(template=whichart_template)
Rows: [{"date": "2026-09-01", "value": 1722}, ...] at daily intervals.
Public domain (CC0): copy, change and ship without attribution.
"""
from datetime import date, timedelta

import plotly.graph_objects as go


def _fill_daily_gaps(rows: list[dict]) -> list[tuple[str, float | None]]:
    by_date = {r["date"]: r["value"] for r in rows if r.get("date")}
    if not by_date:
        return []
    start, end = date.fromisoformat(min(by_date)), date.fromisoformat(max(by_date))
    return [((d := (start + timedelta(i)).isoformat()), by_date.get(d)) for i in range((end - start).days + 1)]


def figure(rows: list[dict], options: dict | None = None) -> go.Figure:
    o = {"label": "Value", "empty_message": "No data yet", "height": 64, **(options or {})}
    data = _fill_daily_gaps(rows)
    x = [d for d, _ in data]
    y = [v for _, v in data]
    values = [v for v in y if v is not None]
    all_zero = bool(values) and all(v == 0 for v in values)
    lo, hi = (min(values), max(values)) if values else (0, 1)
    pad = (hi - lo) * 0.1 or 1
    last_i = max((i for i, v in enumerate(y) if v is not None), default=None)
    # Mark the latest value on the same trace so it keeps the line's colour.
    sizes = [6 if i == last_i else 0 for i in range(len(y))]

    fig = go.Figure(
        go.Scatter(x=x, y=y, mode="lines+markers", marker={"size": sizes}, line={"width": 2}, connectgaps=False, name=o["label"], hovertemplate="%{x|%b %-d}: %{y:,.0f}<extra></extra>")
    )
    if lo < 0 < hi:
        fig.add_hline(y=0, line={"dash": "dash", "width": 1}, opacity=0.5)
    if not data:
        fig.add_annotation(text=o["empty_message"], xref="paper", yref="paper", x=0.5, y=0.5, showarrow=False, font={"size": 12})
    fig.update_xaxes(visible=False)
    # The shape is the point, so the axis fits the data instead of starting at zero.
    fig.update_yaxes(visible=False, range=[0, 1] if all_zero or not values else [lo - pad, hi + pad])
    fig.update_layout(height=o["height"], margin={"l": 4, "r": 8, "t": 6, "b": 6}, showlegend=False)
    return fig
