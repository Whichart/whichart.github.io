import { rng, days, dailyRevenue } from '../../scripts/lib/data.mjs';

// Daily revenue by sales channel (long format). Columns: date, series, value.
export default function generate() {
  const dates = days('2026-07-01', 90);
  const channel = (name, seed, base, growth) => dailyRevenue(rng(seed), dates, { base, growth }).map((r) => ({ date: r.date, series: name, value: r.value }));
  const web = channel('Web', 11, 1700, 0.004);
  const app = channel('App', 12, 1100, 0.008);
  const retail = channel('Retail', 13, 650, -0.001);
  const sample = [...web, ...app, ...retail];
  const usd = { label: 'Revenue by channel', locale: 'en-US', currency: 'USD' };
  const closed = new Set([...days('2026-08-05', 5), ...days('2026-09-17', 2)]);
  const many = [
    ...sample,
    ...channel('Marketplace', 14, 420, 0.006),
    ...channel('Wholesale', 15, 300, 0),
    ...channel('Social', 16, 180, 0.01),
    ...channel('Affiliates', 17, 120, 0.002),
  ];
  return {
    columns: ['date', 'series', 'value'],
    sample: { rows: sample, options: usd },
    states: {
      empty: { rows: [], options: usd },
      singlePoint: { rows: [{ date: '2026-09-28', series: 'Web', value: 2140 }, { date: '2026-09-28', series: 'App', value: 1460 }, { date: '2026-09-28', series: 'Retail', value: 610 }], options: usd },
      allZeros: { rows: days('2026-09-01', 30).flatMap((date) => ['Web', 'App'].map((series) => ({ date, series, value: 0 }))), options: usd },
      outlier: { rows: sample.map((r) => (r.series === 'App' && r.date === '2026-09-12' ? { ...r, value: r.value * 8 } : r)), options: usd },
      negative: {
        rows: days('2026-09-01', 30).flatMap((date, i) => [
          { date, series: 'Web', value: Math.round(Math.sin(i / 3) * 500 + 200) },
          { date, series: 'App', value: Math.round(Math.cos(i / 4) * 400 - 100) },
        ]),
        options: { ...usd, label: 'Net profit by channel' },
      },
      manySeries: { rows: many, options: usd },
      longLabels: {
        rows: sample.map((r) => ({ ...r, series: { Web: 'Website checkout (desktop and mobile web)', App: 'Mobile app (iOS and Android)', Retail: 'Retail stores and pop-up events' }[r.series] })),
        options: { ...usd, label: 'Revenue by sales channel, after refunds and marketplace fees' },
      },
      largeNumbers: { rows: sample.map((r) => ({ ...r, value: r.value * 7300 })), options: { label: 'Revenue by channel', locale: 'en-IN', currency: 'BDT' } },
      timeGaps: { rows: sample.filter((r) => !closed.has(r.date)), options: usd },
    },
  };
}
