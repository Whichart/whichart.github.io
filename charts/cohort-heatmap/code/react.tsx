// Cohort retention heatmap: of the people who started in each month, how many came back later. React, no chart library.
// Usage: <CohortHeatmap rows={rows} label="Customer retention" />
// Rows: counts, one per cohort and period: [{ cohort: 'Apr 2026', period: 0, value: 1024 }, ...]. Period 0 is the cohort's size.
// Colours are CSS variables from @whichart/tokens/whichart.css (--wc-seq-1 … --wc-seq-13). Public domain (CC0).

export interface CohortRow {
  cohort: string;
  period: number;
  value: number | null;
}

export interface CohortHeatmapProps {
  rows: CohortRow[];
  label?: string;
  locale?: string;
  periodLabel?: string;
  /** Cohorts smaller than this are faded: their percentages are noise. */
  minCohort?: number;
  maxCohorts?: number;
  emptyMessage?: string;
  negativeMessage?: string;
}

const STEPS = 13; // --wc-seq-1 (low) … --wc-seq-13 (high); dark mode flips the ramp in the CSS
const MAX_COHORT = 16;
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

function prepare(rows: CohortRow[], maxCohorts: number) {
  const cohorts = [...new Set(rows.map((r) => r.cohort))].slice(-maxCohorts);
  const periods = [...new Set(rows.map((r) => r.period))].sort((a, b) => a - b);
  const count = new Map(rows.map((r) => [`${r.cohort}|${r.period}`, r.value]));
  const size = (c: string) => count.get(`${c}|0`) ?? null;
  // Missing cells stay null (blank), never 0: a future month hasn't happened yet.
  const retention = (c: string, p: number) => {
    const v = count.get(`${c}|${p}`);
    const s = size(c);
    return v === undefined || v === null || !s ? null : v / s;
  };
  // The colour scale runs to the highest later-month value: month 0 is always 100% and would
  // otherwise squeeze the interesting range (20–45%) into the middle shades.
  const later = cohorts.flatMap((c) => periods.filter((p) => p > 0).map((p) => retention(c, p))).filter((v): v is number => v !== null);
  const scaleMax = Math.max(...later, 0) || 1;
  return { cohorts, periods, size, retention, scaleMax };
}

export default function CohortHeatmap({
  rows,
  label = 'Retention',
  locale = 'en-US',
  periodLabel = 'Months since first order',
  minCohort = 30,
  maxCohorts = 12,
  emptyMessage = 'No data for this period',
  negativeMessage = 'Cohort counts can’t be negative',
}: CohortHeatmapProps) {
  const pct = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
  const people = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
  const message = !rows.length ? emptyMessage : rows.some((r) => (r.value ?? 0) < 0) ? negativeMessage : null;
  const { cohorts, periods, size, retention, scaleMax } = prepare(rows, maxCohorts);

  return (
    <figure style={{ margin: 0, fontFamily: 'var(--wc-font)', color: 'var(--wc-ink-primary)', fontSize: 12, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 160 }}>
      <figcaption title={label} style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
        {short(label, 40)}
      </figcaption>
      {message ? (
        <p style={{ flex: 1, display: 'grid', placeItems: 'center', margin: 0, color: 'var(--wc-ink-secondary)' }}>{message}</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 2, width: '100%' }}>
            <thead>
              <tr>
                <th scope="col" style={{ textAlign: 'left', fontWeight: 500, color: 'var(--wc-ink-secondary)' }}>Cohort</th>
                {periods.map((p) => (
                  <th key={p} scope="col" style={{ fontWeight: 500, color: 'var(--wc-ink-secondary)', textAlign: 'center' }}>{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => {
                const s = size(c) ?? 0;
                const small = s < minCohort;
                return (
                  <tr key={c}>
                    <th scope="row" title={c} style={{ textAlign: 'left', fontWeight: 400, whiteSpace: 'nowrap', paddingRight: 6 }}>
                      {short(c, MAX_COHORT)}{' '}
                      {/* Small cohorts are named, because their percentages are noise. */}
                      <span style={{ color: 'var(--wc-ink-secondary)', fontSize: 11 }}>{small ? `n=${s}` : people.format(s)}</span>
                    </th>
                    {periods.map((p) => {
                      const v = retention(c, p);
                      if (v === null) return <td key={p} aria-label="Not yet" />;
                      const step = Math.min(STEPS, Math.round(Math.min(1, v / scaleMax) * (STEPS - 1)) + 1);
                      return (
                        <td
                          key={p}
                          title={`${c} · ${periodLabel.toLowerCase()} ${p}: ${pct.format(v)} of ${people.format(s)} people`}
                          style={{
                            background: `var(--wc-seq-${step})`,
                            // Dark cells get light text and vice versa; the ramp flips in dark mode, and so does this.
                            color: step > STEPS / 2 ? 'var(--wc-surface)' : 'var(--wc-ink-primary)',
                            opacity: small ? 0.45 : 1,
                            textAlign: 'center',
                            padding: '5px 2px',
                            borderRadius: 3,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {pct.format(v)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ margin: '4px 0 0', color: 'var(--wc-ink-secondary)', fontSize: 11, textAlign: 'center' }}>{periodLabel}</p>
        </div>
      )}
    </figure>
  );
}
