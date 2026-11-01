"""Cohort retention heatmap: of the people who started in each month, how many came back later. Plotly (Python).

Usage: fig = figure(rows, {"label": "Customer retention", "colors": colors}); fig.update_layout(template=whichart_template)
`colors` holds `sequential` (low → high), `primary` and `surface` from tokens.json.
Rows: counts, one per cohort and period: [{"cohort": "Apr 2026", "period": 0, "value": 1024}, ...]. Period 0 is the cohort's size.
Public domain (CC0): copy, change and ship without attribution.
"""
import plotly.graph_objects as go

MAX_COHORT = 16


def _short(s: str, n: int) -> str:
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def _people(n: float) -> str:
    for size, suffix in ((1e9, "B"), (1e6, "M"), (1e3, "K")):
        if n >= size:
            return f"{n / size:.1f}".removesuffix(".0") + suffix
    return f"{n:,.0f}"


def prepare(rows: list[dict], max_cohorts: int = 12):
    cohorts = list(dict.fromkeys(r["cohort"] for r in rows))[-max_cohorts:]
    periods = sorted({int(r["period"]) for r in rows})
    count = {(r["cohort"], int(r["period"])): r["value"] for r in rows}
    size = {c: count.get((c, 0)) for c in cohorts}

    # Missing cells stay None (blank), never 0: a future month hasn't happened yet.
    def retention(c: str, p: int):
        v, s = count.get((c, p)), size[c]
        return None if v is None or not s else v / s

    # The colour scale runs to the highest later-month value: month 0 is always 100% and would
    # otherwise squeeze the interesting range (20–45%) into the middle shades.
    later = [v for c in cohorts for p in periods if p > 0 if (v := retention(c, p)) is not None]
    scale_max = max(later, default=0) or 1
    return cohorts, periods, size, retention, scale_max


def figure(rows: list[dict], options: dict | None = None) -> go.Figure:
    o = {
        "label": "Retention",
        "period_label": "Months since first order",
        "min_cohort": 30,
        "max_cohorts": 12,
        "empty_message": "No data for this period",
        "negative_message": "Cohort counts can’t be negative",
        "colors": None,
        **(options or {}),
    }
    colors = o["colors"] or {}
    fig = go.Figure()
    message = o["empty_message"] if not rows else o["negative_message"] if any((r["value"] or 0) < 0 for r in rows) else None
    if message:
        fig.add_annotation(text=message, xref="paper", yref="paper", x=0.5, y=0.5, showarrow=False)
        fig.update_xaxes(visible=False)
        fig.update_yaxes(visible=False)
    else:
        cohorts, periods, size, retention, scale_max = prepare(rows, o["max_cohorts"])
        z = [[retention(c, p) for p in periods] for c in cohorts]
        ramp = colors.get("sequential") or []
        scale = [[i / (len(ramp) - 1), c] for i, c in enumerate(ramp)] if len(ramp) > 1 else None
        # Small cohorts are named, because their percentages are noise.
        ylabels = [f"{_short(c, MAX_COHORT)}  {'n=' + str(int(size[c] or 0)) if (size[c] or 0) < o['min_cohort'] else _people(size[c] or 0)}" for c in cohorts]
        fig.add_heatmap(z=z, x=[str(p) for p in periods], y=ylabels, zmin=0, zmax=scale_max, colorscale=scale, showscale=False, xgap=2, ygap=2, hovertemplate="%{y} · %{x}: %{z:.0%}<extra></extra>")
        for yi, c in enumerate(cohorts):
            small = (size[c] or 0) < o["min_cohort"]
            for xi, p in enumerate(periods):
                v = z[yi][xi]
                if v is None:
                    continue
                # Dark cells get light text and vice versa; the ramp flips in dark mode, and so does this.
                dark = len(ramp) > 1 and round(min(1, v / scale_max) * (len(ramp) - 1)) >= len(ramp) / 2
                fig.add_annotation(x=str(p), y=ylabels[yi], text=f"{v:.0%}", showarrow=False, font={"size": 11, "color": colors.get("surface") if dark else colors.get("primary")}, opacity=0.5 if small else 1)
        fig.update_yaxes(autorange="reversed", showgrid=False)
        fig.update_xaxes(title={"text": o["period_label"], "font": {"size": 12}}, showgrid=False, side="bottom")
    fig.update_layout(title={"text": _short(o["label"], 40), "x": 0, "xanchor": "left"}, margin={"l": 8, "r": 8, "t": 44, "b": 8})
    return fig
