// Horizontal bar chart: compare one measure across categories, largest first. Recharts (React).
// Usage: <HorizontalBarChart rows={rows} label="Revenue by category" currency="USD" />
// Rows: [{ category: 'Shoes', value: 48210 }, ...]. Duplicates are summed.
// Colours are CSS variables from @whichart/tokens/whichart.css. Public domain (CC0).
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface BarRow {
  category: string;
  value: number | null;
}

export interface HorizontalBarChartProps {
  rows: BarRow[];
  label?: string;
  locale?: string;
  currency?: string;
  /** Keep the input order, e.g. for sizes or age bands. Default: largest first. */
  keepOrder?: boolean;
  maxBars?: number;
  otherLabel?: string;
  emptyMessage?: string;
  /** Total height in px; by default the chart fills its container. */
  height?: number;
}

const MAX_TITLE = 40;
const MAX_NAME = 24;
const COMPACT_FROM = 100_000;
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

function prepare(rows: BarRow[], keepOrder: boolean, maxBars: number, otherLabel: string) {
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

export default function HorizontalBarChart({
  rows,
  label = 'Value',
  locale = 'en-US',
  currency,
  keepOrder = false,
  maxBars = 12,
  otherLabel = 'Other',
  emptyMessage = 'No data for this period',
  height,
}: HorizontalBarChartProps) {
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  const compact = new Intl.NumberFormat(locale, { ...style, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const full = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  const valueLabel = (v: number) => (Math.abs(v) >= COMPACT_FROM ? compact.format(v) : full.format(v));
  const bars = prepare(rows, keepOrder, maxBars, otherLabel);
  const values = bars.map((b) => b.value);
  const allZero = values.length > 0 && values.every((v) => v === 0);
  const hasNegative = values.some((v) => v < 0);
  const axis = { stroke: 'var(--wc-axis)', tick: { fill: 'var(--wc-ink-muted)', fontSize: 12 }, tickLine: false };

  return (
    <figure style={{ margin: 0, fontFamily: 'var(--wc-font)', position: 'relative', height: height ?? '100%', minHeight: 160, display: 'flex', flexDirection: 'column' }}>
      <figcaption title={label} style={{ color: 'var(--wc-ink-primary)', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
        {short(label, MAX_TITLE)}
      </figcaption>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bars} layout="vertical" margin={{ top: 4, right: 56, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} stroke="var(--wc-grid)" />
            {/* Bars always start at zero: length is the value. */}
            {/* Negative bars get extra room on the left so their labels don't collide with category names. */}
            <XAxis type="number" domain={allZero || !bars.length ? [0, 1] : [hasNegative ? (min: number) => min * 1.35 : 0, 'auto']} tickFormatter={(v: number) => compact.format(v)} {...axis} />
            <YAxis type="category" dataKey="category" width={132} interval={0} tickFormatter={(v: string) => short(v, MAX_NAME)} {...axis} />
            {hasNegative && <ReferenceLine x={0} stroke="var(--wc-axis)" />}
            <Tooltip
              cursor={{ fill: 'var(--wc-grid)', fillOpacity: 0.5 }}
              formatter={(v) => [typeof v === 'number' ? full.format(v) : '—', label]}
              contentStyle={{ background: 'var(--wc-surface)', border: '1px solid var(--wc-axis)', color: 'var(--wc-ink-primary)' }}
            />
            {/* minPointSize keeps zero-value bars (and their "0" labels) visible. */}
            <Bar dataKey="value" fill="var(--wc-series-1)" maxBarSize={28} minPointSize={2} isAnimationActive={false}>
              {bars.map((b) => (
                <Cell key={b.category} radius={(b.value < 0 ? [4, 0, 0, 4] : [0, 4, 4, 0]) as unknown as number} />
              ))}
              {/* Every bar is labelled at its end, so exact values never depend on reading the axis. */}
              <LabelList dataKey="value" position="right" formatter={(v: unknown) => valueLabel(Number(v))} fill="var(--wc-ink-primary)" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {!bars.length && (
        <p style={{ position: 'absolute', inset: '32px 0 0 0', display: 'grid', placeItems: 'center', margin: 0, color: 'var(--wc-ink-secondary)' }}>{emptyMessage}</p>
      )}
    </figure>
  );
}
