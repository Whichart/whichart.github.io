// One chart entry as Markdown, for agents: the site's /charts/<id>.md pages, llms-full.txt and the MCP server
// all use this, so they never disagree.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const GOAL_LABEL = {
  trend: 'Change over time',
  compare: 'Comparison',
  'part-of-whole': 'Parts of a whole',
  ranking: 'Ranking',
  flow: 'Flow & funnels',
  distribution: 'Distribution',
  relationship: 'Relationship',
  kpi: 'Single number',
};
const STATE_LABEL = {
  empty: 'Empty',
  singlePoint: 'Single point',
  allZeros: 'All zeros',
  outlier: 'Outlier',
  negative: 'Negative values',
  manySeries: 'Many series',
  longLabels: 'Long labels',
  largeNumbers: 'Large numbers',
  timeGaps: 'Gaps in time',
  noPrevious: 'No previous period',
};
const TARGET = {
  echarts: ['ECharts', 'ts'],
  recharts: ['Recharts', 'tsx'],
  vanilla: ['JavaScript (plain DOM)', 'ts'],
  react: ['React', 'tsx'],
  plotly: ['Plotly (Python)', 'python'],
};

/** Every ready chart: its chart.yaml, guide and code, read from charts/. */
export function loadCharts(root) {
  const dir = join(root, 'charts');
  return readdirSync(dir)
    .filter((id) => existsSync(join(dir, id, 'chart.yaml')))
    .map((id) => {
      const doc = parse(readFileSync(join(dir, id, 'chart.yaml'), 'utf8'));
      const guide = readFileSync(join(dir, id, 'guide.md'), 'utf8');
      const code = Object.fromEntries(Object.entries(doc.code).map(([t, f]) => [t, { file: f, source: readFileSync(join(dir, id, f), 'utf8') }]));
      return { id, doc, guide, code };
    })
    .filter((c) => c.doc.status === 'ready')
    .sort((a, b) => a.doc.name.localeCompare(b.doc.name));
}

/** Patterns: builders' questions, each answered by a chart. */
export function loadPatterns(root) {
  const dir = join(root, 'patterns');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => parse(readFileSync(join(dir, f), 'utf8')));
}

const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

/**
 * Markdown for one chart. `link(id)` turns a chart id into a URL; `targets` limits the code sections
 * (e.g. ['echarts'] when an agent asks for one library); `names` maps unwritten chart ids to names.
 */
export function chartMarkdown(chart, { link = (id) => `${id}`, targets, names = {}, written = new Set() } = {}) {
  const { doc, guide, code } = chart;
  const name = (id) => names[id] ?? id;
  const ref = (id) => (written.has(id) ? `[${name(id)}](${link(id)})` : `${name(id)} (coming soon)`);
  const body = guide.replace(/^# .*\n+/, '').replace(/\]\(\.\.\/([a-z0-9-]+)\/\)/g, (_, id) => `](${link(id)})`);
  const out = [
    `# ${doc.name}`,
    '',
    `> ${doc.summary}`,
    '',
    `Also called: ${doc.aliases.join(', ')}.`,
    `Categories: ${doc.goals.map((g) => GOAL_LABEL[g] ?? g).join(', ')}.`,
    '',
    '## Use it when',
    ...doc.guidance.useWhen.map((x) => `- ${x}`),
    '',
    '## Avoid it when',
    ...doc.guidance.avoidWhen.map((x) => `- ${x}`),
    '',
    '## Alternatives',
    ...doc.guidance.alternatives.map((a) => `- ${ref(a.id)}: ${a.when}`),
    '',
    '## Data it needs',
    ...doc.data.fields.map((f) => {
      const [lo, hi] = [f.count.min ?? 0, f.count.max];
      const n = lo === hi ? `${lo}` : hi === undefined ? `${lo} or more` : `${lo}–${hi}`;
      return `- ${n} ${f.role} column${n === '1' ? '' : 's'}${f.description ? `: ${f.description}` : ''}`;
    }),
    ...(doc.data.notes ? ['', doc.data.notes] : []),
    '',
    '## Edge cases (how it must behave)',
    '',
    '| State | Treatment | What it does |',
    '|---|---|---|',
    ...Object.entries(doc.states).map(([k, s]) => `| ${STATE_LABEL[k] ?? k} | ${s.treatment} | ${cell(s.description)}${s.message ? ` Message: "${cell(s.message)}"` : ''}${s.fallback ? ` Fallback: ${name(s.fallback)}` : ''} |`),
    '',
    ...(doc.guidance.pitfalls?.length ? ['## Pitfalls', ...doc.guidance.pitfalls.map((x) => `- ${x}`), ''] : []),
    '## Guide',
    '',
    body.trim().replace(/^## /gm, '### '),
    '',
    '## Code',
    '',
    'Public domain (CC0): copy, change and ship without attribution. Colours come from the Whichart theme (@whichart/tokens).',
    '',
  ];
  for (const [t, c] of Object.entries(code)) {
    if (targets && !targets.includes(t)) continue;
    const [label, lang] = TARGET[t] ?? [t, ''];
    out.push(`### ${label} (\`${c.file}\`)`, '', `\`\`\`${lang}`, c.source.trimEnd(), '```', '');
  }
  return out.join('\n');
}
