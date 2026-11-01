"""Build every Plotly figure for every dataset and mode, and print them as JSON.

Usage: python scripts/render/plotly_figures.py charts/line charts/kpi-tile-delta > figures.json
Each chart's code/plotly_figure.py must define figure(rows, options).
"""
import csv
import importlib.util
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOKENS = json.loads((ROOT / "packages/tokens/tokens.json").read_text())
TEMPLATES = {m: json.loads((ROOT / f"packages/tokens/generated/plotly-{m}.json").read_text()) for m in ("light", "dark")}


def snake(key: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", key).lower()


def _is_number(v: str) -> bool:
    try:
        float(v)
        return True
    except ValueError:
        return False


def read_rows(path: Path) -> list[dict]:
    """Same rule as scripts/lib/data.mjs: numeric when every non-blank value is a number; date stays a string."""
    with path.open(newline="", encoding="utf-8") as f:
        raw = list(csv.DictReader(f))
    cols = raw[0].keys() if raw else []
    numeric = {c for c in cols if c != "date" and all(r[c] == "" or _is_number(r[c]) for r in raw)}
    return [{k: ((None if v == "" else float(v)) if k in numeric else v) for k, v in r.items()} for r in raw]


def theme_colors(mode: str) -> dict:
    """Colours a figure may need beyond the template: change colours, the series order, muted ink."""
    m = TOKENS["modes"][mode]
    d = m["delta"]
    red_up = TOKENS["deltaConvention"] == "red-up"
    return {
        "good": d["bad"] if red_up else d["good"],
        "bad": d["good"] if red_up else d["bad"],
        "neutral": d["neutral"],
        "series": m["categorical"],
        "muted": m["ink"]["muted"],
        "secondary": m["ink"]["secondary"],
        "primary": m["ink"]["primary"],
        "surface": m["surface"],
        # Low → high; dark mode flips the anchor so "near zero" recedes into the surface.
        "sequential": TOKENS["sequential"]["blue"] if mode == "light" else TOKENS["sequential"]["blue"][::-1],
        "grid": m["grid"],
        # Meter tracks use a light step of the sequential ramp (dark mode: a dark step).
        "track": TOKENS["sequential"]["blue"][1] if mode == "light" else TOKENS["sequential"]["blue"][-2],
    }


def load(chart_dir: Path):
    spec = importlib.util.spec_from_file_location(f"wc_{chart_dir.name.replace('-', '_')}", chart_dir / "code/plotly_figure.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.figure


def main(dirs: list[str]) -> None:
    out = {}
    for d in dirs:
        chart_dir = ROOT / d
        figure = load(chart_dir)
        index = json.loads((chart_dir / "data/datasets.json").read_text())
        datasets = {"sample": index["sample"], **index["states"]}
        out[chart_dir.name] = {}
        for key, ds in datasets.items():
            rows = read_rows(chart_dir / "data" / ds["file"])
            out[chart_dir.name][key] = {}
            for mode in ("light", "dark"):
                options = {snake(k): v for k, v in ds["options"].items()}
                options["colors"] = theme_colors(mode)
                try:
                    fig = figure(rows, options)
                    fig.update_layout(template=TEMPLATES[mode])
                    out[chart_dir.name][key][mode] = json.loads(fig.to_json())
                except Exception as e:  # reported by the harness, not fatal here
                    out[chart_dir.name][key][mode] = {"error": f"{type(e).__name__}: {e}"}
    json.dump(out, sys.stdout)


if __name__ == "__main__":
    main(sys.argv[1:])
