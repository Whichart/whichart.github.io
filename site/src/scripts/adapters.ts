// Turn a user's rows + the engine's column encoding into the input each chart's code expects.
import { parseDate, parseNumber, type Encoding, type Row } from '@whichart/engine';

const SYMBOL_CURRENCY: [RegExp, string][] = [
  [/৳/, 'BDT'],
  [/₹/, 'INR'],
  [/€/, 'EUR'],
  [/£/, 'GBP'],
  [/¥/, 'JPY'],
  [/\$/, 'USD'],
];

/** Guess a currency from symbols in the raw values, e.g. "$1,234". */
function currencyOf(rows: Row[], column: string): string | undefined {
  const sample = rows.slice(0, 50).map((r) => String(r[column] ?? '')).join(' ');
  return SYMBOL_CURRENCY.find(([re]) => re.test(sample))?.[1];
}

const pretty = (s: string) => s.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const DAY = 864e5;

export interface Adapted {
  rows: unknown[];
  options: Record<string, unknown>;
  note?: string;
}

/** Daily totals of one measure. */
function daily(rows: Row[], time: string, measure: string) {
  const sums = new Map<string, number>();
  for (const r of rows) {
    const t = parseDate(r[time]);
    const v = parseNumber(r[measure]);
    if (t === null || v === null) continue;
    const d = iso(t);
    sums.set(d, (sums.get(d) ?? 0) + v);
  }
  return [...sums].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
}

export function adapt(chart: string, rows: Row[], enc: Encoding): Adapted | null {
  const measure = enc.measures[0];
  if (!measure) return null;
  const base = { label: pretty(measure), locale: navigator.language || 'en-US', currency: currencyOf(rows, measure) };

  // One measure over time, by day.
  if ((chart === 'line' || chart === 'area' || chart === 'period-comparison') && enc.time) {
    return { rows: daily(rows, enc.time, measure), options: base };
  }

  if (chart === 'sparkline' && enc.time) {
    const series = daily(rows, enc.time, measure);
    return { rows: series.slice(-30), options: base, note: series.length > 30 ? 'The last 30 days.' : undefined };
  }

  if (chart === 'multi-line' && enc.time) {
    const time = enc.time;
    const out: { date: string; series: string; value: number | null }[] = [];
    for (const r of rows) {
      const t = parseDate(r[time]);
      if (t === null) continue;
      const date = iso(t);
      if (enc.category) {
        // Long format: one row per series per day.
        out.push({ date, series: String(r[enc.category] ?? ''), value: parseNumber(r[measure]) });
      } else {
        // Wide format: each numeric column is a series.
        for (const m of enc.measures) out.push({ date, series: pretty(m), value: parseNumber(r[m]) });
      }
    }
    const label = enc.category ? `${pretty(measure)} by ${pretty(enc.category).toLowerCase()}` : 'Comparison over time';
    return { rows: out, options: { ...base, label } };
  }

  if (chart === 'kpi-tile-sparkline' && enc.time) {
    return { rows: daily(rows, enc.time, measure), options: base };
  }

  if (chart === 'progress-meter') {
    // Columns are recognised by name: value, a target (target, goal, quota, budget), optionally elapsed (0–1).
    const all = Object.keys(rows[0] ?? {});
    const target = all.find((c) => /target|goal|quota|budget/i.test(c));
    const elapsed = all.find((c) => /elapsed|pace|progress_of_period/i.test(c));
    const valueCol = enc.measures.find((m) => m !== target && m !== elapsed) ?? measure;
    const r = rows[rows.length - 1];
    return {
      rows: r ? [{ value: parseNumber(r[valueCol]), target: target ? parseNumber(r[target]) : null, elapsed: elapsed ? parseNumber(r[elapsed]) : null }] : [],
      options: { ...base, label: pretty(valueCol), currency: currencyOf(rows, valueCol) },
    };
  }

  // One measure per category: bars, donut and ranked table.
  if ((chart === 'bar-horizontal' || chart === 'donut' || chart === 'top-n-table') && enc.category) {
    const cat = enc.category;
    const label = `${pretty(measure)} by ${pretty(cat).toLowerCase()}`;
    const out = rows.map((r) => ({ [chart === 'top-n-table' ? 'label' : 'category']: String(r[cat] ?? ''), value: parseNumber(r[measure]) }));
    return { rows: out, options: { ...base, label, nameLabel: pretty(cat), valueLabel: pretty(measure) } };
  }

  if (chart === 'stacked-bar') {
    // Needs a group and a part: with dates, the group is the month; otherwise the first two text columns.
    const text = Object.keys(rows[0] ?? {}).filter((c) => c !== enc.time && !enc.measures.includes(c) && c !== enc.comparison && rows.some((r) => parseNumber(r[c]) === null));
    const month = new Intl.DateTimeFormat(navigator.language || 'en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
    const out: { group: string; series: string; value: number | null }[] = [];
    for (const r of rows) {
      let group: string | null = null;
      let series: string;
      if (enc.time && text.length >= 1) {
        const t = parseDate(r[enc.time]);
        if (t === null) continue;
        group = month.format(new Date(t));
        series = String(r[text[0]] ?? '');
      } else if (text.length >= 2) {
        group = String(r[text[0]] ?? '');
        series = String(r[text[1]] ?? '');
      } else {
        return null;
      }
      out.push({ group, series, value: parseNumber(r[measure]) });
    }
    return { rows: out, options: { ...base, label: `${pretty(measure)} by ${pretty(text[enc.time ? 0 : 1]).toLowerCase()}` } };
  }

  if (chart === 'data-table') {
    // Numbers arrive as text from a CSV; parse the numeric columns and say how to show each one.
    const keys = Object.keys(rows[0] ?? {});
    const numeric = new Set([...enc.measures, ...(enc.comparison ? [enc.comparison] : [])]);
    const columns = keys.map((key) => ({ key, label: pretty(key), format: numeric.has(key) ? (currencyOf(rows, key) ? 'currency' : 'number') : 'text' }));
    const out = rows.map((r) => Object.fromEntries(keys.map((k) => [k, numeric.has(k) ? parseNumber(r[k]) : String(r[k] ?? '')])));
    return { rows: out, options: { ...base, label: 'Your data', columns, sortBy: measure } };
  }

  if (chart === 'kpi-tile-delta') {
    if (enc.comparison && rows.length <= 1) {
      const r = rows[0];
      return { rows: r ? [{ value: parseNumber(r[measure]), previous: parseNumber(r[enc.comparison]) }] : [], options: base };
    }
    if (enc.time) {
      // Summarise a daily series: the last 30 days against the 30 before.
      const series = daily(rows, enc.time, measure);
      if (!series.length) return { rows: [], options: base };
      const end = Date.parse(`${series[series.length - 1].date}T00:00:00Z`);
      const sum = (from: number, to: number) =>
        series.filter((d) => {
          const t = Date.parse(`${d.date}T00:00:00Z`);
          return t > from && t <= to;
        });
      const current = sum(end - 30 * DAY, end);
      const previous = sum(end - 60 * DAY, end - 30 * DAY);
      const total = (xs: { value: number }[]) => xs.reduce((a, d) => a + d.value, 0);
      return {
        rows: [{ value: total(current), previous: previous.length ? total(previous) : null }],
        options: { ...base, label: `${base.label}, last 30 days`, comparisonLabel: 'vs previous 30 days' },
        note: 'Summed: the last 30 days against the 30 before.',
      };
    }
  }
  return null;
}
