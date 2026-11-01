// Donut chart: how one total splits into a few parts, at one moment. Apache ECharts.
// Usage: echarts.init(el, 'whichart').setOption(donutOption(rows, { label: 'Revenue by channel', currency: 'USD' }));
// Rows: [{ category: 'Web', value: 52300 }, ...]. Duplicates are summed. Colours come from the theme.
// Public domain (CC0): copy, change and ship without attribution.
import type { EChartsOption } from 'echarts';

export interface DonutRow {
  category: string;
  value: number | null;
}

export interface DonutOptions {
  label?: string;
  locale?: string;
  currency?: string;
  otherLabel?: string;
  emptyMessage?: string;
  zeroMessage?: string;
  negativeMessage?: string;
}

const MAX_TITLE = 40;
const MAX_NAME = 22;
const MAX_SLICES = 5; // beyond this, keep the top 4 and fold the rest into "Other"
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Sum duplicates, sort largest first, fold the tail into "Other (n)". */
export function prepare(rows: DonutRow[], otherLabel: string) {
  const sums = new Map<string, number>();
  for (const r of rows) if (r.category) sums.set(r.category, (sums.get(r.category) ?? 0) + (r.value ?? 0));
  let slices = [...sums].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  if (slices.length > MAX_SLICES) {
    const rest = slices.slice(MAX_SLICES - 1);
    slices = [...slices.slice(0, MAX_SLICES - 1), { name: `${otherLabel} (${rest.length})`, value: rest.reduce((a, b) => a + b.value, 0) }];
  }
  return slices;
}

export default function donutOption(rows: DonutRow[], options: DonutOptions = {}): EChartsOption {
  const {
    label = 'Value',
    locale = 'en-US',
    currency,
    otherLabel = 'Other',
    emptyMessage = 'No data for this period',
    zeroMessage = 'Nothing to split yet',
    negativeMessage = 'A donut can’t show negative values',
  } = options;
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  const compact = new Intl.NumberFormat(locale, { ...style, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const full = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
  const slices = prepare(rows, otherLabel);
  const total = slices.reduce((a, s) => a + s.value, 0);
  // A ring of zeros has no shape, and a negative slice can't be drawn as a share: say so instead.
  const message = !slices.length ? emptyMessage : slices.some((s) => s.value < 0) ? negativeMessage : total === 0 ? zeroMessage : null;
  const title = { text: short(label, MAX_TITLE), left: 0, top: 0 };
  if (message) return { title: [title, { subtext: message, left: 'center', top: 'middle' }] };

  const share = (v: number) => pct.format(v / total);
  return {
    title: [title, { text: compact.format(total), subtext: 'Total', left: '34%', top: '47%', textAlign: 'center', textVerticalAlign: 'middle', itemGap: 2 }],
    tooltip: { trigger: 'item', formatter: (p) => { const d = p as { name: string; value: number }; return `${d.name}<br>${full.format(d.value)} · ${share(d.value)}`; } },
    // Every slice is named with its share in the legend, so colour is never the only cue.
    legend: {
      orient: 'vertical',
      right: 0,
      top: 'middle',
      formatter: (name: string) => `${short(name, MAX_NAME)}  ${share(slices.find((s) => s.name === name)?.value ?? 0)}`,
      tooltip: { show: true },
    },
    series: [
      {
        type: 'pie',
        name: label,
        radius: ['52%', '76%'],
        center: ['34%', '54%'],
        avoidLabelOverlap: true,
        label: { show: false },
        data: slices,
      },
    ],
  };
}
