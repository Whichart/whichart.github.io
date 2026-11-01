// Sparkline: the shape of one measure over time, small enough for a KPI tile. Apache ECharts.
// Usage:
//   echarts.init(el, 'whichart').setOption(sparklineOption(rows, { label: 'Revenue', currency: 'USD' }));
// Rows: [{ date: '2026-09-01', value: 1722 }, ...] at daily intervals. Colours come from the theme.
// Public domain (CC0): copy, change and ship without attribution.
import type { EChartsOption } from 'echarts';

export interface SparkRow {
  date: string;
  value: number | null;
}

export interface SparkOptions {
  label?: string;
  locale?: string;
  currency?: string;
  emptyMessage?: string;
}

const DAY = 864e5;

function fillDailyGaps(rows: SparkRow[]): [string, number | null][] {
  const sorted = rows.filter((r) => r.date).sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) return [];
  const byDate = new Map(sorted.map((r) => [r.date, r.value]));
  const out: [string, number | null][] = [];
  const last = Date.parse(`${sorted[sorted.length - 1].date}T00:00:00Z`);
  for (let t = Date.parse(`${sorted[0].date}T00:00:00Z`); t <= last; t += DAY) {
    const d = new Date(t).toISOString().slice(0, 10);
    out.push([d, byDate.get(d) ?? null]);
  }
  return out;
}

/** A sentence for screen readers: a sparkline has no axes to read. */
export function describe(data: [string, number | null][], label: string, fmt: (v: number) => string, locale: string): string {
  const points = data.filter((d): d is [string, number] => d[1] !== null);
  if (!points.length) return `${label}: no data`;
  const [first, last] = [points[0][1], points[points.length - 1][1]];
  const change = first !== 0 && Math.sign(first) === Math.sign(last) ? (last - first) / Math.abs(first) : null;
  const pct = change === null ? '' : `, ${change >= 0 ? 'up' : 'down'} ${new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(Math.abs(change))}`;
  return `${label} over ${data.length} days, from ${fmt(first)} to ${fmt(last)}${pct}`;
}

export default function sparklineOption(rows: SparkRow[], options: SparkOptions = {}): EChartsOption {
  const { label = 'Value', locale = 'en-US', currency, emptyMessage = 'No data yet' } = options;
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  const full = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  const data = fillDailyGaps(rows);
  const values = data.map(([, v]) => v).filter((v): v is number => v !== null);
  const allZero = values.length > 0 && values.every((v) => v === 0);
  const last = [...data].reverse().find(([, v]) => v !== null);
  const [lo, hi] = values.length ? [Math.min(...values), Math.max(...values)] : [0, 1];
  // The shape is the point, so the axis fits the data (with a little room) instead of starting at zero.
  const pad = (hi - lo) * 0.1 || 1;

  return {
    aria: { enabled: true, label: { description: describe(data, label, (v) => full.format(v), locale) } },
    ...(data.length ? {} : { title: { subtext: emptyMessage, left: 'center', top: 'middle', subtextStyle: { fontSize: 12 } } }),
    grid: { left: 4, right: 8, top: 6, bottom: 6 },
    tooltip: { trigger: 'axis', valueFormatter: (v) => (typeof v === 'number' ? full.format(v) : '—') },
    xAxis: { type: 'time', show: false },
    yAxis: { type: 'value', show: false, ...(allZero || !values.length ? { min: 0, max: 1 } : { min: lo - pad, max: hi + pad }) },
    series: [
      {
        type: 'line',
        name: label,
        data,
        connectNulls: false,
        showSymbol: false,
        lineStyle: { width: 2 },
        // The latest value is the one people read; mark it.
        markPoint: last ? { symbol: 'circle', symbolSize: 6, data: [{ name: 'Latest', coord: last as [string, number] }], label: { show: false } } : undefined,
        // When values cross zero, show where zero is.
        markLine:
          lo < 0 && hi > 0
            ? { symbol: 'none', silent: true, label: { show: false }, lineStyle: { type: 'dashed', width: 1, opacity: 0.5 }, data: [{ yAxis: 0 }] }
            : undefined,
      },
    ],
  };
}
