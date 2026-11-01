// Current vs previous period: this period's line over the previous one, aligned day by day. Apache ECharts.
// Usage:
//   import palette from '@whichart/tokens/palette.json';
//   chart.setOption(periodComparisonOption(rows, { label: 'Revenue', currency: 'USD', palette: palette.light }));
// Rows: [{ date: '2026-08-04', value: 1722 }, ...] daily, covering two periods (56 days for the default 28).
// Public domain (CC0): copy, change and ship without attribution.
import type { EChartsOption } from 'echarts';

export interface PeriodRow {
  date: string;
  value: number | null;
}

export interface PeriodOptions {
  label?: string;
  locale?: string;
  currency?: string;
  /** Period length in days. 28 keeps weekdays aligned (Monday against Monday). */
  days?: number;
  emptyMessage?: string;
  noPreviousMessage?: string;
  /** Named colours from @whichart/tokens/palette.json; `muted` draws the previous period in grey. */
  palette?: { muted?: string };
}

const DAY = 864e5;
const MAX_TITLE = 40;
const COMPACT_FROM = 100_000;

const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** The last `n` days and the `n` before them, aligned by position. Missing days are null. */
export function windows(rows: PeriodRow[], n: number) {
  const byDate = new Map(rows.filter((r) => r.date).map((r) => [r.date, r.value]));
  if (!byDate.size) return { current: [] as [string, number | null][], previous: [] as [string, number | null][], hasPrevious: false };
  const dates = [...byDate.keys()].sort();
  const end = Date.parse(`${dates[dates.length - 1]}T00:00:00Z`);
  const first = Date.parse(`${dates[0]}T00:00:00Z`);
  const start = Math.max(end - (n - 1) * DAY, first);
  const current: [string, number | null][] = [];
  const previous: [string, number | null][] = [];
  for (let t = start; t <= end; t += DAY) {
    current.push([iso(t), byDate.get(iso(t)) ?? null]);
    previous.push([iso(t - n * DAY), byDate.get(iso(t - n * DAY)) ?? null]);
  }
  return { current, previous, hasPrevious: previous.some(([, v]) => v !== null) };
}

export default function periodComparisonOption(rows: PeriodRow[], options: PeriodOptions = {}): EChartsOption {
  const {
    label = 'Value',
    locale = 'en-US',
    currency,
    days = 28,
    emptyMessage = 'No data for this period',
    noPreviousMessage = 'No previous period to compare yet',
    palette = {},
  } = options;
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  const compact = new Intl.NumberFormat(locale, { ...style, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const full = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  const pointLabel = (v: number) => (Math.abs(v) >= COMPACT_FROM ? compact.format(v) : full.format(v));
  const dayFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const fmt = (d: string) => dayFmt.format(new Date(`${d}T00:00:00Z`));
  const title = label.length > MAX_TITLE ? `${label.slice(0, MAX_TITLE - 1).trimEnd()}…` : label;

  const { current, previous, hasPrevious } = windows(rows, days);
  const values = [...current, ...previous].map(([, v]) => v).filter((v): v is number => v !== null);
  const allZero = values.length > 0 && values.every((v) => v === 0);
  const names = [`Last ${days} days`, `Previous ${days} days`];

  return {
    title: [
      { text: title, left: 0, top: 0 },
      ...(current.length ? [] : [{ subtext: emptyMessage, left: 'center', top: 'middle' }]),
      // No previous period (a new store or metric): say so instead of drawing an empty comparison.
      ...(current.length && !hasPrevious ? [{ subtext: noPreviousMessage, right: 0, top: 0 }] : []),
    ],
    legend: { top: 28, left: 0, data: hasPrevious ? names : [names[0]] },
    grid: { left: 8, right: 24, top: 64, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      formatter: (ps) => {
        const list = Array.isArray(ps) ? ps : [ps];
        const i = list[0]?.dataIndex ?? 0;
        const line = (d: [string, number | null]) => `${fmt(d[0])}: ${d[1] === null ? '—' : full.format(d[1])}`;
        return [line(current[i]), hasPrevious ? line(previous[i]) : ''].filter(Boolean).join('<br>');
      },
    },
    xAxis: { type: 'category', data: current.map(([d]) => fmt(d)), boundaryGap: false, axisLabel: { hideOverlap: true } },
    yAxis: {
      type: 'value',
      ...(allZero || !values.length ? { min: 0, max: 1, interval: 1 } : {}),
      axisLabel: { formatter: (v: number) => compact.format(v) },
    },
    // The current period is first, so it keeps the first series colour; z draws it above the previous one.
    series: [
      {
        type: 'line' as const,
        name: names[0],
        data: current.map(([, v]) => v),
        connectNulls: false,
        showSymbol: current.length === 1,
        symbolSize: 8,
        z: 3,
        label: { show: current.length === 1, formatter: (p: { value: unknown }) => pointLabel(p.value as number) },
      },
      ...(hasPrevious
        ? [
            {
              type: 'line' as const,
              name: names[1],
              data: previous.map(([, v]) => v),
              connectNulls: false,
              showSymbol: false,
              z: 2,
              ...(palette.muted ? { color: palette.muted } : {}),
              lineStyle: { type: 'dashed' as const, width: 2 },
            },
          ]
        : []),
    ],
  };
}
