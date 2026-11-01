import { rng, days, dailyRevenue } from '../../scripts/lib/data.mjs';

// 56 days of daily revenue: the tile shows the last 28 against the 28 before. Columns: date, value.
export default function generate() {
  const dates = days('2026-08-06', 56);
  const sample = dailyRevenue(rng(20261105), dates, { base: 1900, growth: 0.005 });
  const usd = { label: 'Revenue', locale: 'en-US', currency: 'USD' };
  const closed = new Set([...days('2026-09-10', 3), ...days('2026-09-24', 2)]);
  return {
    columns: ['date', 'value'],
    sample: { rows: sample, options: usd },
    states: {
      empty: { rows: [], options: usd },
      singlePoint: { rows: [{ date: '2026-09-30', value: 2240 }], options: usd },
      allZeros: { rows: dates.map((date) => ({ date, value: 0 })), options: { label: 'Refunds', locale: 'en-US', currency: 'USD', goodDirection: 'down' } },
      outlier: { rows: sample.map((r, i) => (i < 28 ? { ...r, value: Math.round(r.value / 9) } : r)), options: { ...usd, label: 'Revenue (launched in September)' } },
      negative: { rows: dates.map((date, i) => ({ date, value: Math.round(Math.sin(i / 5) * 300 + (i < 28 ? 40 : -60)) })), options: { ...usd, label: 'Net profit' } },
      longLabels: { rows: sample, options: { ...usd, label: 'Revenue from all channels after refunds and marketplace fees' } },
      largeNumbers: { rows: sample.map((r) => ({ ...r, value: r.value * 7300 })), options: { label: 'Revenue', locale: 'en-IN', currency: 'BDT' } },
      timeGaps: { rows: sample.filter((r) => !closed.has(r.date)), options: usd },
      noPrevious: { rows: sample.slice(-20), options: usd },
    },
  };
}
