// Cohort retention heatmap: of the people who started in each month, how many came back later. Apache ECharts.
// Usage:
//   import palette from '@whichart/tokens/palette.json';
//   chart.setOption(cohortOption(rows, { label: 'Customer retention', palette: palette.light }));
// Rows: counts, one per cohort and period: [{ cohort: 'Apr 2026', period: 0, value: 1024 }, { cohort: 'Apr 2026', period: 1, value: 412 }, ...].
// Period 0 is the cohort's size. Public domain (CC0).
import type { EChartsOption } from 'echarts';

export interface CohortRow {
  cohort: string;
  period: number;
  value: number | null;
}

export interface CohortOptions {
  label?: string;
  locale?: string;
  periodLabel?: string;
  /** Cohorts smaller than this are faded: their percentages are noise. */
  minCohort?: number;
  maxCohorts?: number;
  emptyMessage?: string;
  negativeMessage?: string;
  /** Named colours from @whichart/tokens/palette.json: `sequential` for cells, `primary`/`surface` for cell text. */
  palette?: { sequential?: string[]; primary?: string; surface?: string };
}

const MAX_COHORT = 16;
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Cohorts in input order (latest `maxCohorts`), periods ascending, retention = value ÷ period-0 size. */
export function prepare(rows: CohortRow[], maxCohorts = 12) {
  const cohorts = [...new Set(rows.map((r) => r.cohort))].slice(-maxCohorts);
  const periods = [...new Set(rows.map((r) => r.period))].sort((a, b) => a - b);
  const count = new Map(rows.map((r) => [`${r.cohort}|${r.period}`, r.value]));
  const size = (c: string) => count.get(`${c}|0`) ?? null;
  // Missing cells stay null (blank), never 0: a future month hasn't happened yet.
  const retention = (c: string, p: number) => {
    const v = count.get(`${c}|${p}`);
    const s = size(c);
    return v === undefined || v === null || !s ? null : v / s;
  };
  // The colour scale runs to the highest later-month value: month 0 is always 100% and would
  // otherwise squeeze the interesting range (20–45%) into the middle shades.
  const later = cohorts.flatMap((c) => periods.filter((p) => p > 0).map((p) => retention(c, p))).filter((v): v is number => v !== null);
  const scaleMax = Math.max(...later, 0) || 1;
  return { cohorts, periods, size, retention, scaleMax };
}

export default function cohortOption(rows: CohortRow[], options: CohortOptions = {}): EChartsOption {
  const {
    label = 'Retention',
    locale = 'en-US',
    periodLabel = 'Months since first order',
    minCohort = 30,
    maxCohorts = 12,
    emptyMessage = 'No data for this period',
    negativeMessage = 'Cohort counts can’t be negative',
    palette = {},
  } = options;
  const title = { text: short(label, 40), left: 0, top: 0 };
  const message = !rows.length ? emptyMessage : rows.some((r) => (r.value ?? 0) < 0) ? negativeMessage : null;
  if (message) return { title: [title, { subtext: message, left: 'center', top: 'middle' }] };

  const pct = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
  const people = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
  const { cohorts, periods, size, retention, scaleMax } = prepare(rows, maxCohorts);
  const ramp = palette.sequential ?? [];
  const shade = (v: number) => Math.min(ramp.length - 1, Math.round(Math.min(1, v / scaleMax) * (ramp.length - 1)));
  const data = cohorts.flatMap((c, y) =>
    periods.map((p, x) => {
      const v = retention(c, p);
      if (v === null) return null;
      const small = (size(c) ?? 0) < minCohort;
      // Dark cells get light text and vice versa; the ramp flips in dark mode, and so does this.
      const dark = ramp.length && shade(v) >= ramp.length / 2;
      return {
        value: [x, y, v],
        itemStyle: { ...(ramp.length ? { color: ramp[shade(v)] } : {}), opacity: small ? 0.45 : 1, borderColor: palette.surface, borderWidth: palette.surface ? 2 : 0 },
        label: { color: dark ? palette.surface : palette.primary },
      };
    }),
  ).filter((d) => d !== null);

  return {
    title,
    grid: { left: 8, right: 8, top: 40, bottom: 28, containLabel: true },
    tooltip: {
      formatter: (p) => {
        const [x, y, v] = (p as unknown as { value: [number, number, number] }).value;
        const c = cohorts[y];
        return `${c} · ${periodLabel.toLowerCase()} ${periods[x]}<br>${pct.format(v)} of ${people.format(size(c) ?? 0)} people`;
      },
    },
    // Without a palette, the theme's sequential ramp colours the cells.
    ...(ramp.length ? {} : { visualMap: { show: false, min: 0, max: scaleMax, dimension: 2 } }),
    xAxis: { type: 'category', data: periods.map(String), name: periodLabel, nameLocation: 'middle', nameGap: 22, splitArea: { show: false }, axisTick: { show: false }, axisLine: { show: false } },
    yAxis: {
      type: 'category',
      inverse: true,
      data: cohorts,
      axisTick: { show: false },
      axisLine: { show: false },
      // Cohort and its size: small cohorts are named, because their percentages are noise.
      axisLabel: {
        formatter: (c: string) => {
          const s = size(c) ?? 0;
          return `${short(c, MAX_COHORT)}  {n|${s < minCohort ? `n=${s}` : people.format(s)}}`;
        },
        rich: { n: { fontSize: 11, opacity: 0.7 } },
      },
    },
    series: [{ type: 'heatmap', name: label, data, label: { show: true, formatter: (p) => pct.format((p.value as number[])[2]), fontSize: 11 } }],
  };
}
