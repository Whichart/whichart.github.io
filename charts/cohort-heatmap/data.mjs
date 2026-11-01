import { rng } from '../../scripts/lib/data.mjs';

// Customers by first-order month, and how many ordered again N months later. Columns: cohort, period, value.
export default function generate() {
  const random = rng(20261106);
  const months = ['Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026'];
  const cohort = (name, size, periods, curve = [1, 0.42, 0.31, 0.26, 0.23, 0.21]) =>
    Array.from({ length: periods }, (_, p) => ({ cohort: name, period: p, value: p === 0 ? size : Math.round(size * curve[p] * (0.92 + random() * 0.16)) }));
  const sample = months.flatMap((m, i) => cohort(m, 820 + i * 95, 6 - i));
  const base = { label: 'Customers who ordered again', locale: 'en-US' };
  return {
    columns: ['cohort', 'period', 'value'],
    sample: { rows: sample, options: base },
    states: {
      empty: { rows: [], options: base },
      singlePoint: { rows: [{ cohort: 'Sep 2026', period: 0, value: 1290 }], options: base },
      allZeros: { rows: months.flatMap((m, i) => cohort(m, 900, 6 - i, [1, 0, 0, 0, 0, 0])), options: { ...base, label: 'Customers who ordered again (no repeat orders yet)' } },
      // A tiny cohort: its percentages swing wildly and must be marked.
      outlier: { rows: [...sample.filter((r) => r.cohort !== 'Jun 2026'), ...cohort('Jun 2026', 12, 4, [1, 0.75, 0.58, 0.5])], options: { ...base, label: 'Customers who ordered again (June: tiny cohort)' } },
      negative: { rows: [{ cohort: 'Sep 2026', period: 0, value: 900 }, { cohort: 'Sep 2026', period: 1, value: -40 }], options: base },
      manySeries: {
        rows: ['Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026', ...months].flatMap((m, i, all) => cohort(m, 700 + i * 50, Math.min(6, all.length - i))),
        options: base,
      },
      longLabels: { rows: sample.map((r) => ({ ...r, cohort: `${r.cohort} spring and summer campaign` })), options: { ...base, label: 'Customers who placed another order in later months, by first-order month' } },
      largeNumbers: { rows: sample.map((r) => ({ ...r, value: r.value * 950 })), options: { ...base, locale: 'en-IN' } },
      // A month with no data (tracking outage): blank, not 0%.
      timeGaps: { rows: sample.filter((r) => !(r.cohort === 'May 2026' && r.period === 2)), options: base },
    },
  };
}
