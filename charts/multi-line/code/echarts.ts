// Multi-line chart: 2–5 measures or segments over time, on one shared axis. Apache ECharts.
// Usage:
//   echarts.init(el, 'whichart').setOption(multiLineOption(rows, { label: 'Revenue by channel', currency: 'USD' }));
// Rows (long format): [{ date: '2026-07-01', series: 'Web', value: 1722 }, ...] at daily intervals.
// Colours come from the theme, in fixed order. Public domain (CC0).
import type { EChartsOption } from 'echarts';

export interface MultiLineRow {
  date: string;
  series: string;
  value: number | null;
}

export interface MultiLineOptions {
  label?: string;
  locale?: string;
  currency?: string;
  emptyMessage?: string;
  otherLabel?: string;
}

const DAY = 864e5;
const MAX_TITLE = 40;
const MAX_NAME = 24;
const MAX_SERIES = 5; // beyond this, keep the top 4 and fold the rest into "Other"
const END_LABELS_UP_TO = 4;
const LABEL_GAP = 0.08; // end labels need endpoints at least 8% of the value range apart

const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Group by series, sum duplicates, fold small series into "Other", and fill missing days with null. */
export function prepare(rows: MultiLineRow[], otherLabel: string) {
  const totals = new Map<string, number>();
  for (const r of rows) if (r.value !== null) totals.set(r.series, (totals.get(r.series) ?? 0) + r.value);
  for (const r of rows) if (!totals.has(r.series)) totals.set(r.series, 0);
  // Order is by first appearance, so colours follow the entity, not its rank.
  const order = [...new Set(rows.map((r) => r.series))];
  let keep = order;
  let folded: string[] = [];
  if (order.length > MAX_SERIES) {
    const top = new Set([...order].sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0)).slice(0, MAX_SERIES - 1));
    keep = order.filter((s) => top.has(s));
    folded = order.filter((s) => !top.has(s));
  }
  const names = folded.length ? [...keep, otherLabel] : keep;
  const dates = [...new Set(rows.map((r) => r.date))].sort();
  const days: string[] = [];
  if (dates.length) {
    const last = Date.parse(`${dates[dates.length - 1]}T00:00:00Z`);
    for (let t = Date.parse(`${dates[0]}T00:00:00Z`); t <= last; t += DAY) days.push(new Date(t).toISOString().slice(0, 10));
  }
  const cell = new Map<string, number>();
  for (const r of rows) {
    if (r.value === null) continue;
    const name = folded.includes(r.series) ? otherLabel : r.series;
    const k = `${name}|${r.date}`;
    cell.set(k, (cell.get(k) ?? 0) + r.value);
  }
  return { names, days, folded, value: (name: string, day: string) => cell.get(`${name}|${day}`) ?? null };
}

export default function multiLineOption(rows: MultiLineRow[], options: MultiLineOptions = {}): EChartsOption {
  const { label = 'Value', locale = 'en-US', currency, emptyMessage = 'No data for this period', otherLabel = 'Other' } = options;
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  const compact = new Intl.NumberFormat(locale, { ...style, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const full = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  const { names, days, value } = prepare(rows, otherLabel);
  const all = names.flatMap((n) => days.map((d) => value(n, d))).filter((v): v is number => v !== null);
  const allZero = all.length > 0 && all.every((v) => v === 0);
  // Name each line at its end (up to 4), unless two endpoints are close enough for labels to collide.
  const ends = names.map((n) => [...days].reverse().map((d) => value(n, d)).find((v) => v !== null)).filter((v): v is number => v != null).sort((a, b) => a - b);
  const range = all.length ? Math.max(...all) - Math.min(0, ...all) : 0;
  const endLabels =
    names.length <= END_LABELS_UP_TO && days.length > 1 && range > 0 && ends.every((v, i) => i === 0 || v - ends[i - 1] >= range * LABEL_GAP);

  return {
    title: [{ text: short(label, MAX_TITLE), left: 0, top: 0 }, ...(days.length ? [] : [{ subtext: emptyMessage, left: 'center', top: 'middle' }])],
    legend: { top: 28, left: 0, type: 'scroll', formatter: (n: string) => short(n, MAX_NAME), tooltip: { show: true } },
    grid: { left: 8, right: endLabels ? 96 : 24, top: 64, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', valueFormatter: (v) => (typeof v === 'number' ? full.format(v) : '—') },
    xAxis: { type: 'time', minInterval: DAY, axisLabel: { hideOverlap: true } },
    yAxis: {
      type: 'value',
      ...(allZero || !days.length ? { min: 0, max: 1, interval: 1 } : {}),
      axisLabel: { formatter: (v: number) => compact.format(v) },
    },
    series: names.map((name) => ({
      type: 'line' as const,
      name,
      data: days.map((d) => [d, value(name, d)]),
      connectNulls: false,
      showSymbol: days.length === 1,
      symbolSize: 8,
      endLabel: { show: endLabels, formatter: () => short(name, 14), distance: 6 },
      emphasis: { focus: 'series' as const },
    })),
  };
}
