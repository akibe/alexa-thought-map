import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { ThoughtStore } from '../src/storage.js';
import { RootAnalysis, validateResult } from '../src/analysis.js';
import { rootReasoningInstructions } from '../src/root-reasoning.js';
import { createBedrockProvider, bedrockModel } from '../src/bedrock.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/section8.json', import.meta.url)));
const resultFor = fragments => ({ conditions: fragments.map(({ id }) => ({ fragment_id: id, condition: 'Tentative resolution condition.' })), roots: [], unmatched_fragment_ids: fragments.map(({ id }) => id) });
function setup(t) {
  const directory = mkdtempSync(join(tmpdir(), 'thought-map-analysis-'));
  const path = join(directory, 'thoughts.sqlite');
  const store = new ThoughtStore(path);
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  return { store, path };
}

test('async snapshot isolation, capture remains immediate, actual skill used, no duplicate calls, durable results', async t => {
  const { store, path } = setup(t);
  let release;
  let calls = 0;
  const provider = { source: 'test:local-fake', infer: async input => {
    calls++;
    assert.equal(input.system, rootReasoningInstructions);
    await new Promise(resolve => { release = resolve; });
    return { result: resultFor(input.fragments) };
  } };
  const workflow = new RootAnalysis(store, provider);
  const raw = '  本当は音楽を続けたい\n 🎵  ';
  store.capture(raw);
  assert.equal(workflow.showMap().status, 'analyzing');
  assert.equal(calls, 0, 'inference starts after tool returns');
  await new Promise(resolve => setImmediate(resolve));
  workflow.showMap();
  assert.equal(calls, 1);
  assert.deepEqual(store.capture('next thought'), { received: true, pending_count: 2 });
  assert.equal(workflow.showMap().status, 'pending');
  release();
  await workflow.running;
  assert.equal(store.analysis(1).snapshot[0].text, raw);
  assert.equal(store.analysis(1).status, 'ready');
  assert.equal(workflow.showMap().status, 'analyzing');
  await new Promise(resolve => setImmediate(resolve));
  release();
  await workflow.running;
  const ready = workflow.showMap();
  assert.equal(ready.status, 'ready');
  assert.equal(ready.pending_count, 0);
  assert.equal(ready.analysis.version, 2);
  assert.equal(ready.analysis.source, 'test:local-fake');
  assert.equal(ready.analysis.fragments[0].text, raw);
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { ThoughtStore } from ${JSON.stringify(new URL('../src/storage.js', import.meta.url).href)};
    import { RootAnalysis } from ${JSON.stringify(new URL('../src/analysis.js', import.meta.url).href)};
    const store = new ThoughtStore(process.env.TEST_DB);
    console.log(JSON.stringify(new RootAnalysis(store).showMap())); store.close();
  `], { encoding: 'utf8', env: { ...process.env, TEST_DB: path } });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), ready);
});

test('provider failures and interrupted restarts retain thoughts and retry only on explicit request', async t => {
  const { store, path } = setup(t);
  store.capture('private original');
  let calls = 0;
  const provider = { source: 'test:failure', infer: async () => { calls++; throw new Error('secret error'); } };
  const workflow = new RootAnalysis(store, provider);
  workflow.showMap();
  await workflow.running;
  for (let i = 0; i < 4; i++) assert.equal(workflow.showMap().error, 'analysis_failed');
  assert.equal(calls, 1);
  assert.equal(store.pendingCount(), 1);
  assert.equal(store.analysis(1).error.includes('secret'), false);
  workflow.showMap({ retry: true });
  await workflow.running;
  assert.equal(calls, 2);
  workflow.showMap();
  assert.equal(calls, 2, 'failed explicit retry is not automatically retried');
  store.capture('second');
  store.startAnalysis(store.snapshot(), 'test:interrupted');
  const restarted = new ThoughtStore(path);
  assert.equal(restarted.analysis(2).status, 'analyzing', 'auxiliary open must not recover live work');
  restarted.recoverInterrupted();
  const recovered = new RootAnalysis(restarted, provider);
  assert.equal(recovered.showMap().error, 'interrupted');
  assert.equal(recovered.running, null);
  assert.equal(calls, 2);
  assert.equal(restarted.snapshot().fragments.length, 2);
  recovered.provider = { source: 'test:recovered', infer: async ({ fragments }) => { calls++; return { result: resultFor(fragments) }; } };
  assert.equal(recovered.showMap({ retry: true }).status, 'analyzing');
  recovered.showMap({ retry: true });
  await recovered.running;
  assert.equal(calls, 3, 'one explicit retry, not two concurrent attempts');
  assert.equal(recovered.showMap().status, 'ready');
  assert.equal(recovered.showMap({ retry: true }).status, 'ready');
  assert.equal(calls, 3, 'ready does not incur a retry');
  restarted.close();
});

test('section 8 fixture supports cross-topic regrouping; fake fixture is not live quality evidence', async t => {
  const { store } = setup(t);
  fixture.forEach(({ text }) => store.capture(text));
  const fake = resultFor(store.snapshot().fragments);
  fake.roots = [
    { sentence: '自分を一言で言えると決めていない', fragment_ids: [1, 2, 4, 5, 9, 11, 14, 15], leverage: 8 },
    { sentence: '断れずに余白がない', fragment_ids: [6, 7, 10, 12, 13], leverage: 5 }
  ];
  fake.unmatched_fragment_ids = [3, 8, 16];
  const workflow = new RootAnalysis(store, { source: 'test:section8-handwritten', infer: async () => ({ result: fake }) });
  workflow.showMap(); await workflow.running;
  const ready = workflow.showMap();
  assert.equal(ready.analysis.roots[0].fragment_ids.includes(5), true);
  assert.notEqual(fixture[1].topic, fixture[4].topic);
  assert.ok(ready.analysis.roots.every(root => new Set(root.fragment_ids.map(id => fixture[id - 1].topic)).size > 1));
  assert.deepEqual(ready.analysis.unmatched_fragment_ids, [3, 8, 16]);
  assert.equal(ready.root_sentence, null);
  assert.equal(ready.next_action, null);
});

test('rejects unknown, missing, duplicate IDs, invalid leverage and shape', () => {
  const fragments = [{ id: 1 }, { id: 2 }];
  for (const mutate of [
    r => r.conditions.pop(), r => { r.conditions[1].fragment_id = 1; },
    r => { r.unmatched_fragment_ids = [1, 3]; }, r => { r.unmatched_fragment_ids = [1, 1, 2]; },
    r => { r.roots = [{ sentence: 'root', fragment_ids: [1], leverage: 2 }]; r.unmatched_fragment_ids = [2]; },
    r => { r.focus = 'not task 3'; }, r => { r.conditions[0].condition = ''; },
    r => { r.roots = Array(6).fill({ sentence: 'root', fragment_ids: [1], leverage: 1 }); }
  ]) {
    const value = resultFor(fragments); mutate(value);
    assert.throws(() => validateResult(value, fragments));
  }
});

test('Bedrock request uses actual system, bounded tokens, abort signal, validates completion and JSON without network', async () => {
  const fragments = [{ id: 1, text: '  original  ', received_at: '2026-10-23' }];
  let calls = 0;
  const provider = createBedrockProvider({ send: async (command, options) => {
    calls++;
    assert.equal(command.input.modelId, bedrockModel);
    assert.deepEqual(command.input.system, [{ text: rootReasoningInstructions }]);
    assert.ok(command.input.messages[0].content[0].text.includes(JSON.stringify(fragments)));
    assert.equal(command.input.inferenceConfig.maxTokens, 4096);
    assert.ok(options.abortSignal instanceof AbortSignal);
    return { stopReason: 'end_turn', output: { message: { content: [{ text: JSON.stringify(resultFor(fragments)) }] } }, usage: { inputTokens: 100, outputTokens: 20 } };
  } });
  const response = await provider.infer({ system: rootReasoningInstructions, fragments });
  assert.equal(response.usage.inputTokens, 100);
  validateResult(response.result, fragments);
  await assert.rejects(provider.infer({ system: rootReasoningInstructions, fragments: [{ text: 'x'.repeat(24001) }] }));
  assert.equal(calls, 1);
  for (const response of [
    { stopReason: 'max_tokens' },
    { stopReason: 'end_turn', output: { message: { content: [{ text: 'not JSON' }] } } },
    { stopReason: 'end_turn', output: { message: { content: [{ toolUse: {} }] } } }
  ]) await assert.rejects(createBedrockProvider({ send: async () => response }).infer({ system: rootReasoningInstructions, fragments }));
});

test('live validation command is inert without explicit paid enablement', () => {
  const child = spawnSync(process.execPath, [new URL('../src/verify-live.js', import.meta.url).pathname], {
    encoding: 'utf8', env: { ...process.env, BEDROCK_ENABLED: '0' }
  });
  assert.equal(child.status, 1);
  assert.match(child.stderr, /Not run: obtain budget\/data approval/);
  assert.equal(child.stdout, '');
});

test('invalid model output becomes durable failure, never a ready map', async t => {
  const { store } = setup(t);
  store.capture('preserve me');
  const workflow = new RootAnalysis(store, { source: 'test:invalid', infer: async () => ({ result: resultFor([{ id: 99 }]) }) });
  workflow.showMap(); await workflow.running;
  assert.equal(workflow.showMap().status, 'pending');
  assert.equal(workflow.showMap().error, 'analysis_failed');
  assert.equal(store.snapshot().fragments[0].text, 'preserve me');
  assert.equal(store.analysis(1).result, null);
});

test('failed result and error writes do not crash the process or retry; restart can recover', async t => {
  const { store, path } = setup(t);
  store.capture('  private original\n');
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { ThoughtStore } from ${JSON.stringify(new URL('../src/storage.js', import.meta.url).href)};
    import { RootAnalysis } from ${JSON.stringify(new URL('../src/analysis.js', import.meta.url).href)};
    const store = new ThoughtStore(process.env.TEST_DB);
    let calls = 0;
    const workflow = new RootAnalysis(store, { source: 'test:write-failure', infer: async ({ fragments }) => {
      calls++;
      store.db.exec('PRAGMA query_only = ON');
      return { result: (${resultFor.toString()})(fragments) };
    } });
    workflow.showMap();
    // Leave the job unobserved for an event-loop turn, as the HTTP caller does.
    await new Promise(resolve => setImmediate(() => setImmediate(resolve)));
    assert.equal(workflow.running, null);
    for (let i = 0; i < 3; i++) assert.equal(workflow.showMap().status, 'analyzing');
    workflow.showMap({ retry: true });
    assert.equal(calls, 1);
    assert.equal(store.analysis(1).result, null);
    assert.equal(store.snapshot().fragments[0].text, '  private original\\n');
    store.close();
  `], { encoding: 'utf8', timeout: 5000, env: { ...process.env, BEDROCK_ENABLED: '0', TEST_DB: path } });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, 'Unable to persist analysis status. Restore database writes and restart to recover.\n');
  assert.equal(store.analysis(1).status, 'analyzing');
  store.recoverInterrupted();
  let calls = 0;
  const recovered = new RootAnalysis(store, { source: 'test:recovered-write', infer: async ({ fragments }) => {
    calls++;
    return { result: resultFor(fragments) };
  } });
  assert.equal(recovered.showMap().error, 'interrupted');
  assert.equal(recovered.running, null);
  assert.equal(calls, 0);
  assert.equal(store.snapshot().fragments[0].text, '  private original\n');
  recovered.showMap({ retry: true });
  await recovered.running;
  assert.equal(calls, 1);
  assert.equal(recovered.showMap().status, 'ready');
});

test('server SIGTERM waits for pending analysis before closing the database', t => {
  const { store, path } = setup(t);
  store.capture('retain through shutdown');
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { RootAnalysis } from ${JSON.stringify(new URL('../src/analysis.js', import.meta.url).href)};
    let release;
    let started = false;
    let finished = false;
    const pending = new Promise(resolve => { release = resolve; });
    const showMap = RootAnalysis.prototype.showMap;
    // Inject only in this child process; the real server keeps Bedrock disabled.
    RootAnalysis.prototype.showMap = function(args) {
      this.provider = { source: 'test:shutdown', infer: async ({ fragments }) => {
        started = true;
        await pending;
        finished = true;
        return { result: (${resultFor.toString()})(fragments) };
      } };
      return showMap.call(this, args);
    };
    const listening = new Promise(resolve => {
      console.log = message => resolve(message.split(' ').at(-1));
    });
    await import(${JSON.stringify(new URL('../src/server.js', import.meta.url).href)});
    const response = await fetch(await listening, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'show_map', arguments: {} } })
    });
    assert.equal((await response.json()).result.structuredContent.status, 'analyzing');
    process.once('SIGTERM', () => {
      assert.equal(started, true);
      assert.equal(finished, false);
      setImmediate(release);
    });
    process.kill(process.pid, 'SIGTERM');
  `], { encoding: 'utf8', timeout: 5000, env: { ...process.env, BEDROCK_ENABLED: '0', PORT: '0', DB_PATH: path } });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, '');
  assert.equal(store.analysis(1).status, 'ready');
  assert.equal(store.analysis(1).source, 'test:shutdown');
  assert.equal(store.snapshot().fragments[0].text, 'retain through shutdown');
});
