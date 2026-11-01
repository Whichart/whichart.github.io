"""Top-N table: a ranked list with exact values and shares. Plotly (Python), for notebooks and Dash.

Plotly tables can't draw inline bars, so share is shown as a number; use the HTML versions for bars.
Usage: fig = figure(rows, {"label": "Top products", "name_label": "Product", "value_label": "Revenue", "currency": "USD", "colors": colors})
Rows: [{"label": "Trail runner", "value": 48210}, ...]. Duplicates are summed.
Public domain (CC0): copy, change and ship without attribution.
"""
import plotly.graph_objects as go

MAX_NAME = 28
SYMBOLS = {"USD": "$", "EUR": "€", "GBP": "£", "INR": "₹", "BDT": "৳", "JPY": "¥"}
SOUTH_ASIAN = ("-IN", "-BD", "-NP", "-PK", "-LK")


def _short(s: str, n: int) -> str:
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def _full(v: float, locale: str, currency: str | None) -> str:
    """Tables are for exact values: full precision, grouped the locale's way (1,20,000 in en-IN)."""
    symbol = SYMBOLS.get(currency, f"{currency} ") if currency else ""
    n = round(abs(v))
    s = str(n)
    if locale.endswith(SOUTH_ASIAN) and len(s) > 3:
        head, tail, groups = s[:-3], s[-3:], []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        s = ",".join(([head] if head else []) + groups + [tail])
    else:
        s = f"{n:,}"
    return f"{'-' if v < 0 else ''}{symbol}{s}"


def top_lines(rows: list[dict], o: dict) -> list[tuple]:
    sums: dict[str, float] = {}
    for r in rows:
        if r.get("label"):
            sums[r["label"]] = sums.get(r["label"], 0) + (r["value"] or 0)
    ranked = sorted(sums.items(), key=lambda x: -x[1])
    positive = sum(max(0, v) for _, v in ranked)
    share = lambda v: f"{v / positive:.0%}" if positive > 0 and v >= 0 else "—"  # noqa: E731
    lines = [(str(i + 1), name, v, share(v)) for i, (name, v) in enumerate(ranked[: o["n"]])]
    if len(ranked) > o["n"]:
        rest = ranked[o["n"] :]
        total = sum(v for _, v in rest)
        lines.append(("", f"{o['other_label']} ({len(rest)})", total, share(total)))
    return lines


def figure(rows: list[dict], options: dict | None = None) -> go.Figure:
    o = {"label": "Top items", "locale": "en-US", "currency": None, "name_label": "Name", "value_label": "Value", "n": 10, "other_label": "Other", "empty_message": "No data yet", "colors": None, **(options or {})}
    colors = o["colors"] or {}
    lines = top_lines(rows, o)
    cols = list(zip(*lines)) if lines else [[], [], [], []]
    fig = go.Figure(
        go.Table(
            columnwidth=[24, 180, 110, 60],
            header={"values": ["#", o["name_label"], o["value_label"], "Share"], "align": ["right", "left", "right", "right"], "fill": {"color": colors.get("surface")}, "line": {"color": colors.get("grid")}, "font": {"color": colors.get("secondary"), "size": 12}},
            cells={
                "values": [list(cols[0]), [_short(n, MAX_NAME) for n in cols[1]], [_full(v, o["locale"], o["currency"]) for v in cols[2]], list(cols[3])],
                "align": ["right", "left", "right", "right"],
                "fill": {"color": colors.get("surface")},
                "line": {"color": colors.get("grid")},
                "font": {"color": colors.get("primary"), "size": 12},
                "height": 24,
            },
        )
    )
    if not lines:
        fig.add_annotation(text=o["empty_message"], xref="paper", yref="paper", x=0.5, y=0.6, showarrow=False)
    fig.update_layout(title={"text": o["label"], "x": 0, "xanchor": "left"}, margin={"l": 8, "r": 8, "t": 40, "b": 8})
    return fig
