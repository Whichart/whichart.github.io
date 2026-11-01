// Data table: exact values in typed columns, sortable, with the important cells highlighted. Plain DOM.
// Usage: renderDataTable(el, rows, { label: 'Products', currency: 'USD', columns: [{ key: 'product', label: 'Product' }, { key: 'revenue', label: 'Revenue', format: 'currency' }] });
// Colours are CSS variables from @whichart/tokens/whichart.css. Public domain (CC0).

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

export interface Cell {
  text: string;
  title?: string;
  tone?: 'good' | 'bad' | 'neutral';
  numeric: boolean;
}

const MAX_TEXT = 28;

/** Columns from the options, or inferred: numbers become number columns, the rest text. */
export function columnsFor(rows: Row[], options: TableOptions): Required<Pick<Column, 'key' | 'label' | 'format'>>[] {
  const cols: Column[] = options.columns ?? Object.keys(rows[0] ?? {}).map((key) => ({ key, format: rows.some((r) => typeof r[key] === 'number') ? 'number' : 'text' }));
  return cols.map((c) => ({ ...c, label: c.label ?? c.key.replace(/[_-]+/g, ' ').replace(/^./, (x) => x.toUpperCase()), format: c.format ?? 'text' }));
}

/** One formatted cell. Tables are for exact values: full precision, grouped the locale's way. */
export function formatCell(v: string | number | null | undefined, col: Column, options: TableOptions): Cell {
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
export function sortRows(rows: Row[], key: string | undefined, dir: 'asc' | 'desc', locale: string): Row[] {
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

export default function renderDataTable(el: HTMLElement, rows: Row[], options: TableOptions = {}): void {
  const { label = 'Data', locale = 'en-US', pageSize = 10, emptyMessage = 'No data yet' } = options;
  const cols = columnsFor(rows, options);
  let sortBy = options.sortBy;
  let sortDir = options.sortDir ?? 'desc';
  let showAll = false;

  const wrap = document.createElement('div');
  Object.assign(wrap.style, { fontFamily: 'var(--wc-font)', color: 'var(--wc-ink-primary)', fontSize: '13px', overflowX: 'auto' });

  function draw() {
    const sorted = sortRows(rows, sortBy, sortDir, locale);
    const visible = showAll ? sorted : sorted.slice(0, pageSize);
    const table = document.createElement('table');
    Object.assign(table.style, { width: '100%', borderCollapse: 'collapse' });
    const caption = table.createCaption();
    caption.textContent = label;
    Object.assign(caption.style, { textAlign: 'left', fontWeight: '600', fontSize: '16px', marginBottom: '6px' });
    const pad = (c: HTMLElement, numeric: boolean) => Object.assign(c.style, { padding: '5px 8px', borderBottom: '1px solid var(--wc-grid)', textAlign: numeric ? 'right' : 'left', whiteSpace: 'nowrap' });

    const head = table.createTHead().insertRow();
    for (const c of cols) {
      const th = document.createElement('th');
      th.scope = 'col';
      const numeric = c.format !== 'text';
      pad(th, numeric);
      Object.assign(th.style, { fontWeight: '500', color: 'var(--wc-ink-secondary)' });
      th.setAttribute('aria-sort', sortBy === c.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
      // Headers are buttons: click to sort, click again to reverse.
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = `${c.label}${sortBy === c.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}`;
      Object.assign(btn.style, { all: 'unset', cursor: 'pointer' });
      btn.addEventListener('click', () => {
        sortDir = sortBy === c.key && sortDir === 'desc' ? 'asc' : 'desc';
        sortBy = c.key;
        draw();
      });
      th.append(btn);
      head.append(th);
    }
    const body = table.createTBody();
    if (!rows.length) {
      const td = body.insertRow().insertCell();
      td.colSpan = cols.length;
      td.textContent = emptyMessage;
      Object.assign(td.style, { padding: '24px 8px', textAlign: 'center', color: 'var(--wc-ink-secondary)', borderBottom: '1px solid var(--wc-grid)' });
    }
    for (const r of visible) {
      const tr = body.insertRow();
      for (const c of cols) {
        const cell = formatCell(r[c.key], c, options);
        const td = tr.insertCell();
        td.textContent = cell.text;
        if (cell.title) td.title = cell.title;
        pad(td, cell.numeric);
        if (cell.numeric) td.style.fontVariantNumeric = 'tabular-nums';
        if (cell.tone) td.style.color = TONE[cell.tone];
      }
    }
    const parts: Node[] = [table];
    if (sorted.length > pageSize) {
      const more = document.createElement('button');
      more.type = 'button';
      more.textContent = showAll ? 'Show fewer rows' : `Show all ${sorted.length} rows`;
      Object.assign(more.style, { marginTop: '6px', background: 'none', border: '1px solid var(--wc-border)', borderRadius: '6px', padding: '3px 10px', color: 'var(--wc-ink-primary)', cursor: 'pointer', font: 'inherit' });
      more.addEventListener('click', () => {
        showAll = !showAll;
        draw();
      });
      parts.push(more);
    }
    wrap.replaceChildren(...parts);
  }
  draw();
  el.replaceChildren(wrap);
}
