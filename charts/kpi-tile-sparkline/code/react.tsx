// KPI tile with sparkline: the period's number, its change, and its daily shape. React, no chart library.
// Usage: <KpiSparkTile rows={rows} label="Revenue" currency="USD" />
// Rows: daily [{ date: '2026-09-01', value: 1722 }, ...] covering two periods (56 days for the default 28).
// Colours are CSS variables from @whichart/tokens/whichart.css. Public domain (CC0).
import type { CSSProperties } from 'react';

export interface DailyRow {
  date: string;
  value: number | null;
}

export interface KpiSparkTileProps {
  rows: DailyRow[];
  label?: string;
  locale?: string;
  currency?: string;
  /** 'down' for metrics where lower is better (refund rate, churn). */
  goodDirection?: 'up' | 'down';
  /** Period length in days; 28 keeps weekdays aligned. */
  days?: number;
  /** How the period becomes one number: sum (revenue, orders), average (rates), last (subscribers, balances). */
  aggregate?: 'sum' | 'average' | 'last';
  comparisonLabel?: string;
  emptyMessage?: string;
  newLabel?: string;
}

const DAY = 864e5;
const COMPACT_FROM = 100_000;
const MULTIPLE_FROM = 6;
const SPARK = { w: 96, h: 36, pad: 3 };
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

function formatters(locale: string, currency?: string) {
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  const decimal = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 2 });
  const whole = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  const compact = new Intl.NumberFormat(locale, { ...style, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const full = (v: number) => (Number.isInteger(v) ? whole.format(v) : decimal.format(v));
  /** Full precision for small numbers, compact from 100,000. */
  const display = (v: number) => (Math.abs(v) >= COMPACT_FROM ? compact.format(v) : full(v));
  return { display, full };
}

/** The current period (last `days` days) and the one before, reduced to one number each, plus the daily series. */
function summarise(rows: DailyRow[], days: number, aggregate: 'sum' | 'average' | 'last') {
  const byDate = new Map(rows.filter((r) => r.date).map((r) => [r.date, r.value]));
  if (!byDate.size) return { value: null, previous: null, series: [] as (number | null)[] };
  const dates = [...byDate.keys()].sort();
  const end = Date.parse(`${dates[dates.length - 1]}T00:00:00Z`);
  const first = Date.parse(`${dates[0]}T00:00:00Z`);
  const take = (from: number, to: number) => {
    const out: (number | null)[] = [];
    for (let t = Math.max(from, first); t <= to; t += DAY) out.push(byDate.get(iso(t)) ?? null);
    return out;
  };
  const reduce = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null);
    if (!v.length) return null;
    if (aggregate === 'last') return v[v.length - 1];
    const sum = v.reduce((a, b) => a + b, 0);
    return aggregate === 'average' ? sum / v.length : sum;
  };
  const series = take(end - (days - 1) * DAY, end);
  const prevEnd = end - days * DAY;
  const previous = prevEnd >= first ? reduce(take(prevEnd - (days - 1) * DAY, prevEnd)) : null;
  return { value: reduce(series), previous, series };
}

/** The change line. Percent only when it means something; otherwise an absolute amount or a multiple. */
function describeChange(value: number, previous: number | null, o: Required<Pick<KpiSparkTileProps, 'locale' | 'goodDirection' | 'comparisonLabel' | 'newLabel'>> & { currency?: string }) {
  const { display } = formatters(o.locale, o.currency);
  if (previous === null) return { text: o.newLabel, arrow: '', tone: 'neutral', spoken: `${o.newLabel}, no previous period to compare`, badge: true };
  const diff = value - previous;
  if (diff === 0) return { text: `No change ${o.comparisonLabel}`, arrow: '', tone: 'neutral', spoken: `no change ${o.comparisonLabel}` };
  const up = diff > 0;
  const arrow = up ? '▲' : '▼';
  const tone = up === (o.goodDirection === 'up') ? 'good' : 'bad';
  const word = up ? 'up' : 'down';
  if (previous === 0 || previous < 0 || Math.sign(value) !== Math.sign(previous)) {
    return { text: `${up ? '+' : '−'}${display(Math.abs(diff))} ${o.comparisonLabel}`, arrow, tone, spoken: `${word} ${display(Math.abs(diff))} ${o.comparisonLabel}` };
  }
  const ratio = value / previous;
  if (ratio >= MULTIPLE_FROM) {
    const multiple = `${new Intl.NumberFormat(o.locale, { maximumFractionDigits: 1 }).format(ratio)}×`;
    return { text: `${multiple} ${o.comparisonLabel}`, arrow, tone, spoken: `${multiple} ${o.comparisonLabel}` };
  }
  const pct = new Intl.NumberFormat(o.locale, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.abs(diff / previous));
  return { text: `${pct} ${o.comparisonLabel}`, arrow, tone, spoken: `${word} ${pct} ${o.comparisonLabel}` };
}

/** SVG path for the daily series: breaks at missing days; all-zero data sits on the bottom edge. */
function sparkGeometry(series: (number | null)[]) {
  const values = series.filter((v): v is number => v !== null);
  if (!values.length) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const { w, h, pad } = SPARK;
  const x = (i: number) => (series.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (series.length - 1));
  const y = (v: number) => (hi === lo ? (v === 0 ? h - pad : h / 2) : h - pad - ((v - lo) / (hi - lo)) * (h - 2 * pad));
  let d = '';
  let pen = false;
  series.forEach((v, i) => {
    if (v === null) pen = false;
    else {
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    }
  });
  const lastI = series.map((v) => v !== null).lastIndexOf(true);
  return { d, last: { x: x(lastI), y: y(series[lastI] as number) }, zeroY: lo < 0 && hi > 0 ? y(0) : null };
}

const TONE: Record<string, string> = { good: 'var(--wc-delta-up)', bad: 'var(--wc-delta-down)', neutral: 'var(--wc-delta-neutral)' };
const tileStyle: CSSProperties = {
  fontFamily: 'var(--wc-font)',
  background: 'var(--wc-surface)',
  border: '1px solid var(--wc-border)',
  borderRadius: 12,
  padding: 16,
  display: 'grid',
  gap: 4,
  minWidth: 0,
};
const labelStyle: CSSProperties = { color: 'var(--wc-ink-secondary)', fontSize: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' };

export default function KpiSparkTile(props: KpiSparkTileProps) {
  const { rows, label = 'Value', locale = 'en-US', currency, goodDirection = 'up', days = 28, aggregate = 'sum', emptyMessage = 'No data yet', newLabel = 'New' } = props;
  const comparisonLabel = props.comparisonLabel ?? `vs previous ${days} days`;
  const { display, full } = formatters(locale, currency);
  const { value, previous, series } = summarise(rows, days, aggregate);
  const geo = sparkGeometry(series);
  const c = value === null ? null : describeChange(value, previous, { locale, currency, goodDirection, comparisonLabel, newLabel });
  const badge: CSSProperties = c?.badge ? { border: '1px solid var(--wc-border)', borderRadius: 999, padding: '0 8px', justifySelf: 'start' } : {};

  return (
    <div role="group" aria-label={value === null || !c ? `${label}: ${emptyMessage}` : `${label} ${full(value)}, ${c.spoken}`} style={tileStyle}>
      <div title={label} style={labelStyle}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div title={value === null ? undefined : full(value)} style={{ color: 'var(--wc-ink-primary)', fontSize: 32, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
          {value === null ? '—' : display(value)}
        </div>
        {geo && (
          <svg width={SPARK.w} height={SPARK.h} aria-hidden="true" style={{ flex: 'none' }}>
            {geo.zeroY !== null && <line x1={0} x2={SPARK.w} y1={geo.zeroY} y2={geo.zeroY} stroke="var(--wc-axis)" strokeDasharray="3 3" />}
            <path d={geo.d} fill="none" stroke="var(--wc-series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={geo.last.x} cy={geo.last.y} r={3} fill="var(--wc-series-1)" />
          </svg>
        )}
      </div>
      {c ? (
        <div style={{ color: TONE[c.tone], fontSize: 14, ...badge }}>{c.arrow ? `${c.arrow} ${c.text}` : c.text}</div>
      ) : (
        <div style={{ color: 'var(--wc-ink-secondary)', fontSize: 14 }}>{emptyMessage}</div>
      )}
    </div>
  );
}
