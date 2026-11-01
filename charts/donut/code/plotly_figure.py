"""Donut chart: how one total splits into a few parts, at one moment. Plotly (Python).

Usage: fig = figure(rows, {"label": "Revenue by channel", "currency": "USD", "colors": colors}); fig.update_layout(template=whichart_template)
`colors` holds `series` (the categorical order) and `surface` from tokens.json, for slice colours and gaps.
Rows: [{"category": "Web", "value": 52300}, ...]. Duplicates are summed.
Public domain (CC0): copy, change and ship without attribution.
"""
import plotly.graph_objects as go

MAX_TITLE = 40
MAX_NAME = 22
MAX_SLICES = 5
SYMBOLS = {"USD": "$", "EUR": "€", "GBP": "£", "INR": "₹", "BDT": "৳", "JPY": "¥"}
SOUTH_ASIAN = ("-IN", "-BD", "-NP", "-PK", "-LK")


def _short(s: str, n: int) -> str:
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def _compact(v: float, locale: str, currency: str | None) -> str:
    symbol = SYMBOLS.get(currency, f"{currency} ") if currency else ""
    steps = [(1e7, "Cr"), (1e5, "L"), (1e3, "K")] if locale.endswith(SOUTH_ASIAN) else [(1e12, "T"), (1e9, "B"), (1e6, "M"), (1e3, "K")]
    sign, a = ("-" if v < 0 else ""), abs(v)
    for size, suffix in steps:
        if a >= size:
            return f"{sign}{symbol}{a / size:.1f}".removesuffix(".0") + suffix
    return f"{sign}{symbol}{a:,.0f}"


def prepare(rows: list[dict], other: str) -> list[tuple[str, float]]:
    sums: dict[str, float] = {}
    for r in rows:
        if r.get("category"):
            sums[r["category"]] = sums.get(r["category"], 0) + (r["value"] or 0)
    slices = sorted(sums.items(), key=lambda s: -s[1])
    if len(slices) > MAX_SLICES:
        rest = slices[MAX_SLICES - 1 :]
        slices = slices[: MAX_SLICES - 1] + [(f"{other} ({len(rest)})", sum(v for _, v in rest))]
    return slices


def figure(rows: list[dict], options: dict | None = None) -> go.Figure:
    o = {
        "label": "Value",
        "locale": "en-US",
        "currency": None,
        "other_label": "Other",
        "empty_message": "No data for this period",
        "zero_message": "Nothing to split yet",
        "negative_message": "A donut can’t show negative values",
        "colors": None,
        **(options or {}),
    }
    colors = o["colors"] or {}
    slices = prepare(rows, o["other_label"])
    total = sum(v for _, v in slices)
    fig = go.Figure()
    # A ring of zeros has no shape, and a negative slice can't be drawn as a share: say so instead.
    message = o["empty_message"] if not slices else o["negative_message"] if any(v < 0 for _, v in slices) else o["zero_message"] if total == 0 else None
    if message:
        fig.add_annotation(text=message, xref="paper", yref="paper", x=0.5, y=0.5, showarrow=False)
        fig.update_xaxes(visible=False)
        fig.update_yaxes(visible=False)
    else:
        fig.add_pie(
            labels=[f"{_short(n, MAX_NAME)}  {v / total:.0%}" for n, v in slices],
            values=[v for _, v in slices],
            hole=0.62,
            sort=False,
            direction="clockwise",
            textinfo="none",
            marker={"colors": (colors.get("series") or [])[: len(slices)] or None, "line": {"color": colors.get("surface"), "width": 2}},
            hovertemplate="%{label}<br>%{value:,.0f}<extra></extra>",
            domain={"x": [0, 0.58]},
        )
        fig.add_annotation(text=f"<b>{_compact(total, o['locale'], o['currency'])}</b><br><span style='font-size:12px'>Total</span>", x=0.29, y=0.5, xref="paper", yref="paper", showarrow=False, font={"size": 18})
    label = o["label"]
    fig.update_layout(
        title={"text": _short(label, MAX_TITLE), "x": 0, "xanchor": "left"},
        legend={"x": 0.62, "y": 0.5, "yanchor": "middle"},
        margin={"l": 8, "r": 8, "t": 44, "b": 8},
    )
    return fig
