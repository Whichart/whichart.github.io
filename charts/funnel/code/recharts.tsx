// Funnel chart: how many people reach each step, and where they drop off. Recharts (React).
// Drawn as left-aligned bars (lengths compare accurately; trapezoids exaggerate), stages in your order.
// Usage: <FunnelChart rows={rows} label="Checkout funnel" />
// Colours are CSS variables from @whichart/tokens/whichart.css. Public domain (CC0).
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface FunnelRow {
  stage: string;
  value: number | null;
}

export interface FunnelChartProps {
  rows: FunnelRow[];
  label?: string;
  locale?: string;
  emptyMessage?: string;
  negativeMessage?: string;
  /** Total height in px; by default the chart fills its container. */
  height?: number;
}

const MAX_TITLE = 40;
const MAX_STAGE = 20;
const COMPACT_FROM = 100_000;
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

function steps(rows: FunnelRow[], locale: string) {
  const pct = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
  const list = rows.filter((r) => r.stage).map((r) => ({ stage: r.stage, value: r.value ?? 0 }));
  const first = list[0]?.value ?? 0;
  const rates = list.map((s, i) => (i === 0 || list[i - 1].value <= 0 ? null : s.value / list[i - 1].value));
  const worst = Math.min(...rates.filter((r): r is number => r !== null && r <= 1));
  return list.map((s, i) => ({
    ...s,
    ofStart: first > 0 ? pct.format(s.value / first) : '—',
    fromPrevious: rates[i] === null ? null : `${pct.format(rates[i] as number)} continue`,
    biggestDrop: rates[i] !== null && rates[i] === worst && list.length > 2 && (rates[i] as number) < 1,
    increase: rates[i] !== null && (rates[i] as number) > 1,
  }));
}

export default function FunnelChart({ rows, label = 'Funnel', locale = 'en-US', emptyMessage = 'No data for this period', negativeMessage = 'Funnel stages can’t be negative', height }: FunnelChartProps) {
  const whole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
  const count = (v: number) => (Math.abs(v) >= COMPACT_FROM ? compact.format(v) : whole.format(v));
  const list = steps(rows, locale);
  const message = !list.length ? emptyMessage : list.some((s) => s.value < 0) ? negativeMessage : null;
  const allZero = list.length > 0 && list.every((s) => s.value === 0);
  const data = list.map((s) => ({ ...s, text: `${count(s.value)} · ${s.ofStart}` }));

  // Stage name, then the step conversion: the drop-off is the point of a funnel.
  const Tick = ({ x, y, payload, index }: { x?: number; y?: number; payload?: { value: string }; index?: number }) => {
    const s = list[index ?? 0];
    return (
      <g transform={`translate(${x},${y})`}>
        <title>{payload?.value}</title>
        <text textAnchor="end" x={-6} dy={s?.fromPrevious ? -2 : 4} fontSize={12} fill="var(--wc-ink-primary)">
          {short(payload?.value ?? '', MAX_STAGE)}
        </text>
        {s?.fromPrevious && (
          <text textAnchor="end" x={-6} dy={12} fontSize={11} fill="var(--wc-ink-secondary)">
            {`${s.increase ? '▲ ' : ''}${s.fromPrevious}${s.biggestDrop ? ' · biggest drop' : ''}`}
          </text>
        )}
      </g>
    );
  };

  return (
    <figure style={{ margin: 0, fontFamily: 'var(--wc-font)', height: height ?? '100%', minHeight: 180, display: 'flex', flexDirection: 'column' }}>
      <figcaption title={label} style={{ color: 'var(--wc-ink-primary)', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
        {short(label, MAX_TITLE)}
      </figcaption>
      {message ? (
        <p style={{ flex: 1, display: 'grid', placeItems: 'center', margin: 0, color: 'var(--wc-ink-secondary)' }}>{message}</p>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 96, bottom: 0, left: 0 }}>
              <XAxis type="number" hide domain={allZero ? [0, 1] : [0, 'auto']} />
              <YAxis type="category" dataKey="stage" width={190} interval={0} axisLine={false} tickLine={false} tick={<Tick />} />
              <Tooltip
                cursor={{ fill: 'var(--wc-grid)', fillOpacity: 0.5 }}
                content={({ active, payload }) => {
                  const s = active && payload?.[0]?.payload;
                  if (!s) return null;
                  return (
                    <div style={{ background: 'var(--wc-surface)', border: '1px solid var(--wc-axis)', color: 'var(--wc-ink-primary)', padding: '6px 10px', fontSize: 12 }}>
                      <div>{`${s.stage}: ${whole.format(s.value)}`}</div>
                      <div>{`${s.ofStart} of ${list[0].stage}`}</div>
                      {s.fromPrevious && <div>{`${s.fromPrevious} from ${list[list.findIndex((x) => x.stage === s.stage) - 1].stage}`}</div>}
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" fill="var(--wc-series-1)" radius={[0, 4, 4, 0]} maxBarSize={30} minPointSize={2} isAnimationActive={false}>
                <LabelList dataKey="text" position="right" fill="var(--wc-ink-primary)" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
}
