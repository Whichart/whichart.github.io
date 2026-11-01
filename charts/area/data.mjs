import { rng, days, dailyRevenue } from '../../scripts/lib/data.mjs';

// Daily orders for an online store. Columns: date, value.
export default function generate() {
  const random = rng(20261102);
  const dates = days('2026-07-01', 90);
  const sample = dailyRevenue(random, dates, { base: 46, growth: 0.005, weekend: 0.3, noise: 0.15 });
  const orders = { label: 'Orders', locale: 'en-US' };
  const closed = new Set([...days('2026-08-05', 5), ...days('2026-09-17', 2)]);
  return {
    columns: ['date', 'value'],
    sample: { rows: sample, options: orders },
    states: {
      empty: { rows: [], options: orders },
      singlePoint: { rows: [{ date: '2026-09-28', value: 52 }], options: orders },
      allZeros: { rows: days('2026-09-01', 30).map((date) => ({ date, value: 0 })), options: orders },
      outlier: { rows: sample.map((r) => (r.date === '2026-09-12' ? { ...r, value: r.value * 7 } : r)), options: orders },
      negative: {
        rows: days('2026-09-01', 30).map((date, i) => ({ date, value: Math.round(Math.sin(i * 0.9) * 18 + (i % 7 === 3 ? -25 : 6)) })),
        options: { label: 'Net new subscribers', locale: 'en-US' },
      },
      longLabels: { rows: sample, options: { ...orders, label: 'Orders shipped from all warehouses, excluding cancellations' } },
      largeNumbers: {
        rows: sample.map((r) => ({ ...r, value: r.value * 52000 })),
        options: { label: 'Revenue', locale: 'en-IN', currency: 'BDT' },
      },
      timeGaps: { rows: sample.filter((r) => !closed.has(r.date)), options: orders },
    },
  };
}
