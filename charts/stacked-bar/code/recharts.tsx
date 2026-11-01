// Stacked bar chart: a total per group, split into its parts. Recharts (React).
// Usage: <StackedBarChart rows={rows} label="Revenue by channel" currency="USD" />
// Rows (long format): [{ group: 'Jul', series: 'Web', value: 48210 }, ...]. Groups keep their input order.
// Colours are CSS variables from @whichart/tokens/whichart.css, in fixed order. Public domain (CC0).
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface StackRow {
  group: string;
  series: string;
  value: number | null;
}

export interface StackedBarChartProps {
  rows: StackRow[];
  label?: string;
  locale?: string;
  currency?: string;
  otherLabel?: string;
  emptyMessage?: string;
  /** Total height in px; by default the chart fills its container. */
  height?: number;
}

const MAX_TITLE = 40;
const MAX_NAME = 20;
const MAX_PARTS = 5;
const COMPACT_FROM = 100_000;
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

const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** One row per group with a column per part; parts in order of first appearance, small parts folded. */
function prepare(rows: StackRow[], otherLabel: string) {
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
  const data = groups.map((g) => Object.fromEntries([['group', g], ...parts.map((p) => [p, 0])]) as Record<string, number | string>);
  for (const r of rows) {
    if (r.value === null) continue;
    const row = data[groups.indexOf(r.group)];
    const part = folded.has(r.series) ? otherLabel : r.series;
    row[part] = (row[part] as number) + r.value;
  }
  for (const row of data) {
    row.__total = parts.reduce((a, p) => a + (row[p] as number), 0);
    // Top and bottom of each stack: totals sit on the top; the axis must reach the bottom.
    row.__top = parts.reduce((a, p) => a + Math.max(0, row[p] as number), 0);
    row.__bottom = parts.reduce((a, p) => a + Math.min(0, row[p] as number), 0);
  }
  return { parts, data };
}

export default function StackedBarChart({ rows, label = 'Value', locale = 'en-US', currency, otherLabel = 'Other', emptyMessage = 'No data for this period', height }: StackedBarChartProps) {
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  const compact = new Intl.NumberFormat(locale, { ...style, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const full = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  const totalLabel = (v: number) => (Math.abs(v) >= COMPACT_FROM ? compact.format(v) : full.format(v));
  const { parts, data } = prepare(rows, otherLabel);
  const allZero = data.length > 0 && data.every((d) => parts.every((p) => d[p] === 0));
  const hasNegative = data.some((d) => parts.some((p) => (d[p] as number) < 0));
  const ticks = allZero || !data.length ? [0, 1] : niceTicks(Math.min(0, ...data.map((d) => d.__bottom as number)), Math.max(...data.map((d) => d.__top as number)) * 1.08);
  const axis = { stroke: 'var(--wc-axis)', tick: { fill: 'var(--wc-ink-muted)', fontSize: 12 }, tickLine: false };

  return (
    <figure style={{ margin: 0, fontFamily: 'var(--wc-font)', position: 'relative', height: height ?? '100%', minHeight: 200, display: 'flex', flexDirection: 'column' }}>
      <figcaption title={label} style={{ color: 'var(--wc-ink-primary)', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
        {short(label, MAX_TITLE)}
      </figcaption>
      {/* Legend in entity order, above the plot. */}
      <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', listStyle: 'none', margin: '0 0 4px', padding: 0, fontSize: 12, color: 'var(--wc-ink-secondary)' }}>
        {parts.map((p, i) => (
          <li key={p} title={p} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: `var(--wc-series-${i + 1})` }} />
            {short(p, MAX_NAME)}
          </li>
        ))}
      </ul>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          {/* stackOffset "sign" stacks negative parts below zero and positive parts above. */}
          <ComposedChart data={data} stackOffset="sign" margin={{ top: 20, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--wc-grid)" />
            <XAxis dataKey="group" tickFormatter={(v: string) => short(v, 12)} {...axis} />
            <YAxis width={64} domain={[ticks[0], ticks[ticks.length - 1]]} ticks={ticks} tickFormatter={(v: number) => compact.format(v)} axisLine={false} {...axis} />
            {hasNegative && <ReferenceLine y={0} stroke="var(--wc-axis)" />}
            <Tooltip
              cursor={{ fill: 'var(--wc-grid)', fillOpacity: 0.5 }}
              formatter={(v, n) => [typeof v === 'number' ? full.format(v) : '—', String(n)]}
              contentStyle={{ background: 'var(--wc-surface)', border: '1px solid var(--wc-axis)', color: 'var(--wc-ink-primary)' }}
            />
            {parts.map((p, i) => (
              // A 2px gap in the surface colour separates the segments.
              <Bar key={p} dataKey={p} stackId="total" fill={`var(--wc-series-${i + 1})`} stroke="var(--wc-surface)" strokeWidth={1} maxBarSize={48} isAnimationActive={false} />
            ))}
            {/* Net totals, drawn by an invisible line that sits on top of each stack. */}
            {!allZero && (
              <Line
                dataKey="__top"
                stroke="none"
                dot={false}
                activeDot={false}
                legendType="none"
                tooltipType="none"
                isAnimationActive={false}
                label={(p: { index?: number; x?: number | string; y?: number | string }) => (
                  <text x={Number(p.x)} y={Number(p.y) - 6} textAnchor="middle" fontSize={12} fill="var(--wc-ink-primary)">
                    {totalLabel(data[p.index ?? 0].__total as number)}
                  </text>
                )}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {!data.length && (
        <p style={{ position: 'absolute', inset: '48px 0 0 0', display: 'grid', placeItems: 'center', margin: 0, color: 'var(--wc-ink-secondary)' }}>{emptyMessage}</p>
      )}
    </figure>
  );
}
