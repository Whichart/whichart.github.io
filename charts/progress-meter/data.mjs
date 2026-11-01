// One value against its target, and how much of the period has passed (0–1). Columns: value, target, elapsed.
export default function generate() {
  const usd = { label: 'Revenue this month', locale: 'en-US', currency: 'USD' };
  return {
    columns: ['value', 'target', 'elapsed'],
    sample: { rows: [{ value: 35200, target: 50000, elapsed: 0.6 }], options: usd },
    states: {
      empty: { rows: [], options: usd },
      allZeros: { rows: [{ value: 0, target: 50000, elapsed: 0.4 }], options: usd },
      outlier: { rows: [{ value: 90000, target: 50000, elapsed: 0.7 }], options: { ...usd, label: 'Revenue this month (flash sale)' } },
      negative: { rows: [{ value: -1200, target: 10000, elapsed: 0.5 }], options: { ...usd, label: 'Net profit this month' } },
      longLabels: { rows: [{ value: 35200, target: 50000, elapsed: 0.6 }], options: { ...usd, label: 'Revenue from all channels this month after refunds and fees' } },
      largeNumbers: { rows: [{ value: 257000000, target: 365000000, elapsed: 0.6 }], options: { label: 'Revenue this quarter', locale: 'en-IN', currency: 'BDT' } },
      // No target yet: nothing to compare against.
      noPrevious: { rows: [{ value: 35200, target: null, elapsed: 0.6 }], options: usd },
    },
  };
}
