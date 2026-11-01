// Product performance this month. Columns: product, orders, revenue, change (fraction vs last month; blank = new).
export default function generate() {
  const list = [
    ['Trail runner', 412, 48210, 0.124], ['Rain jacket', 233, 39650, 0.061], ['Wool sweater', 268, 31220, -0.042], ['Canvas tote', 541, 24870, 0.318],
    ['Linen shirt', 286, 18340, -0.155], ['Running socks (3-pack)', 1102, 15990, 0.022], ['Sun hat', 309, 11460, null], ['Swim shorts', 147, 6230, -0.381],
    ['Leather belt', 98, 5210, 0.007], ['Water bottle', 211, 4120, 0.094], ['Gift card', 77, 3880, null], ['Beanie', 64, 2410, -0.12],
  ];
  const rows = list.map(([product, orders, revenue, change]) => ({ product, orders, revenue, change }));
  const columns = [
    { key: 'product', label: 'Product', format: 'text' },
    { key: 'orders', label: 'Orders', format: 'number' },
    { key: 'revenue', label: 'Revenue', format: 'currency' },
    { key: 'change', label: 'vs last month', format: 'change' },
  ];
  const usd = { label: 'Products this month', locale: 'en-US', currency: 'USD', columns, sortBy: 'revenue' };
  return {
    columns: ['product', 'orders', 'revenue', 'change'],
    sample: { rows: rows.slice(0, 8), options: usd },
    states: {
      empty: { rows: [], options: usd },
      singlePoint: { rows: rows.slice(0, 1), options: usd },
      allZeros: { rows: rows.slice(0, 6).map((r) => ({ ...r, orders: 0, revenue: 0, change: 0 })), options: usd },
      outlier: { rows: rows.slice(0, 8).map((r, i) => (i === 0 ? { ...r, orders: 5980, revenue: 612000, change: 11.7 } : r)), options: { ...usd, label: 'Products this month (trail runner launch)' } },
      negative: { rows: rows.slice(0, 6).map((r, i) => ({ ...r, revenue: [8400, 5100, -1200, 2300, -3900, 1500][i] })), options: { ...usd, label: 'Profit by product', columns: columns.map((c) => (c.key === 'revenue' ? { ...c, label: 'Profit' } : c)) } },
      manySeries: { rows, options: usd },
      longLabels: { rows: rows.slice(0, 8).map((r) => ({ ...r, product: `${r.product} (limited edition in recycled materials)` })), options: usd },
      largeNumbers: { rows: rows.slice(0, 8).map((r) => ({ ...r, orders: r.orders * 900, revenue: r.revenue * 7300 })), options: { ...usd, locale: 'en-IN', currency: 'BDT' } },
      noPrevious: { rows: rows.slice(0, 8).map((r) => ({ ...r, change: null })), options: { ...usd, label: 'Products in our first month' } },
    },
  };
}
