// A checkout funnel, last 30 days. Columns: stage, value. Stages are in order.
export default function generate() {
  const rows = (list) => list.map(([stage, value]) => ({ stage, value }));
  const sample = rows([['Visited store', 48200], ['Viewed product', 31400], ['Added to cart', 9860], ['Started checkout', 5720], ['Purchased', 3910]]);
  const base = { label: 'Checkout funnel, last 30 days', locale: 'en-US' };
  return {
    columns: ['stage', 'value'],
    sample: { rows: sample, options: base },
    states: {
      empty: { rows: [], options: base },
      singlePoint: { rows: sample.slice(0, 1), options: base },
      allZeros: { rows: sample.map((r) => ({ ...r, value: 0 })), options: { ...base, label: 'Checkout funnel (store not launched)' } },
      // More people at a later stage than the one before: a counting problem the chart should flag.
      outlier: { rows: rows([['Visited store', 48200], ['Viewed product', 31400], ['Added to cart', 9860], ['Started checkout', 11240], ['Purchased', 3910]]), options: { ...base, label: 'Checkout funnel (express checkout skips the cart)' } },
      negative: { rows: rows([['Visited store', 48200], ['Viewed product', 31400], ['Added to cart', -120]]), options: base },
      longLabels: {
        rows: sample.map((r) => ({ ...r, stage: `${r.stage} on web or app (any device)` })),
        options: { ...base, label: 'Checkout funnel across web and app for all returning and new visitors' },
      },
      largeNumbers: { rows: sample.map((r) => ({ ...r, value: r.value * 950 })), options: { ...base, locale: 'en-IN' } },
    },
  };
}
