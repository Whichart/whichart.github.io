"""Data table: exact values in typed columns, with change cells coloured. Plotly (Python), for notebooks and Dash.

Plotly tables don't sort or page; rows are shown sorted by `sort_by`, first `page_size` rows, with a note if more exist.
Usage: fig = figure(rows, {"label": "Products", "currency": "USD", "columns": [{"key": "revenue", "format": "currency"}], "colors": colors})
Public domain (CC0): copy, change and ship without attribution.
"""
import plotly.graph_objects as go

MAX_TEXT = 28
SYMBOLS = {"USD": "$", "EUR": "€", "GBP": "£", "INR": "₹", "BDT": "৳", "JPY": "¥"}
SOUTH_ASIAN = ("-IN", "-BD", "-NP", "-PK", "-LK")


def _group(n: int, locale: str) -> str:
    s = str(n)
    if not locale.endswith(SOUTH_ASIAN) or len(s) <= 3:
        return f"{n:,}"
    head, tail, groups = s[:-3], s[-3:], []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    return ",".join(([head] if head else []) + groups + [tail])


def format_cell(v, col: dict, o: dict) -> tuple[str, str | None]:
    """Text and tone. Tables are for exact values: full precision, grouped the locale's way."""
    fmt = col.get("format", "text")
    if fmt == "text":
        s = "—" if v is None else str(v)
        return (s if len(s) <= MAX_TEXT else s[: MAX_TEXT - 1].rstrip() + "…"), None
    if fmt == "change" and v in (None, ""):
        return o["new_label"], "neutral"
    if v in (None, ""):
        return "—", None
    n = float(v)
    if fmt == "change":
        if n == 0:
            return "No change", "neutral"
        up = n > 0
        good = up == (col.get("good_direction", col.get("goodDirection", "up")) == "up")
        return f"{'▲' if up else '▼'} {abs(n) * 100:.1f}%", "good" if good else "bad"
    if fmt == "percent":
        return f"{n * 100:.1f}".removesuffix(".0") + "%", None
    symbol = SYMBOLS.get(o["currency"], f"{o['currency']} ") if fmt == "currency" and o["currency"] else ""
    if fmt == "number" and n != int(n):
        return f"{n:,.2f}".rstrip("0").rstrip("."), None
    return f"{'-' if n < 0 else ''}{symbol}{_group(round(abs(n)), o['locale'])}", None


def figure(rows: list[dict], options: dict | None = None) -> go.Figure:
    o = {"label": "Data", "locale": "en-US", "currency": None, "columns": None, "sort_by": None, "sort_dir": "desc", "page_size": 10, "empty_message": "No data yet", "new_label": "New", "colors": None, **(options or {})}
    colors = o["colors"] or {}
    cols = o["columns"] or [{"key": k, "format": "number" if any(isinstance(r.get(k), (int, float)) for r in rows) else "text"} for k in (rows[0].keys() if rows else [])]
    cols = [{"label": c.get("label") or c["key"].replace("_", " ").capitalize(), **c} for c in cols]
    if o["sort_by"]:
        present = [r for r in rows if r.get(o["sort_by"]) not in (None, "")]
        missing = [r for r in rows if r.get(o["sort_by"]) in (None, "")]
        rows = sorted(present, key=lambda r: r[o["sort_by"]], reverse=o["sort_dir"] == "desc") + missing
    visible = rows[: o["page_size"]]
    cells = [[format_cell(r.get(c["key"]), c, o) for r in visible] for c in cols]
    tone_color = {"good": colors.get("good"), "bad": colors.get("bad"), "neutral": colors.get("neutral"), None: colors.get("primary")}
    fig = go.Figure(
        go.Table(
            header={"values": [c["label"] for c in cols], "align": ["left" if c.get("format", "text") == "text" else "right" for c in cols], "fill": {"color": colors.get("surface")}, "line": {"color": colors.get("grid")}, "font": {"color": colors.get("secondary"), "size": 12}},
            cells={
                "values": [[t for t, _ in col] for col in cells],
                "align": ["left" if c.get("format", "text") == "text" else "right" for c in cols],
                "fill": {"color": colors.get("surface")},
                "line": {"color": colors.get("grid")},
                "font": {"color": [[tone_color[tone] for _, tone in col] for col in cells], "size": 12},
                "height": 24,
            },
        )
    )
    if not rows:
        fig.add_annotation(text=o["empty_message"], xref="paper", yref="paper", x=0.5, y=0.6, showarrow=False)
    elif len(rows) > o["page_size"]:
        fig.add_annotation(text=f"Showing {o['page_size']} of {len(rows)} rows", xref="paper", yref="paper", x=0, y=0, xanchor="left", yanchor="top", showarrow=False, font={"size": 12, "color": colors.get("secondary")})
    fig.update_layout(title={"text": o["label"], "x": 0, "xanchor": "left"}, margin={"l": 8, "r": 8, "t": 40, "b": 24})
    return fig
