// Donut chart: how one total splits into a few parts, at one moment. Recharts (React).
// Usage: <DonutChart rows={rows} label="Revenue by channel" currency="USD" />
// Rows: [{ category: 'Web', value: 52300 }, ...]. Duplicates are summed.
// Colours are CSS variables from @whichart/tokens/whichart.css, in fixed order. Public domain (CC0).
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export interface DonutRow {
  category: string;
  value: number | null;
}

export interface DonutChartProps {
  rows: DonutRow[];
  label?: string;
  locale?: string;
  currency?: string;
  otherLabel?: string;
  emptyMessage?: string;
  zeroMessage?: string;
  negativeMessage?: string;
  /** Total height in px; by default the chart fills its container. */
  height?: number;
}

const MAX_TITLE = 40;
const MAX_NAME = 22;
const MAX_SLICES = 5;
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

function prepare(rows: DonutRow[], otherLabel: string) {
  const sums = new Map<string, number>();
  for (const r of rows) if (r.category) sums.set(r.category, (sums.get(r.category) ?? 0) + (r.value ?? 0));
  let slices = [...sums].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  if (slices.length > MAX_SLICES) {
    const rest = slices.slice(MAX_SLICES - 1);
    slices = [...slices.slice(0, MAX_SLICES - 1), { name: `${otherLabel} (${rest.length})`, value: rest.reduce((a, b) => a + b.value, 0) }];
  }
  return slices;
}

export default function DonutChart({
  rows,
  label = 'Value',
  locale = 'en-US',
  currency,
  otherLabel = 'Other',
  emptyMessage = 'No data for this period',
  zeroMessage = 'Nothing to split yet',
  negativeMessage = 'A donut can’t show negative values',
  height,
}: DonutChartProps) {
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  const compact = new Intl.NumberFormat(locale, { ...style, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const full = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
  const slices = prepare(rows, otherLabel);
  const total = slices.reduce((a, s) => a + s.value, 0);
  // A ring of zeros has no shape, and a negative slice can't be drawn as a share: say so instead.
  const message = !slices.length ? emptyMessage : slices.some((s) => s.value < 0) ? negativeMessage : total === 0 ? zeroMessage : null;
  const share = (v: number) => pct.format(v / total);

  return (
    <figure style={{ margin: 0, fontFamily: 'var(--wc-font)', height: height ?? '100%', minHeight: 180, display: 'flex', flexDirection: 'column' }}>
      <figcaption title={label} style={{ color: 'var(--wc-ink-primary)', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
        {short(label, MAX_TITLE)}
      </figcaption>
      {message ? (
        <p style={{ flex: 1, display: 'grid', placeItems: 'center', margin: 0, color: 'var(--wc-ink-secondary)' }}>{message}</p>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flex: '1 1 55%', height: '100%', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(v, n) => [`${full.format(Number(v))} · ${share(Number(v))}`, String(n)]}
                  contentStyle={{ background: 'var(--wc-surface)', border: '1px solid var(--wc-axis)', color: 'var(--wc-ink-primary)' }}
                />
                {/* A 2px gap in the surface colour separates the slices. */}
                <Pie data={slices} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" startAngle={90} endAngle={-270} stroke="var(--wc-surface)" strokeWidth={2} isAnimationActive={false}>
                  {slices.map((s, i) => (
                    <Cell key={s.name} fill={`var(--wc-series-${i + 1})`} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', textAlign: 'center' }}>
              <div>
                <div title={full.format(total)} style={{ color: 'var(--wc-ink-primary)', fontWeight: 600, fontSize: 18 }}>{compact.format(total)}</div>
                <div style={{ color: 'var(--wc-ink-secondary)', fontSize: 12 }}>Total</div>
              </div>
            </div>
          </div>
          {/* Every slice is named with its share, so colour is never the only cue. */}
          <ul style={{ flex: '1 1 45%', listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6, fontSize: 13, minWidth: 0 }}>
            {slices.map((s, i) => (
              <li key={s.name} title={`${s.name}: ${full.format(s.value)}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--wc-ink-secondary)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, flex: 'none', background: `var(--wc-series-${i + 1})` }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{short(s.name, MAX_NAME)}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--wc-ink-primary)', fontVariantNumeric: 'tabular-nums' }}>{share(s.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </figure>
  );
}
