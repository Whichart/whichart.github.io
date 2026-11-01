// Revenue by product category. Columns: category, value.
export default function generate() {
  const sample = [
    ['Shoes', 48210], ['Outerwear', 39650], ['Dresses', 31220], ['Accessories', 24870],
    ['Knitwear', 18340], ['Bags', 15990], ['Activewear', 11460], ['Swimwear', 6230],
  ].map(([category, value]) => ({ category, value }));
  const usd = { label: 'Revenue by category', locale: 'en-US', currency: 'USD' };
  const extra = ['Socks', 'Hats', 'Belts', 'Scarves', 'Gloves', 'Sunglasses', 'Jewellery', 'Watches', 'Wallets', 'Umbrellas'].map((category, i) => ({ category, value: 5200 - i * 430 }));
  return {
    columns: ['category', 'value'],
    sample: { rows: sample, options: usd },
    states: {
      empty: { rows: [], options: usd },
      singlePoint: { rows: [{ category: 'Shoes', value: 48210 }], options: usd },
      allZeros: { rows: sample.map((r) => ({ ...r, value: 0 })), options: { ...usd, label: 'Returns by category' } },
      outlier: { rows: sample.map((r) => (r.category === 'Shoes' ? { ...r, value: 412000 } : r)), options: { ...usd, label: 'Revenue by category (shoe launch)' } },
      negative: {
        rows: [['Shoes', 8400], ['Outerwear', 5100], ['Dresses', 2300], ['Accessories', -1200], ['Knitwear', -3900], ['Bags', 1500]].map(([category, value]) => ({ category, value })),
        options: { ...usd, label: 'Profit by category' },
      },
      manySeries: { rows: [...sample, ...extra], options: usd },
      longLabels: {
        rows: sample.map((r) => ({ ...r, category: `${r.category} including limited-edition and seasonal collections` })),
        options: { ...usd, label: 'Revenue by product category, after refunds and marketplace fees' },
      },
      largeNumbers: { rows: sample.map((r) => ({ ...r, value: r.value * 7300 })), options: { label: 'Revenue by category', locale: 'en-IN', currency: 'BDT' } },
    },
  };
}
