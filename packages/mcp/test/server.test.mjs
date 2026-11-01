// End-to-end: start the built server over stdio and call every tool as an MCP client would.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const server = fileURLToPath(new URL('../dist/index.js', import.meta.url));
const client = new Client({ name: 'whichart-test', version: '0.0.0' });
const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  return { ...r, text: r.content[0].text, data: r.isError ? undefined : tryJson(r.content[0].text) };
};
const tryJson = (t) => {
  try {
    return JSON.parse(t);
  } catch {
    return undefined;
  }
};

const days = ['date,revenue', ...Array.from({ length: 60 }, (_, i) => `${new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10)},${1200 + ((i * 37) % 400)}`)].join('\n');

before(async () => {
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [server] }));
});
after(async () => client.close());

test('lists the four tools, all read-only', async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ['get_chart', 'list_charts', 'recommend_chart', 'review_chart']);
  for (const t of tools) assert.equal(t.annotations?.readOnlyHint, true, t.name);
  assert.match(client.getInstructions() ?? '', /review_chart/);
});

test('recommend_chart: a daily series ranks the line chart first', async () => {
  const r = await call('recommend_chart', { csv: days });
  assert.ok(!r.isError, r.text);
  assert.equal(r.data.ranked[0].id, 'line');
  assert.equal(r.data.ranked[0].encoding.time, 'date');
  assert.ok(r.data.ranked.length <= 5);
  assert.match(r.data.ranked[0].url, /^https:\/\/whichart\.github\.io\/charts\/line\/$/);
});

test('recommend_chart: a described schema works without the data', async () => {
  const r = await call('recommend_chart', {
    schema: { rows: 5, columns: [{ name: 'step', type: 'stage', distinct: 5 }, { name: 'users', type: 'number', min: 900, max: 12000 }] },
  });
  assert.ok(!r.isError, r.text);
  assert.equal(r.data.ranked[0].id, 'funnel');
});

test('recommend_chart: tile space favours a KPI tile', async () => {
  const r = await call('recommend_chart', { csv: 'revenue,previous\n48210,42890\n', space: 'tile' });
  assert.ok(r.data.ranked[0].id.startsWith('kpi-tile'), r.data.ranked[0].id);
});

test('recommend_chart: needs exactly one data input', async () => {
  const none = await call('recommend_chart', { goal: 'trend' });
  assert.equal(none.isError, true);
  assert.match(none.text, /exactly one/);
  const two = await call('recommend_chart', { csv: days, rows: [] });
  assert.equal(two.isError, true);
});

test('review_chart: a donut on a time series is flagged with better options', async () => {
  const r = await call('review_chart', { chart: 'donut', csv: days });
  assert.ok(['avoid', 'poor'].includes(r.data.verdict), r.data.verdict);
  assert.ok(r.data.better.some((b) => b.id === 'line'));
});

test('review_chart: the line chart on a daily series is good', async () => {
  const r = await call('review_chart', { chart: 'line', csv: days });
  assert.equal(r.data.verdict, 'good');
});

test('get_chart: markdown with edge cases and code for one library', async () => {
  const r = await call('get_chart', { id: 'line', library: 'echarts' });
  assert.ok(!r.isError, r.text);
  assert.match(r.text, /^# Line chart/m);
  assert.match(r.text, /## Edge cases/);
  assert.match(r.text, /```ts/);
  assert.doesNotMatch(r.text, /```tsx/, 'only ECharts code');
  assert.doesNotMatch(r.text, /```python/);
});

test('get_chart: aliases resolve, unknown and planned ids explain themselves', async () => {
  assert.match((await call('get_chart', { id: 'Pie chart' })).text, /^# Donut chart/m);
  const unknown = await call('get_chart', { id: 'radar-chart-xyz' });
  assert.equal(unknown.isError, true);
  assert.match(unknown.text, /list_charts/);
});

test('get_chart: a library the chart lacks is an error naming what it has', async () => {
  const r = await call('get_chart', { id: 'kpi-tile-delta', library: 'echarts' });
  assert.equal(r.isError, true);
  assert.match(r.text, /vanilla/);
});

test('list_charts: all, by goal and by industry', async () => {
  const all = (await call('list_charts', {})).data;
  assert.equal(all.charts.length, 15);
  assert.ok(all.coming > 0);
  const trend = (await call('list_charts', { goal: 'trend' })).data.charts;
  assert.ok(trend.every((c) => c.goals.includes('trend')));
  assert.ok(trend.some((c) => c.id === 'line'));
  const saas = (await call('list_charts', { industry: 'saas' })).data.charts;
  assert.ok(saas.length > 0 && saas.length <= all.charts.length);
});

test('server.json, package.json and the server agree on name and version', async () => {
  const { readFileSync } = await import('node:fs');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  const manifest = JSON.parse(readFileSync(new URL('../server.json', import.meta.url)));
  assert.equal(manifest.name, pkg.mcpName);
  assert.equal(manifest.version, pkg.version);
  assert.equal(manifest.packages[0].identifier, pkg.name);
  assert.equal(manifest.packages[0].version, pkg.version);
  assert.equal(client.getServerVersion()?.version, pkg.version);
});
