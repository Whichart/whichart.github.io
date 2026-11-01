// Stacked bar chart: a total per group, split into its parts. Apache ECharts.
// Usage:
//   import palette from '@whichart/tokens/palette.json';
//   chart.setOption(stackedBarOption(rows, { label: 'Revenue by channel', currency: 'USD', palette: palette.light }));
// Rows (long format): [{ group: 'Jul', series: 'Web', value: 48210 }, ...]. Groups keep their input order.
// Public domain (CC0): copy, change and ship without attribution.
import type { EChartsOption } from 'echarts';

export interface StackRow {
  group: string;
  series: string;
  value: number | null;
}

export interface StackOptions {
  label?: string;
  locale?: string;
  currency?: string;
  otherLabel?: string;
  emptyMessage?: string;
  /** Named colours from @whichart/tokens/palette.json; `surface` draws the 2px gaps between segments. */
  palette?: { surface?: string };
}

const MAX_TITLE = 40;
const MAX_NAME = 20;
const MAX_PARTS = 5; // beyond this, keep the top 4 and fold the rest into "Other"
const COMPACT_FROM = 100_000;
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Groups in input order, parts in order of first appearance (so colours follow the entity), small parts folded. */
export function prepare(rows: StackRow[], otherLabel: string) {
  const groups = [...new Set(rows.map((r) => r.group))];
  const order = [...new Set(rows.map((r) => r.series))];
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.series, (totals.get(r.series) ?? 0) + Math.abs(r.value ?? 0));
  let keep = order;
  let folded = new Set<string>();
  if (order.length > MAX_PARTS) {
    const top = new Set([...order].sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0)).slice(0, MAX_PARTS - 1));
    keep = order.filter((s) => top.has(s));
    folded = new Set(order.filter((s) => !top.has(s)));
  }
  const parts = folded.size ? [...keep, otherLabel] : keep;
  const cell = new Map<string, number>();
  for (const r of rows) {
    if (r.value === null) continue;
    const k = `${folded.has(r.series) ? otherLabel : r.series}|${r.group}`;
    cell.set(k, (cell.get(k) ?? 0) + r.value);
  }
  const value = (part: string, group: string) => cell.get(`${part}|${group}`) ?? 0;
  const total = (group: string) => parts.reduce((a, p) => a + value(p, group), 0);
  return { groups, parts, value, total };
}

export default function stackedBarOption(rows: StackRow[], options: StackOptions = {}): EChartsOption {
  const { label = 'Value', locale = 'en-US', currency, otherLabel = 'Other', emptyMessage = 'No data for this period', palette = {} } = options;
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  const compact = new Intl.NumberFormat(locale, { ...style, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const full = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  const totalLabel = (v: number) => (Math.abs(v) >= COMPACT_FROM ? compact.format(v) : full.format(v));
  const { groups, parts, value, total } = prepare(rows, otherLabel);
  const allZero = groups.length > 0 && groups.every((g) => parts.every((p) => value(p, g) === 0));

  return {
    title: [{ text: short(label, MAX_TITLE), left: 0, top: 0 }, ...(groups.length ? [] : [{ subtext: emptyMessage, left: 'center', top: 'middle' }])],
    legend: { top: 28, left: 0, data: parts, formatter: (n: string) => short(n, MAX_NAME), tooltip: { show: true } },
    grid: { left: 8, right: 16, top: 64, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => (typeof v === 'number' ? full.format(v) : '—') },
    xAxis: { type: 'category', data: groups, axisLabel: { formatter: (v: string) => short(v, 12), hideOverlap: true }, axisTick: { show: false } },
    yAxis: { type: 'value', ...(allZero || !groups.length ? { min: 0, max: 1, interval: 1 } : {}), axisLabel: { formatter: (v: number) => compact.format(v) } },
    series: [
      ...parts.map((part) => ({
        type: 'bar' as const,
        name: part,
        // 'samesign' stacks negative parts below zero and positive parts above.
        stack: 'total',
        stackStrategy: 'samesign' as const,
        barMaxWidth: 48,
        emphasis: { focus: 'series' as const },
        // A 2px gap in the surface colour separates the segments.
        itemStyle: { borderRadius: 0, ...(palette.surface ? { borderColor: palette.surface, borderWidth: 1 } : {}) },
        data: groups.map((g) => value(part, g)),
      })),
      // Totals on top of each stack: an invisible series positioned at the total.
      {
        type: 'scatter' as const,
        name: 'Total',
        silent: true,
        symbolSize: 0,
        tooltip: { show: false },
        // Sits on top of the positive parts; the label shows the net total.
        data: groups.map((g) => parts.reduce((a, p) => a + Math.max(0, value(p, g)), 0)),
        label: { show: !allZero, position: 'top', formatter: (p: { dataIndex: number }) => totalLabel(total(groups[p.dataIndex])) },
      },
    ],
  };
}
