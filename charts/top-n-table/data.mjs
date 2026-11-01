// Revenue by product, this month. Columns: label, value.
export default function generate() {
  const products = [
    ['Trail runner', 48210], ['Rain jacket', 39650], ['Wool sweater', 31220], ['Canvas tote', 24870], ['Linen shirt', 18340],
    ['Running socks (3-pack)', 15990], ['Sun hat', 11460], ['Swim shorts', 6230], ['Leather belt', 5210], ['Water bottle', 4120],
    ['Gift card', 3880], ['Beanie', 2410], ['Keyring', 980],
  ];
  const rows = (list) => list.map(([label, value]) => ({ label, value }));
  const usd = { label: 'Top products this month', nameLabel: 'Product', valueLabel: 'Revenue', locale: 'en-US', currency: 'USD' };
  return {
    columns: ['label', 'value'],
    sample: { rows: rows(products.slice(0, 8)), options: usd },
    states: {
      empty: { rows: [], options: usd },
      singlePoint: { rows: rows(products.slice(0, 1)), options: usd },
      allZeros: { rows: rows(products.slice(0, 6)).map((r) => ({ ...r, value: 0 })), options: { ...usd, label: 'Returns by product', valueLabel: 'Returns' } },
      outlier: { rows: rows(products.slice(0, 8)).map((r) => (r.label === 'Trail runner' ? { ...r, value: 612000 } : r)), options: { ...usd, label: 'Top products (trail runner launch)' } },
      negative: { rows: rows([['Trail runner', 8400], ['Rain jacket', 5100], ['Wool sweater', 2300], ['Canvas tote', -1200], ['Linen shirt', -3900]]), options: { ...usd, label: 'Profit by product', valueLabel: 'Profit' } },
      manySeries: { rows: rows(products), options: usd },
      longLabels: {
        rows: rows(products.slice(0, 8)).map((r) => ({ ...r, label: `${r.label} (limited edition in recycled materials)` })),
        options: { ...usd, label: 'Top products this month after refunds and marketplace fees' },
      },
      largeNumbers: { rows: rows(products.slice(0, 8)).map((r) => ({ ...r, value: r.value * 7300 })), options: { ...usd, locale: 'en-IN', currency: 'BDT' } },
    },
  };
}
