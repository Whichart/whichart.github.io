// Top-N table: a ranked list with exact values and inline bars. React, no chart library.
// Usage: <TopNTable rows={rows} label="Top products" nameLabel="Product" valueLabel="Revenue" currency="USD" />
// Rows: [{ label: 'Trail runner', value: 48210 }, ...]. Duplicates are summed.
// Colours are CSS variables from @whichart/tokens/whichart.css. Public domain (CC0).
import type { CSSProperties } from 'react';

export interface TopRow {
  label: string;
  value: number | null;
}

export interface TopOptions {
  label?: string;
  locale?: string;
  currency?: string;
  nameLabel?: string;
  valueLabel?: string;
  /** Rows to show before folding the rest into "Other". */
  n?: number;
  otherLabel?: string;
  emptyMessage?: string;
}

export interface TopNTableProps extends TopOptions {
  rows: TopRow[];
}

const MAX_NAME = 28;
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

interface TopLine {
  rank: number | null;
  name: string;
  value: string;
  exact: string;
  /** Bar width, 0–1; 0 for negative values. */
  bar: number;
  share: string;
}

/** Ranked lines, decided in one place so every renderer agrees. */
function topLines(rows: TopRow[], options: TopOptions = {}): TopLine[] {
  const { locale = 'en-US', currency, n = 10, otherLabel = 'Other' } = options;
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  // Tables are for exact values: full precision, grouped the locale's way (1,20,000 in en-IN).
  const full = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
  const sums = new Map<string, number>();
  for (const r of rows) if (r.label) sums.set(r.label, (sums.get(r.label) ?? 0) + (r.value ?? 0));
  const sorted = [...sums].sort((a, b) => b[1] - a[1]);
  const positive = sorted.reduce((a, [, v]) => a + Math.max(0, v), 0);
  const top = Math.max(0, ...sorted.map(([, v]) => v));
  const line = (rank: number | null, name: string, v: number): TopLine => ({
    rank,
    name,
    value: full.format(v),
    exact: full.format(v),
    bar: top > 0 ? Math.max(0, v) / top : 0,
    // Shares only make sense for positive parts of a positive total.
    share: positive > 0 && v >= 0 ? pct.format(v / positive) : '—',
  });
  const lines = sorted.slice(0, n).map(([name, v], i) => line(i + 1, name, v));
  if (sorted.length > n) {
    const rest = sorted.slice(n);
    lines.push(line(null, `${otherLabel} (${rest.length})`, rest.reduce((a, [, v]) => a + v, 0)));
  }
  return lines;
}

const cell: CSSProperties = { padding: '4px 6px', borderBottom: '1px solid var(--wc-grid)', textAlign: 'left' };
const num: CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

export default function TopNTable({ rows, ...options }: TopNTableProps) {
  const { label = 'Top items', nameLabel = 'Name', valueLabel = 'Value', emptyMessage = 'No data yet' } = options;
  const lines = topLines(rows, options);
  const th: CSSProperties = { ...cell, color: 'var(--wc-ink-secondary)', fontWeight: 500 };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--wc-font)', fontSize: 13, color: 'var(--wc-ink-primary)' }}>
      <caption style={{ textAlign: 'left', fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{label}</caption>
      <thead>
        <tr>
          <th scope="col" style={{ ...th, textAlign: 'right' }}>#</th>
          <th scope="col" style={th}>{nameLabel}</th>
          <th scope="col" style={{ ...th, textAlign: 'right' }}>{valueLabel}</th>
          <th scope="col" style={th}>Share</th>
        </tr>
      </thead>
      <tbody>
        {!lines.length && (
          <tr>
            <td colSpan={4} style={{ ...cell, color: 'var(--wc-ink-secondary)', textAlign: 'center', padding: '24px 6px' }}>{emptyMessage}</td>
          </tr>
        )}
        {lines.map((l) => (
          <tr key={l.name}>
            <td style={{ ...cell, ...num, color: 'var(--wc-ink-muted)', width: '1.5em' }}>{l.rank ?? ''}</td>
            <td title={l.name} style={{ ...cell, whiteSpace: 'nowrap', color: l.rank === null ? 'var(--wc-ink-secondary)' : 'var(--wc-ink-primary)' }}>{short(l.name, MAX_NAME)}</td>
            <td style={{ ...cell, ...num }}>{l.value}</td>
            <td style={{ ...cell, width: '36%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ flex: 1, height: 8 }}>
                  <div style={{ width: `${l.bar * 100}%`, height: '100%', borderRadius: '0 4px 4px 0', background: 'var(--wc-series-1)' }} />
                </div>
                <span style={{ width: '3em', textAlign: 'right', color: 'var(--wc-ink-secondary)', fontVariantNumeric: 'tabular-nums' }}>{l.share}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
