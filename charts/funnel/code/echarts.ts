// Funnel chart: how many people reach each step, and where they drop off. Apache ECharts.
// Drawn as left-aligned bars (lengths compare accurately; trapezoids exaggerate), stages in your order.
// Usage: echarts.init(el, 'whichart').setOption(funnelOption(rows, { label: 'Checkout funnel' }));
// Rows: [{ stage: 'Visited', value: 48200 }, { stage: 'Added to cart', value: 12400 }, ...] in order.
// Public domain (CC0): copy, change and ship without attribution.
import type { EChartsOption } from 'echarts';

export interface FunnelRow {
  stage: string;
  value: number | null;
}

export interface FunnelOptions {
  label?: string;
  locale?: string;
  emptyMessage?: string;
  negativeMessage?: string;
}

export interface Step {
  stage: string;
  value: number;
  /** Share of the first stage, e.g. "26%"; "—" when the first stage is 0. */
  ofStart: string;
  /** Conversion from the previous stage, e.g. "58% continue"; null for the first stage. */
  fromPrevious: string | null;
  biggestDrop: boolean;
  /** More people than the previous stage: usually a counting problem. */
  increase: boolean;
}

const MAX_TITLE = 40;
const MAX_STAGE = 20;
const COMPACT_FROM = 100_000;
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Per-stage numbers, decided in one place so every renderer agrees. */
export function steps(rows: FunnelRow[], locale = 'en-US'): Step[] {
  const pct = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
  const list = rows.filter((r) => r.stage).map((r) => ({ stage: r.stage, value: r.value ?? 0 }));
  const first = list[0]?.value ?? 0;
  const rates = list.map((s, i) => (i === 0 || list[i - 1].value <= 0 ? null : s.value / list[i - 1].value));
  const worst = Math.min(...rates.filter((r): r is number => r !== null && r <= 1));
  return list.map((s, i) => ({
    ...s,
    ofStart: first > 0 ? pct.format(s.value / first) : '—',
    fromPrevious: rates[i] === null ? null : `${pct.format(rates[i] as number)} continue`,
    biggestDrop: rates[i] !== null && rates[i] === worst && list.length > 2 && (rates[i] as number) < 1,
    increase: rates[i] !== null && (rates[i] as number) > 1,
  }));
}

export default function funnelOption(rows: FunnelRow[], options: FunnelOptions = {}): EChartsOption {
  const { label = 'Funnel', locale = 'en-US', emptyMessage = 'No data for this period', negativeMessage = 'Funnel stages can’t be negative' } = options;
  const whole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
  const count = (v: number) => (Math.abs(v) >= COMPACT_FROM ? compact.format(v) : whole.format(v));
  const list = steps(rows, locale);
  const title = { text: short(label, MAX_TITLE), left: 0, top: 0 };
  const message = !list.length ? emptyMessage : list.some((s) => s.value < 0) ? negativeMessage : null;
  if (message) return { title: [title, { subtext: message, left: 'center', top: 'middle' }] };
  const allZero = list.every((s) => s.value === 0);

  return {
    title,
    grid: { left: 8, right: 96, top: 36, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (ps) => {
        const i = (Array.isArray(ps) ? ps[0] : ps).dataIndex;
        const s = list[i];
        return [`${s.stage}: ${whole.format(s.value)}`, `${s.ofStart} of ${list[0].stage}`, s.fromPrevious ? `${s.fromPrevious} from ${list[i - 1].stage}` : ''].filter(Boolean).join('<br>');
      },
    },
    xAxis: { type: 'value', show: false, ...(allZero ? { min: 0, max: 1 } : { min: 0 }) },
    yAxis: {
      type: 'category',
      inverse: true,
      data: list.map((s) => s.stage),
      axisTick: { show: false },
      axisLine: { show: false },
      // Stage name, then the step conversion: the drop-off is the point of a funnel.
      axisLabel: {
        formatter: (_: string, i: number) => {
          const s = list[i];
          const step = s.fromPrevious ? `\n{step|${s.increase ? '▲ ' : ''}${s.fromPrevious}${s.biggestDrop ? ' · biggest drop' : ''}}` : '';
          return `{name|${short(s.stage, MAX_STAGE)}}${step}`;
        },
        rich: { name: { fontSize: 12, lineHeight: 16 }, step: { fontSize: 11, lineHeight: 14, opacity: 0.75 } },
      },
    },
    series: [
      {
        type: 'bar',
        name: label,
        barMaxWidth: 30,
        data: list.map((s) => ({
          value: s.value,
          itemStyle: { borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: 'right', formatter: () => `${count(s.value)} · ${s.ofStart}` },
        })),
      },
    ],
  };
}
