import { rng, days, dailyRevenue } from '../../scripts/lib/data.mjs';

// The last 30 days of revenue, as shown inside a KPI tile. Columns: date, value.
export default function generate() {
  const dates = days('2026-09-01', 30);
  const sample = dailyRevenue(rng(20261103), dates, { base: 2100, growth: 0.006 });
  const usd = { label: 'Revenue', locale: 'en-US', currency: 'USD' };
  return {
    columns: ['date', 'value'],
    sample: { rows: sample, options: usd },
    states: {
      empty: { rows: [], options: usd },
      singlePoint: { rows: [{ date: '2026-09-30', value: 2240 }], options: usd },
      allZeros: { rows: dates.map((date) => ({ date, value: 0 })), options: usd },
      outlier: { rows: sample.map((r) => (r.date === '2026-09-19' ? { ...r, value: r.value * 6 } : r)), options: usd },
      negative: {
        rows: dates.map((date, i) => ({ date, value: Math.round(Math.sin(i / 3) * 400 + i * 12 - 120) })),
        options: { ...usd, label: 'Net profit' },
      },
      timeGaps: { rows: sample.filter((r) => !['2026-09-10', '2026-09-11', '2026-09-12'].includes(r.date)), options: usd },
    },
  };
}
