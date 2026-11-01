// Multi-line chart: 2–5 measures or segments over time, on one shared axis. Recharts (React).
// Usage: <MultiLineChart rows={rows} label="Revenue by channel" currency="USD" />
// Rows (long format): [{ date: '2026-07-01', series: 'Web', value: 1722 }, ...] at daily intervals.
// Colours are CSS variables from @whichart/tokens/whichart.css, in fixed order. Public domain (CC0).
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface MultiLineRow {
  date: string;
  series: string;
  value: number | null;
}

export interface MultiLineChartProps {
  rows: MultiLineRow[];
  label?: string;
  locale?: string;
  currency?: string;
  emptyMessage?: string;
  otherLabel?: string;
  /** Total height in px. By default the chart fills its container; the legend takes what it needs and the plot gets the rest. */
  height?: number;
}

const DAY = 864e5;
const MAX_TITLE = 40;
const MAX_NAME = 24;
const MAX_SERIES = 5;
const END_LABELS_UP_TO = 4;
const LABEL_GAP = 0.08; // end labels need endpoints at least 8% of the value range apart

const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

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

/** Group by series, sum duplicates, fold small series into "Other", pivot to one row per day. */
function prepare(rows: MultiLineRow[], otherLabel: string) {
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.series, (totals.get(r.series) ?? 0) + (r.value ?? 0));
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
  const byDay = new Map<string, Record<string, number | string | null>>();
  if (dates.length) {
    const last = Date.parse(`${dates[dates.length - 1]}T00:00:00Z`);
    for (let t = Date.parse(`${dates[0]}T00:00:00Z`); t <= last; t += DAY) {
      const date = new Date(t).toISOString().slice(0, 10);
      byDay.set(date, Object.fromEntries([['date', date], ...names.map((n) => [n, null])]));
    }
  }
  for (const r of rows) {
    if (r.value === null) continue;
    const day = byDay.get(r.date)!;
    const name = folded.includes(r.series) ? otherLabel : r.series;
    day[name] = ((day[name] as number | null) ?? 0) + r.value;
  }
  return { names, data: [...byDay.values()] };
}

export default function MultiLineChart({
  rows,
  label = 'Value',
  locale = 'en-US',
  currency,
  emptyMessage = 'No data for this period',
  otherLabel = 'Other',
  height,
}: MultiLineChartProps) {
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  const compact = new Intl.NumberFormat(locale, { ...style, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const full = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  const day = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const fmtDate = (d: string) => day.format(new Date(`${d}T00:00:00Z`));
  const { names, data } = prepare(rows, otherLabel);
  const values = data.flatMap((d) => names.map((n) => d[n])).filter((v): v is number => typeof v === 'number');
  const allZero = values.length > 0 && values.every((v) => v === 0);
  const ticks = allZero || !values.length ? [0, 1] : niceTicks(Math.min(0, ...values), Math.max(...values));
  // Name each line at its end (up to 4), unless two endpoints are close enough for labels to collide.
  const ends = names
    .map(
      (n) =>
        [...data]
          .reverse()
          .map((d) => d[n])
          .find((v) => typeof v === 'number') as number | undefined,
    )
    .filter((v): v is number => v !== undefined)
    .sort((a, b) => a - b);
  const range = values.length ? Math.max(...values) - Math.min(0, ...values) : 0;
  const endLabels = names.length <= END_LABELS_UP_TO && data.length > 1 && range > 0 && ends.every((v, i) => i === 0 || v - ends[i - 1] >= range * LABEL_GAP);
  const axis = { stroke: 'var(--wc-axis)', tick: { fill: 'var(--wc-ink-muted)', fontSize: 12 }, tickLine: false };

  return (
    <figure
      style={{
        margin: 0,
        fontFamily: 'var(--wc-font)',
        position: 'relative',
        height: height ?? '100%',
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <figcaption title={label} style={{ color: 'var(--wc-ink-primary)', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
        {short(label, MAX_TITLE)}
      </figcaption>
      {/* A plain legend above the chart, in entity order; Recharts' own legend can overlap the plot. */}
      <ul
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2px 12px',
          listStyle: 'none',
          margin: '0 0 4px',
          padding: 0,
          fontSize: 12,
          color: 'var(--wc-ink-secondary)',
        }}
      >
        {names.map((n, i) => (
          <li key={n} title={n} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: `var(--wc-series-${i + 1})` }} />
            {short(n, MAX_NAME)}
          </li>
        ))}
      </ul>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: endLabels ? 96 : 16, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--wc-grid)" />
            <XAxis dataKey="date" tickFormatter={fmtDate} minTickGap={24} {...axis} />
            <YAxis
              width={64}
              tickFormatter={(v: number) => compact.format(v)}
              domain={[ticks[0], ticks[ticks.length - 1]]}
              ticks={ticks}
              axisLine={false}
              {...axis}
            />
            <Tooltip
              labelFormatter={(d) => fmtDate(String(d))}
              formatter={(v, n) => [typeof v === 'number' ? full.format(v) : '—', String(n)]}
              contentStyle={{ background: 'var(--wc-surface)', border: '1px solid var(--wc-axis)', color: 'var(--wc-ink-primary)' }}
            />
            {names.map((name, i) => (
              <Line
                key={name}
                type="linear"
                dataKey={name}
                name={name}
                stroke={`var(--wc-series-${i + 1})`}
                strokeWidth={2}
                dot={data.length === 1 ? { r: 4, fill: `var(--wc-series-${i + 1})`, stroke: 'none' } : false}
                connectNulls={false}
                isAnimationActive={false}
                label={
                  endLabels
                    ? (p: { index?: number; x?: number | string; y?: number | string }) =>
                        p.index === data.length - 1 && p.x !== undefined && p.y !== undefined ? (
                          <text x={Number(p.x) + 6} y={Number(p.y)} dy={4} fontSize={12} fill="var(--wc-ink-primary)">
                            {short(name, 14)}
                          </text>
                        ) : (
                          <g />
                        )
                    : undefined
                }
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {!data.length && (
        <p style={{ position: 'absolute', inset: '40px 0 0 0', display: 'grid', placeItems: 'center', margin: 0, color: 'var(--wc-ink-secondary)' }}>
          {emptyMessage}
        </p>
      )}
    </figure>
  );
}
