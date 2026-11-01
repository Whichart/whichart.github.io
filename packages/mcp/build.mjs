// Bundles the MCP server into one dependency-free file: engine, chart content and the MCP SDK included,
// so `npx @whichart/mcp` starts fast and works offline.
import { readFileSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { parse } from 'yaml';
import { loadCharts, loadPatterns } from '../../scripts/lib/chart-markdown.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const pkg = JSON.parse(readFileSync(resolve(here, 'package.json'), 'utf8'));

const content = {
  site: 'https://whichart.github.io/',
  charts: loadCharts(root),
  patterns: loadPatterns(root),
  names: parse(readFileSync(resolve(root, 'charts/planned.yaml'), 'utf8')).names ?? {},
};

const contentPlugin = {
  name: 'whichart-content',
  setup(b) {
    b.onResolve({ filter: /^whichart:content$/ }, (args) => ({ path: args.path, namespace: 'whichart' }));
    b.onLoad({ filter: /.*/, namespace: 'whichart' }, () => ({ contents: JSON.stringify(content), loader: 'json' }));
  },
};

const out = resolve(here, 'dist/index.js');
await build({
  entryPoints: [resolve(here, 'src/index.ts')],
  outfile: out,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  minify: true,
  legalComments: 'none',
  banner: { js: '#!/usr/bin/env node\nimport { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);' },
  define: { WHICHART_VERSION: JSON.stringify(pkg.version) },
  plugins: [contentPlugin],
  logLevel: 'warning',
});
chmodSync(out, 0o755);
console.log(`Built ${out} (${content.charts.length} charts, ${content.patterns.length} patterns)`);
