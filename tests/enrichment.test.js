import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { ThoughtStore } from '../src/storage.js';
import { RootAnalysis, mapAnalysisSchema } from '../src/analysis.js';
import { attributeInput, attributeInstructions, priorityInstructions, selectFocus, validateAttributes, validatePriority } from '../src/enrichment.js';
import { rootReasoningInstructions } from '../src/root-reasoning.js';
import { createBedrockProvider, bedrockLightModel } from '../src/bedrock.js';

const attributesFor = fragments => ({ session_theme: 'Making room for music', attributes: fragments.map(({ id }) => ({
  fragment_id: id, topic: id === 1 ? 'Work' : 'Music', direction: id === 1 ? 'must_do' : 'want_to', intensity: 'medium'
})) });
const rootsFor = fragments => ({ conditions: fragments.map(({ id }) => ({ fragment_id: id, condition: 'A protected time for music.' })),
  roots: [{ sentence: 'I have not protected time for music.', fragment_ids: fragments.map(({ id }) => id), leverage: fragments.length }], unmatched_fragment_ids: [] });
const priorityFor = roots => ({ judgments: roots.map(({ root_id }) => ({ root_id, actionability: 'partial', reason: 'A small slot is within my control.', next_action: 'Choose a ten-minute music slot.' })) });
function setup(t) {
  const directory = mkdtempSync(join(tmpdir(), 'thought-map-enrichment-'));
  const path = join(directory, 'thoughts.sqlite');
  const store = new ThoughtStore(path);
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  return { store, path };
}
function fakeProvider() {
  return {
    source: 'test:roots', attributeSource: 'test:attributes', prioritySource: 'test:priority',
    attribute: async ({ session_fragments }) => ({ result: attributesFor(session_fragments) }),
    infer: async ({ fragments }) => ({ result: rootsFor(fragments) }),
    prioritize: async ({ roots }) => ({ result: priorityFor(roots) })
  };
}

test('focus combines leverage and actionability, resolves ties deterministically and keeps every root', () => {
  const roots = [
    { root_id: 1, sentence: 'Want to make music.', fragment_ids: [1, 2], leverage: 2 },
    { root_id: 3, sentence: 'Work can wait.', fragment_ids: [3, 4, 5, 6], leverage: 4 },
    { root_id: 7, sentence: 'Outside my control.', fragment_ids: [7, 8, 9, 10, 11], leverage: 5 }
  ];
  const judgments = [
    { root_id: 1, actionability: 'yes', reason: 'Can start.', next_action: 'Play a note.' },
    { root_id: 3, actionability: 'partial', reason: 'One step.', next_action: 'Draft a boundary.' },
    { root_id: 7, actionability: 'no', reason: 'No available step.', next_action: null }
  ];
  const selected = selectFocus(roots, { judgments });
  assert.equal(selected.focus.root_id, 3, 'equal score prefers greater leverage');
  assert.equal(selected.focus.score, 4);
  assert.equal(selected.roots.length, 3, 'want-to and no roots are retained');
  assert.equal(selected.roots[2].score, 0);
  assert.deepEqual(selectFocus([...roots].reverse(), { judgments: [...judgments].reverse() }).focus, selected.focus);
  const tied = roots.slice(0, 2).map(root => ({ ...root, leverage: 2 }));
  assert.equal(selectFocus(tied.reverse(), { judgments: judgments.slice(0, 2).map(j => ({ ...j, actionability: 'yes' })) }).focus.root_id, 1);
  assert.equal(selectFocus(roots, { judgments: judgments.map(j => ({ ...j, actionability: 'no', next_action: null })) }).focus, null);
  assert.deepEqual(selectFocus([], { judgments: [] }), { roots: [], focus: null });
});

test('strict priority/attribute validation rejects unknown, duplicate, missing IDs, enums and unsupported actions', () => {
  const fragments = [{ id: 1 }, { id: 2 }];
  for (const mutate of [
    r => r.attributes.pop(), r => { r.attributes[1].fragment_id = 1; },
    r => { r.attributes[1].fragment_id = 99; }, r => { r.attributes[0].direction = 'happy'; },
    r => { r.attributes[0].intensity = 3; }, r => { r.attributes[0].topic = ' '; },
    r => { r.attributes[0].text = 'replacement'; }, r => { r.session_theme = ''; }
  ]) { const result = attributesFor(fragments); mutate(result); assert.throws(() => validateAttributes(result, fragments)); }
  const roots = [{ root_id: 1 }, { root_id: 2 }];
  for (const mutate of [
    r => r.judgments.pop(), r => { r.judgments[1].root_id = 1; },
    r => { r.judgments[1].root_id = 99; }, r => { r.judgments[0].actionability = 'maybe'; },
    r => { r.judgments[0].next_action = null; }, r => { r.judgments[0].actionability = 'no'; },
    r => { r.judgments[0].reason = ''; }, r => { r.judgments[0].leverage = 999; }
  ]) { const result = priorityFor(roots); mutate(result); assert.throws(() => validatePriority(result, roots)); }
});

test('context is the immediate preceding three; attributes reach loaded root Skill, topics and focus persist across process restart', async t => {
  const { store, path } = setup(t);
  ['  Work is taking over.\n', 'I want to make music.', 'Not another obligation.', 'I miss playing.', 'Ten minutes might help.'].forEach(text => store.capture(text));
  const raw = store.snapshot().fragments;
  assert.deepEqual(attributeInput(raw).targets.map(item => item.previous_fragment_ids), [[], [1], [1, 2], [1, 2, 3], [2, 3, 4]]);
  let release;
  const provider = fakeProvider();
  provider.attribute = async input => {
    assert.equal(input.system, attributeInstructions);
    assert.deepEqual(input.session_fragments, raw);
    assert.equal(input.session_fragments[0].topic, undefined, 'no fixture topics leak into inference');
    await new Promise(resolve => { release = resolve; });
    return { result: attributesFor(input.session_fragments), usage: { inputTokens: 12, outputTokens: 10 } };
  };
  provider.infer = async input => {
    assert.equal(input.system, rootReasoningInstructions);
    assert.equal(input.fragments[1].direction, 'want_to');
    assert.equal(input.fragments[0].text, raw[0].text);
    return { result: rootsFor(input.fragments) };
  };
  provider.prioritize = async input => {
    assert.equal(input.system, priorityInstructions);
    assert.equal(input.fragments[1].direction, 'want_to');
    assert.equal(input.conditions.length, 5);
    return { result: priorityFor(input.roots) };
  };
  const workflow = new RootAnalysis(store, provider);
  assert.equal(workflow.showMap().status, 'analyzing');
  assert.equal(release, undefined);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(workflow.showMap({ retry: true }).status, 'analyzing');
  release(); await workflow.running;
  const ready = workflow.showMap();
  mapAnalysisSchema.parse(ready.analysis);
  assert.equal(ready.status, 'ready');
  assert.equal(ready.root_sentence, ready.analysis.focus.sentence);
  assert.equal(ready.next_action, 'Choose a ten-minute music slot.');
  assert.deepEqual(ready.analysis.topics, [{ topic: 'Work', fragment_ids: [1] }, { topic: 'Music', fragment_ids: [2, 3, 4, 5] }]);
  assert.equal(ready.analysis.provenance.attributes.source, 'test:attributes');
  assert.equal(ready.analysis.provenance.attributes.usage.inputTokens, 12);
  assert.equal(ready.analysis.provenance.priority.source, 'test:priority');
  assert.equal(ready.analysis.fragments[1].direction, 'want_to');
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { ThoughtStore } from ${JSON.stringify(new URL('../src/storage.js', import.meta.url).href)};
    import { RootAnalysis } from ${JSON.stringify(new URL('../src/analysis.js', import.meta.url).href)};
    const store = new ThoughtStore(process.env.TEST_DB);
    console.log(JSON.stringify(new RootAnalysis(store).showMap())); store.close();
  `], { encoding: 'utf8', env: { ...process.env, TEST_DB: path } });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), ready);
});

test('empty roots skip priority on fresh, failed and interrupted runs, including ready restart/poll/retry', async t => {
  for (const previousStatus of [null, 'failed', 'analyzing']) {
    await t.test(previousStatus ?? 'fresh', async t => {
      const { store, path } = setup(t);
      ['Unclear concern.', 'Another unrelated thought.'].forEach(text => store.capture(text));
      const snapshot = store.snapshot();
      const result = { ...rootsFor(snapshot.fragments), roots: [], unmatched_fragment_ids: [1, 2] };
      const calls = { attributes: 0, roots: 0, priority: 0 };
      const provider = fakeProvider();
      provider.attribute = async () => { calls.attributes++; return { result: attributesFor(snapshot.fragments) }; };
      provider.infer = async () => { calls.roots++; return { result }; };
      provider.prioritize = async () => { calls.priority++; throw new Error('Priority must not run without roots.'); };
      if (previousStatus) {
        store.startAnalysis(snapshot, provider.source);
        store.saveCheckpoint(snapshot.version, {
          attributes: { result: attributesFor(snapshot.fragments), source: provider.attributeSource, usage: null },
          roots: { result, source: provider.source, usage: null }
        });
        if (previousStatus === 'failed') store.finishAnalysis(snapshot.version, null, 'priority_failed');
        store.recoverInterrupted();
      }
      const workflow = new RootAnalysis(store, provider);
      workflow.showMap({ retry: true }); await workflow.running;
      const ready = workflow.showMap();
      assert.equal(ready.status, 'ready');
      mapAnalysisSchema.parse(ready.analysis);
      assert.deepEqual(ready.analysis.roots, []);
      assert.deepEqual(ready.analysis.unmatched_fragment_ids, [1, 2]);
      assert.equal(ready.analysis.focus, null);
      assert.equal(ready.root_sentence, null);
      assert.equal(ready.next_action, null);
      assert.equal(ready.analysis.provenance.priority, undefined);
      assert.equal(store.analysis(snapshot.version).checkpoint.priority, undefined);
      assert.deepEqual(workflow.showMap({ retry: true }), ready);
      assert.deepEqual(calls, { attributes: previousStatus ? 0 : 1, roots: previousStatus ? 0 : 1, priority: 0 });
      const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
        import assert from 'node:assert/strict';
        import { ThoughtStore } from ${JSON.stringify(new URL('../src/storage.js', import.meta.url).href)};
        import { RootAnalysis } from ${JSON.stringify(new URL('../src/analysis.js', import.meta.url).href)};
        const store = new ThoughtStore(process.env.TEST_DB);
        store.recoverInterrupted();
        let calls = 0;
        const unexpected = async () => { calls++; throw new Error('Unexpected model call.'); };
        const workflow = new RootAnalysis(store, { source: 'test:restart', attribute: unexpected, infer: unexpected, prioritize: unexpected });
        const ready = workflow.showMap();
        assert.equal(ready.status, 'ready');
        assert.deepEqual(workflow.showMap({ retry: true }), ready);
        await workflow.running;
        assert.equal(calls, 0);
        console.log(JSON.stringify(ready)); store.close();
      `], { encoding: 'utf8', env: { ...process.env, BEDROCK_ENABLED: '0', TEST_DB: path } });
      assert.equal(child.status, 0, child.stderr);
      assert.deepEqual(JSON.parse(child.stdout), ready);
    });
  }
});

test('priority failure preserves roots; restart and concurrent explicit retries resume only failed stage with true provenance', async t => {
  const { store, path } = setup(t);
  store.capture('I want music.');
  const provider = fakeProvider();
  let calls = 0;
  provider.prioritize = async () => { calls++; throw new Error('private credential material'); };
  const workflow = new RootAnalysis(store, provider);
  workflow.showMap(); await workflow.running;
  assert.equal(workflow.showMap().error, 'priority_failed');
  assert.equal(workflow.showMap().analysis, undefined);
  assert.equal(store.analysis(1).checkpoint.roots.result.roots.length, 1);
  assert.equal(store.analysis(1).error.includes('private'), false);
  assert.equal(calls, 1);
  const restarted = new ThoughtStore(path);
  t.after(() => restarted.close());
  restarted.recoverInterrupted();
  const resumedProvider = fakeProvider();
  resumedProvider.source = 'test:new-root-provider-not-called';
  resumedProvider.prioritySource = 'test:priority-retry';
  resumedProvider.attribute = resumedProvider.infer = async () => assert.fail('successful stage repeated');
  resumedProvider.prioritize = async ({ roots }) => { calls++; return { result: priorityFor(roots) }; };
  const resumed = new RootAnalysis(restarted, resumedProvider);
  assert.equal(resumed.showMap().error, 'priority_failed');
  assert.equal(resumed.running, null);
  resumed.showMap({ retry: true }); resumed.showMap({ retry: true });
  await resumed.running;
  assert.equal(calls, 2);
  assert.equal(resumed.showMap().status, 'ready');
  assert.equal(resumed.showMap().analysis.source, 'test:roots');
  assert.equal(resumed.showMap().analysis.provenance.roots.source, 'test:roots');
  assert.equal(resumed.showMap().analysis.provenance.priority.source, 'test:priority-retry');
});

test('interruption after attribute checkpoint resumes roots; invalid attributes never reach roots', async t => {
  const { store } = setup(t);
  store.capture('Want to play.');
  const snapshot = store.snapshot();
  store.startAnalysis(snapshot, 'test:roots');
  store.saveCheckpoint(snapshot.version, { attributes: { result: attributesFor(snapshot.fragments), source: 'test:attributes', usage: null } });
  store.recoverInterrupted();
  const provider = fakeProvider();
  provider.attribute = async () => assert.fail('successful attributes repeated');
  const workflow = new RootAnalysis(store, provider);
  assert.equal(workflow.showMap().error, 'interrupted');
  workflow.showMap({ retry: true }); await workflow.running;
  assert.equal(workflow.showMap().status, 'ready');
  store.capture('Another thought.');
  provider.attribute = async () => ({ result: attributesFor([{ id: 99 }]) });
  provider.infer = async () => assert.fail('invalid attributes reached roots');
  workflow.showMap(); await workflow.running;
  assert.equal(workflow.showMap().error, 'attributes_failed');
  assert.equal(workflow.showMap().analysis, undefined, 'no previous ready result exposed');
  assert.equal(store.analysis(2).checkpoint, null);
  provider.attribute = async ({ session_fragments }) => ({ result: attributesFor(session_fragments) });
  provider.infer = async () => { throw new Error('root failure'); };
  workflow.showMap({ retry: true }); await workflow.running;
  assert.equal(workflow.showMap().error, 'analysis_failed');
  assert.ok(store.analysis(2).checkpoint.attributes);
  provider.attribute = async () => assert.fail('attributes repeated on root retry');
  provider.infer = async ({ fragments }) => ({ result: rootsFor(fragments) });
  workflow.showMap({ retry: true }); await workflow.running;
  assert.equal(workflow.showMap().status, 'ready');
});

test('capture during priority does not expose stale focus and new snapshot gets its own stages', async t => {
  const { store } = setup(t);
  store.capture('Original.');
  let release;
  const provider = fakeProvider();
  provider.prioritize = async ({ roots }) => { await new Promise(resolve => { release = resolve; }); return { result: priorityFor(roots) }; };
  const workflow = new RootAnalysis(store, provider);
  workflow.showMap(); await new Promise(resolve => setImmediate(resolve));
  store.capture('New desire.');
  assert.equal(workflow.showMap().status, 'pending');
  assert.equal(workflow.showMap().root_sentence, null);
  release(); await workflow.running;
  assert.equal(workflow.showMap().status, 'analyzing');
  assert.equal(workflow.showMap().analysis, undefined);
  await new Promise(resolve => setImmediate(resolve));
  release(); await workflow.running;
  assert.equal(workflow.showMap().analysis.version, 2);
  assert.equal(workflow.showMap().analysis.focus.score, 2);
});

test('invalid priority output is durable failure, never a fake focus; explicit retry retains successful stages', async t => {
  const { store } = setup(t);
  store.capture('Want music.');
  const provider = fakeProvider();
  provider.prioritize = async () => ({ result: { judgments: [{ root_id: 99, actionability: 'yes', reason: 'Unknown root.', next_action: 'No.' }] } });
  const workflow = new RootAnalysis(store, provider);
  workflow.showMap(); await workflow.running;
  assert.equal(workflow.showMap().error, 'priority_failed');
  assert.equal(workflow.showMap().root_sentence, null);
  assert.equal(store.analysis(1).checkpoint.priority, undefined);
  provider.attribute = provider.infer = async () => assert.fail('successful stage repeated');
  provider.prioritize = async ({ roots }) => ({ result: priorityFor(roots) });
  workflow.showMap({ retry: true }); await workflow.running;
  assert.equal(workflow.showMap().status, 'ready');
});

test('checkpoint schema migration preserves existing root-only ready data', async t => {
  const { store, path } = setup(t);
  store.capture('Existing thought.');
  const snapshot = store.snapshot();
  const result = { ...rootsFor(snapshot.fragments), usage: null };
  store.startAnalysis(snapshot, 'test:legacy');
  store.finishAnalysis(snapshot.version, result);
  store.db.exec('ALTER TABLE analyses DROP COLUMN checkpoint');
  const reopened = new ThoughtStore(path);
  try {
    assert.equal(reopened.analysis(1).checkpoint, null);
    assert.deepEqual(reopened.analysis(1).result, result);
    const map = new RootAnalysis(reopened).showMap();
    assert.equal(map.status, 'ready');
    assert.equal(map.analysis.focus, undefined);
    assert.equal(map.analysis.topics, undefined);
    assert.equal(map.root_sentence, null);
  } finally { reopened.close(); }
});

test('Nova Micro attributes/priority use documented Converse text contract with no live requests', async () => {
  const requests = [];
  const provider = createBedrockProvider({ send: async (command, options) => {
    requests.push(command.input);
    assert.equal(command.input.modelId, bedrockLightModel);
    assert.equal(command.input.inferenceConfig.temperature, 0);
    assert.equal(command.input.inferenceConfig.maxTokens, 4096);
    assert.ok(options.abortSignal instanceof AbortSignal);
    assert.equal(command.input.outputConfig, undefined, 'Nova Micro does not support native structured outputs');
    const result = requests.length === 1 ? attributesFor([{ id: 1 }]) : priorityFor([{ root_id: 1 }]);
    return { stopReason: 'end_turn', output: { message: { content: [{ text: JSON.stringify(result) }] } }, usage: { inputTokens: 3, outputTokens: 4 } };
  } });
  const fragments = [{ id: 1, text: 'Want music.', received_at: '2026-10-23T00:00:00Z' }];
  validateAttributes((await provider.attribute({ system: attributeInstructions, ...attributeInput(fragments) })).result, fragments);
  validatePriority((await provider.prioritize({ system: priorityInstructions, fragments, roots: [{ root_id: 1 }] })).result, [{ root_id: 1 }]);
  assert.equal(requests[0].system[0].text, attributeInstructions);
  assert.equal(requests[1].system[0].text, priorityInstructions);
  assert.ok(requests[0].messages[0].content[0].text.includes('previous_fragment_ids'));
  assert.equal(provider.prioritySource, `bedrock:us-east-1:${bedrockLightModel}`);
  await assert.rejects(provider.attribute({ system: attributeInstructions, session_fragments: [{ text: 'x'.repeat(24001) }] }));
  assert.equal(requests.length, 2);
});

test('published section8 full-map fixture satisfies consumer schema and is explicitly synthetic', () => {
  const map = JSON.parse(readFileSync(new URL('./fixtures/section8-map.json', import.meta.url)));
  mapAnalysisSchema.parse(map.analysis);
  assert.equal(map.analysis.source, 'test:section8-handwritten');
  assert.equal(map.root_sentence, map.analysis.focus.sentence);
  assert.equal(map.next_action, map.analysis.focus.next_action);
  assert.equal(map.analysis.fragments.length, 16);
  assert.equal(map.analysis.fragments[8].direction, 'want_to');
});
