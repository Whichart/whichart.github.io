// Current vs previous period: this period's line over the previous one, aligned day by day. Recharts (React).
// Usage: <PeriodComparison rows={rows} label="Revenue" currency="USD" />
// Rows: [{ date: '2026-08-04', value: 1722 }, ...] daily, covering two periods (56 days for the default 28).
// Colours are CSS variables from @whichart/tokens/whichart.css. Public domain (CC0).
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface PeriodRow {
  date: string;
  value: number | null;
}

export interface PeriodComparisonProps {
  rows: PeriodRow[];
  label?: string;
  locale?: string;
  currency?: string;
  /** Period length in days. 28 keeps weekdays aligned (Monday against Monday). */
  days?: number;
  emptyMessage?: string;
  noPreviousMessage?: string;
  /** Total height in px; by default the chart fills its container. */
  height?: number;
}

const DAY = 864e5;
const MAX_TITLE = 40;
const COMPACT_FROM = 100_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

function niceTicks(lo: number, hi: number, count = 5): number[] {
  if (hi <= lo) hi = lo + 1;
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) as number;
  const ticks = [];
  for (let t = Math.floor(lo / step) * step; ; t += step) {
    ticks.push(Math.round(t * 1e10) / 1e10);
    if (t >= hi - step * 1e-9) return ticks;
  }
}

/** One row per day of the current period, with the matching day of the previous period beside it. */
function windows(rows: PeriodRow[], n: number) {
  const byDate = new Map(rows.filter((r) => r.date).map((r) => [r.date, r.value]));
  if (!byDate.size) return { data: [], hasPrevious: false };
  const dates = [...byDate.keys()].sort();
  const end = Date.parse(`${dates[dates.length - 1]}T00:00:00Z`);
  const start = Math.max(end - (n - 1) * DAY, Date.parse(`${dates[0]}T00:00:00Z`));
  const data = [];
  for (let t = start; t <= end; t += DAY) {
    data.push({ date: iso(t), current: byDate.get(iso(t)) ?? null, prevDate: iso(t - n * DAY), previous: byDate.get(iso(t - n * DAY)) ?? null });
  }
  return { data, hasPrevious: data.some((d) => d.previous !== null) };
}

export default function PeriodComparison({
  rows,
  label = 'Value',
  locale = 'en-US',
  currency,
  days = 28,
  emptyMessage = 'No data for this period',
  noPreviousMessage = 'No previous period to compare yet',
  height,
}: PeriodComparisonProps) {
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  const compact = new Intl.NumberFormat(locale, { ...style, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const full = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  const pointLabel = (v: number) => (Math.abs(v) >= COMPACT_FROM ? compact.format(v) : full.format(v));
  const dayFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const fmt = (d: string) => dayFmt.format(new Date(`${d}T00:00:00Z`));
  const title = label.length > MAX_TITLE ? `${label.slice(0, MAX_TITLE - 1).trimEnd()}…` : label;

  const { data, hasPrevious } = windows(rows, days);
  const values = data.flatMap((d) => [d.current, d.previous]).filter((v): v is number => v !== null);
  const allZero = values.length > 0 && values.every((v) => v === 0);
  const ticks = allZero || !values.length ? [0, 1] : niceTicks(Math.min(0, ...values), Math.max(...values));
  const axis = { stroke: 'var(--wc-axis)', tick: { fill: 'var(--wc-ink-muted)', fontSize: 12 }, tickLine: false };
  const key = (color: string, dashed: boolean, text: string) => (
    <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <svg width="18" height="4" aria-hidden="true">
        <line x1="0" y1="2" x2="18" y2="2" stroke={color} strokeWidth="2" strokeDasharray={dashed ? '4 3' : undefined} />
      </svg>
      {text}
    </li>
  );

  return (
    <figure style={{ margin: 0, fontFamily: 'var(--wc-font)', position: 'relative', height: height ?? '100%', minHeight: 200, display: 'flex', flexDirection: 'column' }}>
      <figcaption style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        <span title={label} style={{ color: 'var(--wc-ink-primary)', fontWeight: 600, fontSize: 16 }}>
          {title}
        </span>
        {data.length > 0 && !hasPrevious && <span style={{ color: 'var(--wc-ink-secondary)', fontSize: 12 }}>{noPreviousMessage}</span>}
      </figcaption>
      <ul style={{ display: 'flex', gap: 12, listStyle: 'none', margin: '0 0 4px', padding: 0, fontSize: 12, color: 'var(--wc-ink-secondary)' }}>
        {key('var(--wc-series-1)', false, `Last ${days} days`)}
        {hasPrevious && key('var(--wc-ink-muted)', true, `Previous ${days} days`)}
      </ul>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--wc-grid)" />
            <XAxis dataKey="date" tickFormatter={fmt} minTickGap={24} {...axis} />
            <YAxis width={64} tickFormatter={(v: number) => compact.format(v)} domain={[ticks[0], ticks[ticks.length - 1]]} ticks={ticks} axisLine={false} {...axis} />
            <Tooltip
              content={({ active, payload }) => {
                const d = active && payload?.[0]?.payload;
                if (!d) return null;
                return (
                  <div style={{ background: 'var(--wc-surface)', border: '1px solid var(--wc-axis)', color: 'var(--wc-ink-primary)', padding: '6px 10px', fontSize: 12 }}>
                    <div>{`${fmt(d.date)}: ${d.current === null ? '—' : full.format(d.current)}`}</div>
                    {hasPrevious && <div style={{ color: 'var(--wc-ink-secondary)' }}>{`${fmt(d.prevDate)}: ${d.previous === null ? '—' : full.format(d.previous)}`}</div>}
                  </div>
                );
              }}
            />
            {hasPrevious && (
              <Line type="linear" dataKey="previous" stroke="var(--wc-ink-muted)" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} isAnimationActive={false} />
            )}
            <Line
              type="linear"
              dataKey="current"
              stroke="var(--wc-series-1)"
              strokeWidth={2}
              dot={data.length === 1 ? { r: 4, fill: 'var(--wc-series-1)', stroke: 'none' } : false}
              label={data.length === 1 ? { position: 'top', fill: 'var(--wc-ink-primary)', formatter: (v: unknown) => pointLabel(Number(v)) } : undefined}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {!data.length && (
        <p style={{ position: 'absolute', inset: '48px 0 0 0', display: 'grid', placeItems: 'center', margin: 0, color: 'var(--wc-ink-secondary)' }}>{emptyMessage}</p>
      )}
    </figure>
  );
}
