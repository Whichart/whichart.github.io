// Revenue by sales channel, this month. Columns: category, value.
export default function generate() {
  const sample = [['Web', 52300], ['App', 36100], ['Retail', 17400], ['Marketplace', 8200]].map(([category, value]) => ({ category, value }));
  const usd = { label: 'Revenue by channel, September', locale: 'en-US', currency: 'USD' };
  return {
    columns: ['category', 'value'],
    sample: { rows: sample, options: usd },
    states: {
      empty: { rows: [], options: usd },
      singlePoint: { rows: [{ category: 'Web', value: 52300 }], options: usd },
      allZeros: { rows: sample.map((r) => ({ ...r, value: 0 })), options: { ...usd, label: 'Refunds by channel' } },
      outlier: { rows: [['Web', 912000], ['App', 36100], ['Retail', 17400], ['Marketplace', 8200]].map(([category, value]) => ({ category, value })), options: usd },
      negative: { rows: [['Web', 8400], ['App', 5100], ['Retail', -2400]].map(([category, value]) => ({ category, value })), options: { ...usd, label: 'Profit by channel' } },
      manySeries: {
        rows: [...sample, ...[['Wholesale', 6100], ['Social', 4300], ['Affiliates', 2800], ['Events', 1900]].map(([category, value]) => ({ category, value }))],
        options: usd,
      },
      longLabels: {
        rows: sample.map((r) => ({ ...r, category: { Web: 'Website checkout (desktop and mobile web)', App: 'Mobile app (iOS and Android)', Retail: 'Retail stores and pop-up events', Marketplace: 'Third-party marketplaces' }[r.category] })),
        options: { ...usd, label: 'Revenue by sales channel this month after refunds and fees' },
      },
      largeNumbers: { rows: sample.map((r) => ({ ...r, value: r.value * 7300 })), options: { label: 'Revenue by channel', locale: 'en-IN', currency: 'BDT' } },
    },
  };
}
