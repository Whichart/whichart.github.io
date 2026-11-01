// Horizontal bar chart: compare one measure across categories, largest first. Apache ECharts.
// Usage: echarts.init(el, 'whichart').setOption(barOption(rows, { label: 'Revenue by category', currency: 'USD' }));
// Rows: [{ category: 'Shoes', value: 48210 }, ...]. Duplicates are summed. Colours come from the theme.
// Public domain (CC0): copy, change and ship without attribution.
import type { EChartsOption } from 'echarts';

export interface BarRow {
  category: string;
  value: number | null;
}

export interface BarOptions {
  label?: string;
  locale?: string;
  currency?: string;
  /** Keep the input order, e.g. for sizes or age bands. Default: largest first. */
  keepOrder?: boolean;
  maxBars?: number;
  otherLabel?: string;
  emptyMessage?: string;
}

const MAX_TITLE = 40;
const MAX_NAME = 24;
const COMPACT_FROM = 100_000;

const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Sum duplicates, sort largest first, and fold the tail into "Other" beyond `maxBars`. */
export function prepare(rows: BarRow[], { keepOrder = false, maxBars = 12, otherLabel = 'Other' } = {}) {
  const sums = new Map<string, number>();
  for (const r of rows) if (r.category) sums.set(r.category, (sums.get(r.category) ?? 0) + (r.value ?? 0));
  let bars = [...sums].map(([category, value]) => ({ category, value }));
  if (!keepOrder) bars.sort((a, b) => b.value - a.value);
  if (bars.length > maxBars) {
    const rest = bars.slice(maxBars - 1);
    bars = [...bars.slice(0, maxBars - 1), { category: `${otherLabel} (${rest.length})`, value: rest.reduce((a, b) => a + b.value, 0) }];
  }
  return bars;
}

export default function barOption(rows: BarRow[], options: BarOptions = {}): EChartsOption {
  const { label = 'Value', locale = 'en-US', currency, emptyMessage = 'No data for this period' } = options;
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  const compact = new Intl.NumberFormat(locale, { ...style, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const full = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  const valueLabel = (v: number) => (Math.abs(v) >= COMPACT_FROM ? compact.format(v) : full.format(v));
  const bars = prepare(rows, options);
  const values = bars.map((b) => b.value);
  const allZero = values.length > 0 && values.every((v) => v === 0);
  const lowest = Math.min(0, ...values);

  return {
    title: [{ text: short(label, MAX_TITLE), left: 0, top: 0 }, ...(bars.length ? [] : [{ subtext: emptyMessage, left: 'center', top: 'middle' }])],
    grid: { left: 8, right: 56, top: 36, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => (typeof v === 'number' ? full.format(v) : '—') },
    // Bars always start at zero: length is the value.
    // Negative bars get extra room on the left so their labels don't collide with category names.
    xAxis: { type: 'value', ...(allZero || !bars.length ? { min: 0, max: 1, interval: 1 } : lowest < 0 ? { boundaryGap: ['45%', '0%'] } : {}), axisLabel: { formatter: (v: number) => compact.format(v) } },
    yAxis: {
      type: 'category',
      inverse: true,
      data: bars.map((b) => b.category),
      axisLabel: { formatter: (v: string) => short(v, MAX_NAME) },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        name: label,
        barMaxWidth: 28,
        // Every bar is labelled at its end, so exact values never depend on reading the axis.
        data: bars.map((b) => ({
          value: b.value,
          itemStyle: { borderRadius: b.value < 0 ? [4, 0, 0, 4] : [0, 4, 4, 0] },
          label: { show: true, position: b.value < 0 ? 'left' : 'right', formatter: () => valueLabel(b.value) },
        })),
      },
    ],
  };
}
