// Data table: exact values in typed columns, sortable, with the important cells highlighted. React.
// Usage: <DataTable rows={rows} label="Products" currency="USD" columns={[{ key: 'product', label: 'Product' }, { key: 'revenue', label: 'Revenue', format: 'currency' }]} />
// Colours are CSS variables from @whichart/tokens/whichart.css. Public domain (CC0).
import { useState, type CSSProperties } from 'react';

export type Format = 'text' | 'number' | 'currency' | 'percent' | 'change';
export interface Column {
  key: string;
  label?: string;
  format?: Format;
  /** For change columns: 'down' when a fall is good (refund rate, churn). */
  goodDirection?: 'up' | 'down';
}
export type Row = Record<string, string | number | null>;

export interface TableOptions {
  label?: string;
  locale?: string;
  currency?: string;
  columns?: Column[];
  /** Initial sort column and direction. */
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  pageSize?: number;
  emptyMessage?: string;
  newLabel?: string;
}

export interface DataTableProps extends TableOptions {
  rows: Row[];
}

const MAX_TEXT = 28;

interface Cell {
  text: string;
  title?: string;
  tone?: 'good' | 'bad' | 'neutral';
  numeric: boolean;
}

/** Columns from the options, or inferred: numbers become number columns, the rest text. */
function columnsFor(rows: Row[], options: TableOptions): Required<Pick<Column, 'key' | 'label' | 'format'>>[] {
  const cols: Column[] = options.columns ?? Object.keys(rows[0] ?? {}).map((key) => ({ key, format: rows.some((r) => typeof r[key] === 'number') ? 'number' : 'text' }));
  return cols.map((c) => ({ ...c, label: c.label ?? c.key.replace(/[_-]+/g, ' ').replace(/^./, (x) => x.toUpperCase()), format: c.format ?? 'text' }));
}

/** One formatted cell. Tables are for exact values: full precision, grouped the locale's way. */
function formatCell(v: string | number | null | undefined, col: Column, options: TableOptions): Cell {
  const { locale = 'en-US', currency, newLabel = 'New' } = options;
  const format = col.format ?? 'text';
  if (format === 'text') {
    const s = v === null || v === undefined ? '—' : String(v);
    return { text: s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT - 1).trimEnd()}…` : s, title: s.length > MAX_TEXT ? s : undefined, numeric: false };
  }
  if (format === 'change' && (v === null || v === undefined || v === '')) return { text: newLabel, tone: 'neutral', numeric: true };
  if (v === null || v === undefined || v === '') return { text: '—', numeric: true };
  const n = Number(v);
  if (format === 'change') {
    if (n === 0) return { text: 'No change', tone: 'neutral', numeric: true };
    const up = n > 0;
    const good = up === ((col.goodDirection ?? 'up') === 'up');
    const pct = new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.abs(n));
    return { text: `${up ? '▲' : '▼'} ${pct}`, tone: good ? 'good' : 'bad', numeric: true };
  }
  if (format === 'percent') return { text: new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(n), numeric: true };
  const style = format === 'currency' && currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  return { text: new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: format === 'currency' ? 0 : 2 }).format(n), numeric: true };
}

/** Sort a copy: numbers numerically, text alphabetically in the locale; empty values always last. */
function sortRows(rows: Row[], key: string | undefined, dir: 'asc' | 'desc', locale: string): Row[] {
  if (!key) return rows;
  const collator = new Intl.Collator(locale, { numeric: true });
  return [...rows].sort((a, b) => {
    const x = a[key];
    const y = b[key];
    if (x === null || x === undefined || x === '') return 1;
    if (y === null || y === undefined || y === '') return -1;
    const c = typeof x === 'number' && typeof y === 'number' ? x - y : collator.compare(String(x), String(y));
    return dir === 'asc' ? c : -c;
  });
}

const TONE = { good: 'var(--wc-delta-up)', bad: 'var(--wc-delta-down)', neutral: 'var(--wc-delta-neutral)' };
const pad = (numeric: boolean): CSSProperties => ({ padding: '5px 8px', borderBottom: '1px solid var(--wc-grid)', textAlign: numeric ? 'right' : 'left', whiteSpace: 'nowrap' });

export default function DataTable({ rows, ...options }: DataTableProps) {
  const { label = 'Data', locale = 'en-US', pageSize = 10, emptyMessage = 'No data yet' } = options;
  const cols = columnsFor(rows, options);
  const [sortBy, setSortBy] = useState(options.sortBy);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(options.sortDir ?? 'desc');
  const [showAll, setShowAll] = useState(false);
  const sorted = sortRows(rows, sortBy, sortDir, locale);
  const visible = showAll ? sorted : sorted.slice(0, pageSize);

  return (
    <div style={{ fontFamily: 'var(--wc-font)', color: 'var(--wc-ink-primary)', fontSize: 13, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <caption style={{ textAlign: 'left', fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{label}</caption>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} scope="col" aria-sort={sortBy === c.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} style={{ ...pad(c.format !== 'text'), fontWeight: 500, color: 'var(--wc-ink-secondary)' }}>
                {/* Headers are buttons: click to sort, click again to reverse. */}
                <button
                  type="button"
                  style={{ all: 'unset', cursor: 'pointer' }}
                  onClick={() => {
                    setSortDir(sortBy === c.key && sortDir === 'desc' ? 'asc' : 'desc');
                    setSortBy(c.key);
                  }}
                >
                  {c.label}
                  {sortBy === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <tr>
              <td colSpan={cols.length} style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--wc-ink-secondary)', borderBottom: '1px solid var(--wc-grid)' }}>
                {emptyMessage}
              </td>
            </tr>
          )}
          {visible.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => {
                const cell = formatCell(r[c.key], c, options);
                return (
                  <td key={c.key} title={cell.title} style={{ ...pad(cell.numeric), ...(cell.numeric ? { fontVariantNumeric: 'tabular-nums' } : {}), ...(cell.tone ? { color: TONE[cell.tone] } : {}) }}>
                    {cell.text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length > pageSize && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          style={{ marginTop: 6, background: 'none', border: '1px solid var(--wc-border)', borderRadius: 6, padding: '3px 10px', color: 'var(--wc-ink-primary)', cursor: 'pointer', font: 'inherit' }}
        >
          {showAll ? 'Show fewer rows' : `Show all ${sorted.length} rows`}
        </button>
      )}
    </div>
  );
}
