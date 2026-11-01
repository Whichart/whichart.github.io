// Monthly revenue by sales channel (long format). Columns: group, series, value.
export default function generate() {
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  const base = { Web: [41200, 43800, 45100, 48900, 47600, 52300], App: [22100, 24600, 27900, 30200, 33800, 36100], Retail: [18300, 17900, 18800, 17200, 16900, 17400] };
  const sample = months.flatMap((group, i) => Object.entries(base).map(([series, v]) => ({ group, series, value: v[i] })));
  const usd = { label: 'Revenue by channel', locale: 'en-US', currency: 'USD' };
  const extra = { Marketplace: 6100, Wholesale: 4300, Social: 2800, Affiliates: 1900 };
  return {
    columns: ['group', 'series', 'value'],
    sample: { rows: sample, options: usd },
    states: {
      empty: { rows: [], options: usd },
      singlePoint: { rows: sample.filter((r) => r.group === 'Sep'), options: usd },
      allZeros: { rows: sample.map((r) => ({ ...r, value: 0 })), options: { ...usd, label: 'Returns by channel' } },
      outlier: { rows: sample.map((r) => (r.group === 'Jul' && r.series === 'App' ? { ...r, value: 310000 } : r)), options: { ...usd, label: 'Revenue by channel (app launch in July)' } },
      negative: {
        rows: months.flatMap((group, i) => [
          { group, series: 'Web', value: 8200 + i * 600 },
          { group, series: 'App', value: 3100 + i * 900 },
          { group, series: 'Retail', value: -2400 + i * 300 },
        ]),
        options: { ...usd, label: 'Profit by channel' },
      },
      manySeries: { rows: [...sample, ...months.flatMap((group, i) => Object.entries(extra).map(([series, v]) => ({ group, series, value: v + i * 200 })))], options: usd },
      longLabels: {
        rows: sample.map((r) => ({ ...r, group: `${r.group} 2026 (fiscal Q${r.group === 'Apr' || r.group === 'May' || r.group === 'Jun' ? 1 : 2})`, series: { Web: 'Website checkout (desktop and mobile web)', App: 'Mobile app (iOS and Android)', Retail: 'Retail stores and pop-up events' }[r.series] })),
        options: { ...usd, label: 'Revenue by sales channel, after refunds and marketplace fees' },
      },
      largeNumbers: { rows: sample.map((r) => ({ ...r, value: r.value * 7300 })), options: { label: 'Revenue by channel', locale: 'en-IN', currency: 'BDT' } },
    },
  };
}
