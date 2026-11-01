// Whichart MCP server: the same rules as whichart.github.io, as tools an agent calls before it draws a chart.
// stdio transport; everything (engine, charts, guides, code) is bundled, so it needs no network.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import content from 'whichart:content';
import { recommend, review, type DataSchema, type RecommendInput } from '../../engine/src/index.ts';
// @ts-expect-error: plain ES module shared with the site
import { chartMarkdown } from '../../../scripts/lib/chart-markdown.mjs';

const GOALS = ['trend', 'compare', 'part-of-whole', 'ranking', 'flow', 'distribution', 'relationship', 'kpi'] as const;
const LIBRARIES = ['echarts', 'recharts', 'plotly', 'vanilla', 'react'] as const;
const INDUSTRIES = ['ecommerce', 'saas', 'marketing', 'finance', 'operations', 'research'] as const;
const MAX_CSV = 2_000_000;

const written = new Set(content.charts.map((c) => c.id));
const pageUrl = (id: string) => `${content.site}charts/${id}/`;
const mdUrl = (id: string) => `${content.site}charts/${id}.md`;

// ---- Shared input: the data, sent or described ----

const column = z.object({
  name: z.string(),
  type: z
    .enum(['date', 'number', 'text', 'stage', 'period', 'id', 'place'])
    .describe('date; number (a measure); text (a category); stage (ordered steps, e.g. funnel); period (0, 1, 2… since a start, e.g. cohort month); id; place'),
  distinct: z.number().int().optional().describe('Number of distinct values'),
  min: z.number().optional(),
  max: z.number().optional(),
  previous: z.boolean().optional().describe('True when this number is the previous-period value of another column'),
  maxLength: z.number().int().optional().describe('Longest label, in characters'),
  interval: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year', 'irregular']).optional(),
  gaps: z.boolean().optional().describe('True when some dates are missing'),
});

const dataInput = {
  csv: z.string().max(MAX_CSV).optional().describe('The data as CSV with a header row. Comma, semicolon or tab separated.'),
  rows: z.array(z.record(z.string(), z.unknown())).optional().describe('The data as an array of row objects.'),
  schema: z
    .object({ rows: z.number().int().min(0), columns: z.array(column).min(1) })
    .optional()
    .describe('Describe the data instead of sending it: row count and columns. Use when the data is large or private.'),
  goal: z.enum(GOALS).optional().describe('What the chart should show. Leave out to let Whichart infer it from the data.'),
  space: z.enum(['tile', 'card', 'half', 'full']).optional().describe('Space on the page: tile (a number-sized box), card, half width or full width.'),
  audience: z.enum(['glance', 'explore']).optional().describe('glance: read in seconds; explore: people will dig in.'),
  medium: z.enum(['dashboard', 'report', 'slide']).optional(),
};
type DataArgs = {
  csv?: string;
  rows?: Record<string, unknown>[];
  schema?: DataSchema;
  goal?: (typeof GOALS)[number];
  space?: 'tile' | 'card' | 'half' | 'full';
  audience?: 'glance' | 'explore';
  medium?: 'dashboard' | 'report' | 'slide';
};

function toInput(a: DataArgs): RecommendInput {
  const given = [a.csv !== undefined, a.rows !== undefined, a.schema !== undefined].filter(Boolean).length;
  if (given !== 1) throw new Error('Send exactly one of csv, rows or schema.');
  const context = Object.fromEntries(Object.entries({ space: a.space, audience: a.audience, medium: a.medium }).filter(([, v]) => v));
  return { csv: a.csv, rows: a.rows, schema: a.schema, goal: a.goal, context };
}

const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] });
const fail = (e: unknown) => ({ isError: true, content: [{ type: 'text' as const, text: e instanceof Error ? e.message : String(e) }] });

// ---- Server ----

function createServer() {
  const server = new McpServer(
    { name: 'whichart', title: 'Whichart', version: WHICHART_VERSION, websiteUrl: content.site },
    {
      instructions: [
        'Whichart is a chart reference with tested rules and code. Use it before you draw a chart for someone.',
        '1. recommend_chart with the data (or a schema describing it) to pick a chart; give the user its reasons.',
        '2. get_chart for the chosen chart: follow its edge-case table (empty, one point, zeros, outliers, negatives, many series, long labels, large numbers, gaps, no previous period) and start from its code.',
        '3. review_chart before you show a chart you chose yourself; if the verdict is poor or avoid, switch to a better option it lists.',
      ].join('\n'),
    },
  );

  server.registerTool(
    'recommend_chart',
    {
      title: 'Recommend a chart',
      description:
        'Rank charts for a dataset, with reasons and warnings, plus the charts to avoid and why. Send the data as csv or rows, or describe it with schema. Each pick includes an encoding: which column goes on which channel.',
      inputSchema: { ...dataInput, limit: z.number().int().min(1).max(20).optional().describe('How many ranked charts to return (default 5).') },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      try {
        const rec = recommend(toInput(args as DataArgs));
        return json({
          data: rec.profile.summary,
          columns: rec.profile.columns.map((c) => ({ name: c.name, role: c.role, ...(c.comparison ? { comparison: true } : {}), because: c.because })),
          goal: rec.goal ?? `inferred: ${rec.profile.goals.join(', ')}`,
          ranked: rec.ranked.slice(0, args.limit ?? 5).map((r) => ({ ...r, url: pageUrl(r.id) })),
          avoid: rec.avoid.map((a) => ({ id: a.id, name: a.name, reasons: a.reasons })),
          notes: rec.notes,
          next: rec.ranked[0] ? `Call get_chart with id "${rec.ranked[0].id}" for its edge cases and code.` : 'No written chart fits this data yet.',
        });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'review_chart',
    {
      title: 'Review a chart choice',
      description:
        'Check whether a chart suits a dataset before showing it. Returns a verdict (good, ok, poor, avoid or unknown), the problems with fixes, and better charts when there are any.',
      inputSchema: { chart: z.string().describe('Chart id, e.g. "line", "donut", "kpi-tile-delta". See list_charts.'), ...dataInput },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ chart, ...args }) => {
      try {
        const r = review(chart, toInput(args as DataArgs));
        return json({ ...r, better: r.better.map((b) => ({ ...b, url: pageUrl(b.id) })) });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    'get_chart',
    {
      title: 'Get a chart',
      description:
        'Everything about one chart as Markdown: when to use it and not, the data it needs, how it must behave on edge cases, pitfalls, the guide, and tested code (ECharts, Recharts, Plotly for Python, or plain JavaScript). Code is public domain (CC0).',
      inputSchema: {
        id: z.string().describe('Chart id, e.g. "line". See list_charts.'),
        library: z.enum(LIBRARIES).optional().describe('Only include code for this library. Leave out for every library the chart has.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id, library }) => {
      const chart = content.charts.find((c) => c.id === id || c.doc.aliases.some((a) => a.toLowerCase() === id.toLowerCase()));
      if (!chart) {
        const soon = content.names[id];
        return fail(
          soon
            ? `"${soon}" is planned but not written yet. Call list_charts for the charts available now.`
            : `No chart "${id}". Call list_charts for the ids.`,
        );
      }
      if (library && !chart.code[library]) {
        return fail(`${chart.doc.name} has no ${library} code. It has: ${Object.keys(chart.code).join(', ')}.`);
      }
      const markdown = chartMarkdown(chart, { link: mdUrl, targets: library ? [library] : undefined, names: content.names, written });
      return { content: [{ type: 'text' as const, text: `${markdown}\nPage: ${pageUrl(chart.id)}\n` }] };
    },
  );

  server.registerTool(
    'list_charts',
    {
      title: 'List charts',
      description:
        'The charts Whichart has written, with what each is for. Filter by goal or industry. Also lists the builder questions (patterns) each chart answers.',
      inputSchema: {
        goal: z.enum(GOALS).optional(),
        industry: z.enum(INDUSTRIES).optional().describe('Only charts recommended by patterns for this industry.'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ goal, industry }) => {
      const patterns = content.patterns.filter((p) => !industry || p.industries.includes(industry));
      const inIndustry = new Set(patterns.flatMap((p) => [p.recommended, ...(p.alternatives ?? []).map((a) => a.id)]));
      const charts = content.charts
        .filter((c) => (!goal || c.doc.goals.includes(goal)) && (!industry || inIndustry.has(c.id)))
        .map((c) => ({
          id: c.id,
          name: c.doc.name,
          summary: c.doc.summary,
          goals: c.doc.goals,
          aliases: c.doc.aliases,
          libraries: Object.keys(c.code),
          answers: patterns.filter((p) => p.recommended === c.id).map((p) => p.question),
          url: pageUrl(c.id),
        }));
      return json({ charts, coming: Object.keys(content.names).filter((id) => !written.has(id)).length });
    },
  );

  return server;
}

await createServer().connect(new StdioServerTransport());
