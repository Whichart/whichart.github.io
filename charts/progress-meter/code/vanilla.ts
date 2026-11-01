// Progress meter: a value against a target, with an optional pace marker. Plain DOM, no chart library.
// Usage: renderProgressMeter(el, [{ value: 35000, target: 50000, elapsed: 0.6 }], { label: 'Monthly revenue', currency: 'USD' });
// `elapsed` is how much of the period has passed (0–1); leave it out to hide pace.
// Colours are CSS variables from @whichart/tokens/whichart.css. Public domain (CC0).

export interface MeterRow {
  value: number | null;
  target?: number | null;
  elapsed?: number | null;
}

export interface MeterOptions {
  label?: string;
  locale?: string;
  currency?: string;
  emptyMessage?: string;
  noTargetMessage?: string;
}

export interface MeterState {
  /** Bar fill, 0–1. */
  fill: number;
  /** Pace marker position, 0–1, or null. */
  pace: number | null;
  /** False when there's no target: an empty track would read as 0%. */
  track: boolean;
  value: string;
  of: string;
  status: { text: string; tone: 'good' | 'bad' | 'neutral'; arrow: string } | null;
  spoken: string;
}

const COMPACT_FROM = 100_000;

function formatters(locale: string, currency?: string) {
  const style = currency ? { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const } : {};
  const whole = new Intl.NumberFormat(locale, { ...style, maximumFractionDigits: 0 });
  const compact = new Intl.NumberFormat(locale, { ...style, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const pct = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
  return { display: (v: number) => (Math.abs(v) >= COMPACT_FROM ? compact.format(v) : whole.format(v)), full: (v: number) => whole.format(v), pct: (v: number) => pct.format(v) };
}

/** Everything the meter shows, decided in one place so every renderer agrees. */
export function meterState(row: MeterRow, options: MeterOptions = {}): MeterState | null {
  const { label = 'Progress', locale = 'en-US', currency, noTargetMessage = 'No target set' } = options;
  if (row.value === null || row.value === undefined) return null;
  const { display, full, pct } = formatters(locale, currency);
  const value = row.value;
  const target = row.target ?? null;
  if (target === null || target <= 0) {
    return { fill: 0, pace: null, track: false, value: display(value), of: noTargetMessage, status: null, spoken: `${label} ${full(value)}, ${noTargetMessage.toLowerCase()}` };
  }
  const ratio = value / target;
  const elapsed = row.elapsed ?? null;
  // Pace only matters until the target is reached.
  const pace = elapsed !== null && elapsed > 0 && elapsed < 1 && ratio < 1 ? elapsed : null;
  let status: MeterState['status'] = null;
  if (ratio >= 1) {
    status = { text: ratio > 1 ? `${pct(ratio)} of target` : 'Target met', tone: 'good', arrow: '▲' };
  } else if (elapsed !== null && elapsed >= 1) {
    status = { text: `Missed by ${display(target - value)}`, tone: 'bad', arrow: '▼' };
  } else if (pace !== null) {
    const expected = target * pace;
    status =
      value >= expected
        ? { text: `Ahead of pace · ${display(expected)} expected`, tone: 'good', arrow: '▲' }
        : { text: `Behind pace · ${display(expected)} expected`, tone: 'bad', arrow: '▼' };
  }
  return {
    // Over target fills the bar; below zero leaves it empty. The numbers tell the rest.
    fill: Math.max(0, Math.min(1, ratio)),
    pace,
    track: true,
    value: display(value),
    of: `of ${display(target)} · ${pct(ratio)}`,
    status,
    spoken: `${label} ${full(value)} of ${full(target)}, ${pct(ratio)}${status ? `, ${status.text}` : ''}`,
  };
}

const TONE = { good: 'var(--wc-delta-up)', bad: 'var(--wc-delta-down)', neutral: 'var(--wc-delta-neutral)' };

export default function renderProgressMeter(el: HTMLElement, rows: MeterRow[], options: MeterOptions = {}): void {
  const { label = 'Progress', emptyMessage = 'No data yet' } = options;
  const s = rows[0] ? meterState(rows[0], options) : null;
  const div = (style: Partial<CSSStyleDeclaration>, text?: string) => {
    const d = document.createElement('div');
    Object.assign(d.style, style);
    if (text !== undefined) d.textContent = text;
    return d;
  };

  const tile = div({ fontFamily: 'var(--wc-font)', background: 'var(--wc-surface)', border: '1px solid var(--wc-border)', borderRadius: '12px', padding: '16px', display: 'grid', gap: '6px', minWidth: '0' });
  tile.setAttribute('role', 'group');
  tile.setAttribute('aria-label', s ? s.spoken : `${label}: ${emptyMessage}`);
  const name = div({ color: 'var(--wc-ink-secondary)', fontSize: '14px', display: '-webkit-box', webkitLineClamp: '2', webkitBoxOrient: 'vertical', overflow: 'hidden' }, label);
  name.title = label;

  const head = div({ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' });
  head.append(
    div({ color: 'var(--wc-ink-primary)', fontSize: '28px', fontWeight: '600', lineHeight: '1.2' }, s ? s.value : '—'),
    div({ color: 'var(--wc-ink-secondary)', fontSize: '14px' }, s ? s.of : emptyMessage),
  );

  // Track and fill in one hue: a light step of the ramp for the track, the series colour for progress.
  const track = div({ position: 'relative', height: '10px', borderRadius: '5px', background: 'var(--wc-seq-2)', overflow: 'visible' });
  track.setAttribute('aria-hidden', 'true');
  if (s) {
    track.append(div({ position: 'absolute', inset: '0 auto 0 0', width: `${s.fill * 100}%`, borderRadius: '5px', background: 'var(--wc-series-1)' }));
    if (s.pace !== null) track.append(div({ position: 'absolute', top: '-4px', bottom: '-4px', left: `calc(${s.pace * 100}% - 1px)`, width: '2px', background: 'var(--wc-ink-primary)' }));
  }

  tile.append(name, head);
  if (!s || s.track) tile.append(track);
  if (s?.status) tile.append(div({ color: TONE[s.status.tone], fontSize: '14px' }, `${s.status.arrow} ${s.status.text}`));
  el.replaceChildren(tile);
}
