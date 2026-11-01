import type { APIRoute } from 'astro';
import { patterns, chartName } from '../lib/content';
import { chartMarkdowns } from '../lib/markdown';
import { url } from '../lib/url';

// Everything an agent needs in one file: the rules, the patterns, and every chart with its code.
export const GET: APIRoute = ({ site }) => {
  const abs = (p: string) => new URL(url(p), site).href;
  const ready = patterns().filter((p) => p.ready);
  const body = [
    '# Whichart: every chart, in full',
    '',
    '> Modern data visualization examples, tested on real data. For each chart: when to use it, when not to, how it must behave on empty, zero, outlier, negative, long-label, large-number, gappy and new data, and ready code. Code and data are CC0.',
    '',
    '## Rules that apply everywhere',
    '- Never use a dual y-axis. Two measures on different scales become two charts, or both indexed to 100.',
    '- Assign series colours in a fixed order that follows the entity, never more than 8; beyond 5 series fold the rest into "Other".',
    '- A percentage change from zero or across a sign change is meaningless: show the absolute change. Show "New" when there is no previous period.',
    '- Break lines at missing dates instead of joining across them. Leave periods that have not happened blank, never 0.',
    '- Bars and areas start at zero. Label values directly where possible; colour is never the only cue.',
    '',
    '## Patterns (builders\' questions → chart)',
    ...ready.map((p) => `- ${p.question} → ${chartName(p.recommended)} (${abs(`charts/${p.recommended}.md`)}). ${p.why}`),
    '',
    `Machine-readable fit rules: ${abs('catalog.json')}`,
    '',
    ...chartMarkdowns(site!).flatMap((m) => ['---', '', m.markdown]),
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
