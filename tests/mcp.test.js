import { ThoughtStore } from '../src/storage.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { request } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function startServer(dbPath, port = '0') {
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, BEDROCK_ENABLED: '0', PORT: port, DB_PATH: dbPath },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let errors = '';
  child.stderr.on('data', chunk => { errors += chunk; });
  const exited = once(child, 'exit');
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Server startup timed out: ${errors}`));
    }, 10000);
    child.once('exit', () => {
      clearTimeout(timer);
      reject(new Error(`Server exited before startup: ${errors}`));
    });
    child.stdout.on('data', chunk => {
      const match = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+\/mcp/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
  });
  return {
    url,
    stop: async () => {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
      const [code, signal] = await exited;
      assert.equal(code, 0, `Server shutdown failed (${signal}): ${errors}`);
    }
  };
}

async function connect(url) {
  const client = new Client({ name: 'thought-map-test', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  return client;
}

test('real MCP calls negotiate 2025-11-25, validate inputs/origins, and survive server restart', { timeout: 30000 }, async t => {
  const directory = mkdtempSync(join(tmpdir(), 'thought-map-mcp-'));
  const dbPath = join(directory, 'thoughts.sqlite');
  let server;
  let client;
  t.after(async () => {
    await client?.close();
    await server?.stop();
    rmSync(directory, { recursive: true, force: true });
  });
  server = await startServer(dbPath);
  await assert.rejects(
    startServer(join(directory, 'occupied-port.sqlite'), new URL(server.url).port),
    { message: 'Server exited before startup: Unable to start MCP server. Check PORT and DB_PATH.\n' }
  );

  const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  const initialize = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'protocol-check', version: '1' } } };
  const response = await fetch(server.url, { method: 'POST', headers, body: JSON.stringify(initialize) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).result.protocolVersion, '2025-11-25');

  for (const origin of ['https://evil.example', 'null', 'not-an-origin', 'http://localhost:6274/']) {
    const rejected = await fetch(server.url, { method: 'POST', headers: { ...headers, Origin: origin }, body: JSON.stringify(initialize) });
    assert.equal(rejected.status, 403, origin);
  }
  const allowed = await fetch(server.url, { method: 'POST', headers: { ...headers, Origin: 'http://localhost:6274' }, body: JSON.stringify(initialize) });
  assert.equal(allowed.status, 200);
  // Node fetch replaces Host; send the hostile header with the HTTP client.
  const badHostStatus = await new Promise((resolve, reject) => {
    const req = request(server.url, { method: 'POST', headers: { ...headers, Host: 'evil.example' } }, res => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.end(JSON.stringify(initialize));
  });
  assert.equal(badHostStatus, 403);
  const unsupported = await fetch(server.url, { method: 'POST', headers: { ...headers, 'MCP-Protocol-Version': '1900-01-01' }, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) });
  assert.equal(unsupported.status, 400);
  assert.equal((await fetch(server.url)).status, 405);

  client = await connect(server.url);
  const tools = await client.listTools();
  assert.deepEqual(tools.tools.map(tool => tool.name).sort(), ['capture_thought', 'focus_root', 'show_map']);
  const empty = await client.callTool({ name: 'show_map', arguments: {} });
  assert.deepEqual(empty.structuredContent, { status: 'empty', pending_count: 0, root_sentence: null, next_action: null });
  const original = '  本当は音楽の仕事をもっと増やしたい\nでも、迷う 🎵  ';
  const capture = await client.callTool({ name: 'capture_thought', arguments: { text: original } });
  assert.deepEqual(capture.structuredContent, { received: true, pending_count: 1 });
  assert.deepEqual(JSON.parse(capture.content[0].text), capture.structuredContent);
  for (const text of ['', ' \n\t ', 123, 'x'.repeat(20001)]) {
    assert.equal((await client.callTool({ name: 'capture_thought', arguments: { text } })).isError, true);
  }
  const pending = await client.callTool({ name: 'show_map', arguments: {} });
  assert.deepEqual(pending.structuredContent, { status: 'pending', pending_count: 1, root_sentence: null, next_action: null });
  await client.close();
  await server.stop();

  const db = new DatabaseSync(dbPath, { readOnly: true });
  const row = db.prepare('SELECT text, received_at FROM fragments').get();
  db.close();
  assert.equal(row.text, original);
  assert.equal(new Date(row.received_at).toISOString(), row.received_at);

  server = await startServer(dbPath);
  client = await connect(server.url);
  assert.deepEqual((await client.callTool({ name: 'show_map', arguments: {} })).structuredContent, pending.structuredContent);
  assert.deepEqual((await client.callTool({ name: 'capture_thought', arguments: { text: 'next day' } })).structuredContent, { received: true, pending_count: 2 });
  const stored = new ThoughtStore(dbPath);
  const snapshot = stored.snapshot();
  stored.startAnalysis(snapshot, 'test:local-fake');
  stored.finishAnalysis(snapshot.version, {
    conditions: snapshot.fragments.map(({ id }) => ({ fragment_id: id, condition: 'Tentative condition.' })),
    roots: [{ sentence: 'A tentative shared dependency.', fragment_ids: [1, 2], leverage: 2 }],
    unmatched_fragment_ids: [], usage: null
  });
  stored.close();
  const ready = await client.callTool({ name: 'show_map', arguments: {} });
  assert.notEqual(ready.isError, true);
  assert.equal(ready.structuredContent.status, 'ready');
  assert.equal(ready.structuredContent.analysis.source, 'test:local-fake');
  assert.equal(ready.structuredContent.analysis.fragments[0].text, original);
  assert.equal(ready.structuredContent.pending_count, 0);
  assert.deepEqual(JSON.parse(ready.content[0].text), ready.structuredContent);

});

test('real MCP returns enriched topics, attributed fragments and focus with explicit synthetic provenance', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'thought-map-mcp-enriched-'));
  const dbPath = join(directory, 'thoughts.sqlite');
  let server;
  let client;
  t.after(async () => {
    await client?.close();
    await server?.stop();
    rmSync(directory, { recursive: true, force: true });
  });
  const map = JSON.parse(readFileSync(new URL('./fixtures/section8-map.json', import.meta.url)));
  const store = new ThoughtStore(dbPath);
  map.analysis.fragments.forEach(({ text }) => store.capture(text));
  const snapshot = store.snapshot();
  store.startAnalysis(snapshot, map.analysis.source);
  store.finishAnalysis(snapshot.version, { ...map.analysis, fragments: map.analysis.fragments.map((fragment, index) => ({
    ...fragment, received_at: snapshot.fragments[index].received_at
  })) });
  store.close();
  server = await startServer(dbPath);
  client = await connect(server.url);
  const response = await client.callTool({ name: 'show_map', arguments: {} });
  assert.notEqual(response.isError, true);
  assert.equal(response.structuredContent.status, 'ready');
  assert.equal(response.structuredContent.root_sentence, map.root_sentence);
  assert.equal(response.structuredContent.next_action, map.next_action);
  assert.deepEqual(response.structuredContent.analysis.topics, map.analysis.topics);
  assert.equal(response.structuredContent.analysis.fragments[8].direction, 'want_to');
  assert.equal(response.structuredContent.analysis.fragments[0].received_at, snapshot.fragments[0].received_at);
  assert.deepEqual(response.structuredContent.analysis.provenance, map.analysis.provenance);
});
