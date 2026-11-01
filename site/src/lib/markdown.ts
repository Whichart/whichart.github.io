// Markdown versions of chart pages for agents, from the same renderer the MCP server uses.
import { resolve } from 'node:path';
// @ts-expect-error: plain ES module shared with the MCP build
import { chartMarkdown, loadCharts } from '../../../scripts/lib/chart-markdown.mjs';
import { planned } from './content';
import { url } from './url';

const root = resolve(process.cwd(), '..');

export function chartMarkdowns(site: URL): { id: string; markdown: string }[] {
  const charts = loadCharts(root);
  const written = new Set<string>(charts.map((c: { id: string }) => c.id));
  const link = (id: string) => new URL(url(`charts/${id}.md`), site).href;
  return charts.map((c: { id: string }) => ({ id: c.id, markdown: chartMarkdown(c, { link, names: planned().names, written }) }));
}
