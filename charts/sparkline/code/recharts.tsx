// Sparkline: the shape of one measure over time, small enough for a KPI tile. Recharts (React).
// Usage: <Sparkline rows={rows} label="Revenue" currency="USD" />
// Colours are CSS variables from @whichart/tokens/whichart.css.
// Public domain (CC0): copy, change and ship without attribution.
import { Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface SparkRow {
  date: string;
  value: number | null;
}

export interface SparklineProps {
  rows: SparkRow[];
  label?: string;
  locale?: string;
  currency?: string;
  emptyMessage?: string;
  height?: number;
}

const DAY = 864e5;

function fillDailyGaps(rows: SparkRow[]): SparkRow[] {
  const sorted = rows.filter((r) => r.date).sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) return [];
  const byDate = new Map(sorted.map((r) => [r.date, r.value]));
  const out: SparkRow[] = [];
  const last = Date.parse(`${sorted[sorted.length - 1].date}T00:00:00Z`);
  for (let t = Date.parse(`${sorted[0].date}T00:00:00Z`); t <= last; t += DAY) {
    const date = new Date(t).toISOString().slice(0, 10);
    out.push({ date, value: byDate.get(date) ?? null });
  }
  return out;
}

function describe(data: SparkRow[], label: string, fmt: (v: number) => string, locale: string): string {
  const points = data.filter((d): d is { date: string; value: number } => d.value !== null);
  if (!points.length) return `${label}: no data`;
  const [first, last] = [points[0].value, points[points.length - 1].value];
  const change = first !== 0 && Math.sign(first) === Math.sign(last) ? (last - first) / Math.abs(first) : null;
  const pct = change === null ? '' : `, ${change >= 0 ? 'up' : 'down'} ${new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(Math.abs(change))}`;
  return `${label} over ${data.length} days, from ${fmt(first)} to ${fmt(last)}${pct}`;
}

export default function Sparkline({ rows, label = 'Value', locale = 'en-US', currency, emptyMessage = 'No data yet', height = 64 }: SparklineProps) {
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  const full = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  const data = fillDailyGaps(rows);
  const values = data.map((d) => d.value).filter((v): v is number => v !== null);
  const allZero = values.length > 0 && values.every((v) => v === 0);
  const last = [...data].reverse().find((d) => d.value !== null);
  const [lo, hi] = values.length ? [Math.min(...values), Math.max(...values)] : [0, 1];
  const pad = (hi - lo) * 0.1 || 1;

  if (!data.length) {
    return (
      <div role="img" aria-label={`${label}: ${emptyMessage}`} style={{ height, display: 'grid', placeItems: 'center', color: 'var(--wc-ink-secondary)', fontSize: 12, fontFamily: 'var(--wc-font)' }}>
        {emptyMessage}
      </div>
    );
  }
  return (
    <div role="img" aria-label={describe(data, label, (v) => full.format(v), locale)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 6, left: 4 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={allZero ? [0, 1] : [lo - pad, hi + pad]} />
          <Tooltip
            labelFormatter={(d) => String(d)}
            formatter={(v) => [typeof v === 'number' ? full.format(v) : '—', label]}
            contentStyle={{ background: 'var(--wc-surface)', border: '1px solid var(--wc-axis)', color: 'var(--wc-ink-primary)', fontSize: 12 }}
          />
          {lo < 0 && hi > 0 && <ReferenceLine y={0} stroke="var(--wc-series-1)" strokeOpacity={0.5} strokeDasharray="4 3" />}
          <Line dataKey="value" stroke="var(--wc-series-1)" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
          {/* The latest value is the one people read; mark it. */}
          {last && <ReferenceDot x={last.date} y={last.value as number} ifOverflow="visible" r={3} fill="var(--wc-series-1)" stroke="none" />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
