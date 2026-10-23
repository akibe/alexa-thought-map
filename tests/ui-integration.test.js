import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer, request } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ThoughtStore } from '../src/storage.js';
import { createLayout } from '../src/layout.js';
import { UI_URI, UI_MIME } from '../web/host-contract.js';

const root = new URL('..', import.meta.url);
const fixture = JSON.parse(readFileSync(new URL('../demo/section8-map.en.json', import.meta.url), 'utf8'));

async function start(t, env = {}, demo = false) {
  const bootstrap = `
    import assert from 'node:assert/strict';
    import { RootAnalysis } from './src/analysis.js';
    const showMap = RootAnalysis.prototype.showMap;
    RootAnalysis.prototype.showMap = function(args) {
      assert.equal(this.provider, null, 'test/demo must never construct a model provider');
      return showMap.call(this, args);
    };
    ${demo ? "process.argv.push('--demo');" : ''}
    await import('./src/server.js');
  `;
  const child = spawn(process.execPath, ['--input-type=module', '-e', bootstrap], {
    cwd: root, env: { ...process.env, BEDROCK_ENABLED: demo ? '1' : '0', PORT: '0', SANDBOX_PORT: '0', ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '', errors = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { errors += chunk; });
  const exited = once(child, 'exit');
  const stop = async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    const [code, signal] = await exited;
    assert.equal(code, 0, `Shutdown failed (${signal}): ${errors}`);
  };
  t.after(stop);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(Error(`Startup timed out: ${errors}`)); }, 5000);
    child.once('exit', () => { clearTimeout(timer); reject(Error(`Startup failed: ${errors}`)); });
    child.stdout.on('data', () => {
      if (/Simulator: .*; sandbox: http:\/\/127\.0\.0\.1:\d+/.test(output) && (!demo || /isolated database: .+\n/.test(output))) {
        clearTimeout(timer); resolve();
      }
    });
  });
  const host = output.match(/Simulator: (http:\/\/127\.0\.0\.1:\d+)/)[1];
  const sandbox = output.match(/sandbox: (http:\/\/127\.0\.0\.1:\d+)/)[1];
  return { host, sandbox, stop, database: output.match(/isolated database: (.+)/)?.[1] };
}

async function connect(t, host) {
  const client = new Client({ name: 'UI integration test', version: '1' }, {
    capabilities: { extensions: { 'io.modelcontextprotocol/ui': { mimeTypes: [UI_MIME] } } }
  });
  await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', host)));
  t.after(() => client.close());
  return client;
}

function temporary(t) {
  const path = mkdtempSync(join(tmpdir(), 'thought-map-ui-test-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}

function raw(origin, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request(new URL(origin), { path, headers }, res => {
      res.resume(); res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject); req.end();
  });
}

test('real MCP Apps metadata, resource, layout and versioned focus; synthetic demo is isolated and repeatable', { timeout: 15000 }, async t => {
  const directory = temporary(t);
  const livePath = join(directory, 'existing-live.sqlite');
  const live = new ThoughtStore(livePath);
  live.capture('Do not replace this live thought.'); live.close();
  const liveBytes = readFileSync(livePath);
  const server = await start(t, { DB_PATH: livePath }, true);
  assert.notEqual(server.database, livePath);
  assert(existsSync(server.database));
  const client = await connect(t, server.host);
  assert.deepEqual(await (await fetch(`${server.host}/ui-config`)).json(), { sandboxOrigin: server.sandbox, demo: true });
  const { tools } = await client.listTools();
  const mapTool = tools.find(tool => tool.name === 'show_map');
  assert.deepEqual(mapTool._meta.ui, { resourceUri: UI_URI, visibility: ['model', 'app'] });
  assert.equal(mapTool._meta['ui/resourceUri'], UI_URI);
  assert.deepEqual(tools.find(tool => tool.name === 'focus_root')._meta.ui.visibility, ['app']);
  const { resources } = await client.listResources();
  assert.equal(resources.length, 1);
  assert.equal(resources[0].uri, UI_URI);
  assert.equal(resources[0].mimeType, UI_MIME);
  const { contents } = await client.readResource({ uri: UI_URI });
  assert.equal(contents.length, 1);
  assert.equal(contents[0].uri, UI_URI);
  assert.equal(contents[0].mimeType, UI_MIME);
  assert.deepEqual(contents[0]._meta, resources[0]._meta);
  assert.deepEqual(contents[0]._meta.ui.csp, { connectDomains: [], resourceDomains: [], frameDomains: [] });
  assert.equal(contents[0].text, readFileSync(new URL('../web/dist/map.html', import.meta.url), 'utf8'));
  await assert.rejects(client.readResource({ uri: 'file:///etc/passwd' }));
  const ready = await client.callTool({ name: 'show_map', arguments: {} });
  assert.notEqual(ready.isError, true);
  const { description, ...expected } = fixture;
  assert.match(description, /Synthetic/);
  assert.deepEqual(ready.structuredContent, expected);
  assert.deepEqual(ready._meta.layout, createLayout(fixture.analysis));
  assert.deepEqual(JSON.parse(ready.content[0].text), expected);
  for (const root of fixture.analysis.roots) {
    const detail = await client.callTool({ name: 'focus_root', arguments: { version: 16, root_id: root.root_id } });
    assert.notEqual(detail.isError, true);
    assert.deepEqual(detail.structuredContent, {
      version: 16, root_id: root.root_id, root_sentence: root.sentence, reason: root.reason, next_action: root.next_action,
      fragments: fixture.analysis.fragments.filter(fragment => root.fragment_ids.includes(fragment.id))
    });
  }
  for (const args of [{ version: 15, root_id: 1 }, { version: 17, root_id: 1 }, { version: 16, root_id: 99 },
    { version: 0, root_id: 1 }, { version: 16, root_id: -1 }, { version: '16', root_id: 1 }, { version: 16, root_id: 1, extra: true }]) {
    const rejected = await client.callTool({ name: 'focus_root', arguments: args });
    assert.equal(rejected.isError, true);
    assert.equal(rejected.structuredContent, undefined);
  }
  assert.deepEqual(await client.callTool({ name: 'show_map', arguments: { retry: true } }), ready);
  const original = '  A new arbitrary thought, not in the fixed fixture.\n<script>text only</script>  ';
  assert.deepEqual((await client.callTool({ name: 'capture_thought', arguments: { text: original } })).structuredContent, { received: true, pending_count: 1 });
  for (const args of [{}, { retry: true }]) {
    const pending = await client.callTool({ name: 'show_map', arguments: args });
    assert.deepEqual(pending.structuredContent, { status: 'pending', pending_count: 1, root_sentence: null, next_action: null });
    assert.equal(pending._meta, undefined);
  }
  assert.equal((await client.callTool({ name: 'focus_root', arguments: { version: 16, root_id: 1 } })).isError, true);
  const captured = new ThoughtStore(server.database);
  assert.equal(captured.snapshot().fragments.at(-1).text, original); captured.close();
  await client.close(); await server.stop();
  assert(!existsSync(server.database));
  const restarted = await start(t, { DB_PATH: livePath }, true);
  assert.notEqual(restarted.database, server.database);
  const second = await connect(t, restarted.host);
  assert.deepEqual(await second.callTool({ name: 'show_map', arguments: {} }), ready);
  assert.deepEqual(readFileSync(livePath), liveBytes);
});

test('strict HTTP allowlists, Host/Origin checks, offline HTML and sandbox policy; both listeners shut down', { timeout: 15000 }, async t => {
  const directory = temporary(t);
  const server = await start(t, { DB_PATH: join(directory, 'thoughts.sqlite') });
  const sandboxUrl = `${server.sandbox}/sandbox.html?hostOrigin=${encodeURIComponent(server.host)}`;
  assert.notEqual(server.host, server.sandbox);
  assert.deepEqual(await (await fetch(`${server.host}/ui-config`)).json(), { sandboxOrigin: server.sandbox, demo: false });
  const hostHtml = await fetch(`${server.host}/simulator`);
  assert.equal(hostHtml.status, 200);
  assert.match(hostHtml.headers.get('content-type'), /text\/html/);
  assert.equal(await hostHtml.text(), readFileSync(new URL('../web/dist/simulator.html', import.meta.url), 'utf8'));
  assert(hostHtml.headers.get('content-security-policy').includes(`frame-src ${server.sandbox}`));
  assert(hostHtml.headers.get('content-security-policy').includes("connect-src 'self'"));
  const sandboxHtml = await fetch(sandboxUrl);
  assert.equal(sandboxHtml.status, 200);
  assert.equal(await sandboxHtml.text(), readFileSync(new URL('../web/dist/sandbox.html', import.meta.url), 'utf8'));
  const csp = sandboxHtml.headers.get('content-security-policy');
  for (const directive of ["connect-src 'none'", "frame-src 'none'", "object-src 'none'", `frame-ancestors ${server.host}`]) assert(csp.includes(directive));
  assert(!csp.includes('unsafe-eval'));
  for (const response of [hostHtml, sandboxHtml]) {
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.match(response.headers.get('permissions-policy'), /microphone=\(\)/);
  }
  for (const path of ['/src/server.js', '/.env', '/.git/config', '/node_modules/', '/web/map.js', '/assets/app.js', '/../package.json', '/%2e%2e/package.json', '/simulator/../.env', '/simulator?file=.env', '/simulator/', '//simulator']) {
    assert.equal(await raw(server.host, path), 404, path);
    assert.equal(await raw(server.sandbox, path), 404, path);
  }
  for (const path of ['/mcp', '/ui-config', '/sandbox.html', '/sandbox.html?hostOrigin=https://evil.example', `/sandbox.html?hostOrigin=${encodeURIComponent(server.host)}&extra=1`, `/sandbox.html?hostOrigin=${encodeURIComponent(server.host)}&hostOrigin=${encodeURIComponent(server.host)}`]) {
    assert.equal(await raw(server.sandbox, path), 404, path);
  }
  for (const origin of ['https://evil.example', 'null', 'not-an-origin']) {
    assert.equal((await fetch(`${server.host}/ui-config`, { headers: { Origin: origin } })).status, 403);
    assert.equal((await fetch(sandboxUrl, { headers: { Origin: origin } })).status, 403);
  }
  assert.equal((await fetch(`${server.host}/mcp`, { method: 'POST', headers: { Origin: server.sandbox } })).status, 403);
  for (const origin of [server.host, server.sandbox]) {
    assert.equal(await raw(origin, '/simulator', { Host: 'evil.example' }), 403);
    assert.equal(await raw(origin, '/simulator', { Host: '127.0.0.1:1' }), 403);
  }
  assert.equal((await fetch(`${server.host}/simulator`, { method: 'POST' })).status, 405);
  assert.equal((await fetch(sandboxUrl, { method: 'POST' })).status, 405);
  const malformed = await fetch(`${server.host}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{private malformed input' });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: 'Invalid request.' });
  const client = await connect(t, server.host);
  const rawText = '  Normal mode raw thought.\n';
  await client.callTool({ name: 'capture_thought', arguments: { text: rawText } });
  assert.equal((await client.callTool({ name: 'show_map', arguments: {} })).structuredContent.status, 'pending');
  await client.close(); await server.stop();
  await assert.rejects(fetch(`${server.host}/ui-config`));
  await assert.rejects(fetch(sandboxUrl));
  const restarted = await start(t, { DB_PATH: join(directory, 'thoughts.sqlite'), PORT: new URL(server.host).port, SANDBOX_PORT: new URL(server.sandbox).port });
  assert.equal(restarted.host, server.host); assert.equal(restarted.sandbox, server.sandbox);
});

test('sandbox port conflict exits cleanly and releases the already-bound API port', async t => {
  const directory = temporary(t);
  const blocker = createServer();
  blocker.listen(0, '127.0.0.1'); await once(blocker, 'listening');
  t.after(() => new Promise(resolve => blocker.close(resolve)));
  const reserve = createServer();
  reserve.listen(0, '127.0.0.1'); await once(reserve, 'listening');
  const port = reserve.address().port;
  await new Promise(resolve => reserve.close(resolve));
  const child = spawnSync(process.execPath, ['src/server.js'], { cwd: root, encoding: 'utf8', timeout: 5000,
    env: { ...process.env, BEDROCK_ENABLED: '0', PORT: String(port), SANDBOX_PORT: String(blocker.address().port), DB_PATH: join(directory, 'conflict.sqlite') } });
  assert.equal(child.status, 1, child.stderr);
  assert.equal(child.stderr, 'Unable to start sandbox server. Check SANDBOX_PORT.\n');
  assert.equal(child.stdout, '');
  reserve.listen(port, '127.0.0.1'); await once(reserve, 'listening');
  await new Promise(resolve => reserve.close(resolve));
});

test('English demo preserves the Japanese synthetic membership and clearly disclaims model output', () => {
  const original = JSON.parse(readFileSync(new URL('fixtures/section8-map.json', import.meta.url), 'utf8')).analysis;
  assert.equal(fixture.analysis.fragments.length, original.fragments.length);
  assert.deepEqual(fixture.analysis.roots.map(root => root.fragment_ids), original.roots.map(root => root.fragment_ids));
  assert.deepEqual(fixture.analysis.topics.map(topic => topic.fragment_ids), original.topics.map(topic => topic.fragment_ids));
  assert.deepEqual(fixture.analysis.unmatched_fragment_ids, original.unmatched_fragment_ids);
  assert.equal(fixture.analysis.source, 'demo:section8-english-handwritten');
  assert(fixture.analysis.fragments.every(fragment => /^[\x00-\x7F]+$/.test(fragment.text)));
  for (const stage of Object.values(fixture.analysis.provenance)) {
    assert.equal(stage.source, fixture.analysis.source); assert.equal(stage.usage, null);
  }
});
