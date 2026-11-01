import type { APIRoute } from 'astro';
import { charts } from '../../lib/content';
import { chartMarkdowns } from '../../lib/markdown';

export function getStaticPaths() {
  return charts().map((c) => ({ params: { id: c.id } }));
}

export const GET: APIRoute = ({ params, site }) => {
  const md = chartMarkdowns(site!).find((m) => m.id === params.id)!.markdown;
  return new Response(md, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
