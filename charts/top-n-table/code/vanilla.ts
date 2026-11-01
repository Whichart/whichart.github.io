// Top-N table: a ranked list with exact values and inline bars. Plain DOM, no chart library.
// Usage: renderTopNTable(el, rows, { label: 'Top products', nameLabel: 'Product', valueLabel: 'Revenue', currency: 'USD' });
// Rows: [{ label: 'Trail runner', value: 48210 }, ...]. Duplicates are summed.
// Colours are CSS variables from @whichart/tokens/whichart.css. Public domain (CC0).

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

export interface TopLine {
  rank: number | null;
  name: string;
  value: string;
  exact: string;
  /** Bar width, 0–1; 0 for negative values. */
  bar: number;
  share: string;
}

const MAX_NAME = 28;
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Ranked lines, decided in one place so every renderer agrees. */
export function topLines(rows: TopRow[], options: TopOptions = {}): TopLine[] {
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

export default function renderTopNTable(el: HTMLElement, rows: TopRow[], options: TopOptions = {}): void {
  const { label = 'Top items', nameLabel = 'Name', valueLabel = 'Value', emptyMessage = 'No data yet' } = options;
  const lines = topLines(rows, options);
  const table = document.createElement('table');
  Object.assign(table.style, { width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--wc-font)', fontSize: '13px', color: 'var(--wc-ink-primary)' });
  const caption = table.createCaption();
  caption.textContent = label;
  Object.assign(caption.style, { textAlign: 'left', fontWeight: '600', fontSize: '16px', marginBottom: '6px' });

  const cellStyle = (td: HTMLElement, extra: Partial<CSSStyleDeclaration> = {}) =>
    Object.assign(td.style, { padding: '4px 6px', borderBottom: '1px solid var(--wc-grid)', textAlign: 'left', ...extra });
  const head = table.createTHead().insertRow();
  for (const [text, align] of [['#', 'right'], [nameLabel, 'left'], [valueLabel, 'right'], ['Share', 'left']] as const) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = text;
    cellStyle(th, { textAlign: align, color: 'var(--wc-ink-secondary)', fontWeight: '500' });
    head.append(th);
  }
  const body = table.createTBody();
  if (!lines.length) {
    const td = body.insertRow().insertCell();
    td.colSpan = 4;
    td.textContent = emptyMessage;
    cellStyle(td, { color: 'var(--wc-ink-secondary)', textAlign: 'center', padding: '24px 6px' });
  }
  for (const l of lines) {
    const tr = body.insertRow();
    const rank = tr.insertCell();
    rank.textContent = l.rank === null ? '' : String(l.rank);
    cellStyle(rank, { textAlign: 'right', color: 'var(--wc-ink-muted)', width: '1.5em', fontVariantNumeric: 'tabular-nums' });
    const name = tr.insertCell();
    name.textContent = short(l.name, MAX_NAME);
    name.title = l.name;
    cellStyle(name, { whiteSpace: 'nowrap', color: l.rank === null ? 'var(--wc-ink-secondary)' : 'var(--wc-ink-primary)' });
    const value = tr.insertCell();
    value.textContent = l.value;
    cellStyle(value, { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' });
    const share = tr.insertCell();
    cellStyle(share, { width: '36%' });
    const wrap = document.createElement('div');
    Object.assign(wrap.style, { display: 'flex', alignItems: 'center', gap: '6px' });
    const track = document.createElement('div');
    Object.assign(track.style, { flex: '1', height: '8px' });
    const bar = document.createElement('div');
    Object.assign(bar.style, { width: `${l.bar * 100}%`, height: '100%', borderRadius: '0 4px 4px 0', background: 'var(--wc-series-1)' });
    track.append(bar);
    const pctEl = document.createElement('span');
    pctEl.textContent = l.share;
    Object.assign(pctEl.style, { width: '3em', textAlign: 'right', color: 'var(--wc-ink-secondary)', fontVariantNumeric: 'tabular-nums' });
    wrap.append(track, pctEl);
    share.append(wrap);
  }
  el.replaceChildren(table);
}
