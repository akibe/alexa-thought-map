import test from 'node:test';
import assert from 'node:assert/strict';
import { createLayout } from '../src/layout.js';
import { readFileSync } from 'node:fs';
import { isShowCommand, validateAppCall, sandboxAddress } from '../web/host-contract.js';

const fixture = (count = 16) => ({
  version: count || 1,
  fragments: Array.from({ length: count }, (_, i) => ({ id: i + 1, text: i === 0 ? '<script>alert(1)</script>長い言葉'.repeat(1000) : `Thought ${i + 1}` })),
  topics: [{ topic: 'A', fragment_ids: Array.from({ length: count }, (_, i) => i + 1).filter(id => id % 2) },
    { topic: 'B', fragment_ids: Array.from({ length: count }, (_, i) => i + 1).filter(id => !(id % 2)) }],
  roots: count ? [{ root_id: 1, fragment_ids: Array.from({ length: count - 1 }, (_, i) => i + 1) }] : [],
  unmatched_fragment_ids: count ? [count] : [], focus: count > 1 ? { root_id: 1 } : null
});

test('layout is deterministic, bounded, nonoverlapping and preserves exact input', () => {
  const input = fixture();
  const before = structuredClone(input);
  const layout = createLayout(input);
  assert.deepEqual(layout, createLayout(input));
  assert.deepEqual(input, before);
  assert.equal(layout.nodes.length, 16);
  assert.equal(layout.nodes.at(-1).root, -1);
  assert.notDeepEqual(layout.nodes[1].positions[1], layout.nodes[1].positions[2]);
  for (let stage = 0; stage < 4; stage++) {
    const boxes = layout.nodes.map(node => node.positions[stage]);
    for (const box of boxes) {
      assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= layout.width && box.y + box.height <= layout.height);
      for (const other of boxes) if (other !== box) assert(box.x + box.width <= other.x || other.x + other.width <= box.x || box.y + box.height <= other.y || other.y + other.height <= box.y);
    }
  }
});

test('handles empty, singleton, five roots, omitted stages, and overflow explicitly', () => {
  assert.equal(createLayout(fixture(0)).nodes.length, 0);
  const one = fixture(1); one.roots = [];
  assert.equal(createLayout(one).nodes[0].root, -1);
  const five = fixture();
  five.roots = [1, 2, 3, 4, 5].map(id => ({ root_id: id, fragment_ids: [id] }));
  five.unmatched_fragment_ids = Array.from({ length: 11 }, (_, i) => i + 6);
  assert.equal(createLayout(five).nodes[4].root, 4);
  delete five.topics; delete five.focus;
  const old = createLayout(five);
  assert(old.nodes.every(node => node.topic === -1 && !node.focused));
  const many = createLayout(fixture(31));
  assert.deepEqual([...many.nodes.map(node => node.id), ...many.overflow_ids], Array.from({ length: 31 }, (_, i) => i + 1));
});

test('rejects duplicate, missing, unknown memberships and stale focus', () => {
  for (const mutate of [
    x => { x.fragments[0].id = 2; },
    x => { x.roots[0].fragment_ids.push(16); },
    x => { x.topics[0].fragment_ids.pop(); },
    x => { x.unmatched_fragment_ids = [99]; },
    x => { x.focus.root_id = 100; },
    x => { x.version = Infinity; }
  ]) {
    const input = fixture(); mutate(input);
    assert.throws(() => createLayout(input));
  }
});

test('validated section 8 fixture retains every fragment across its four layouts', () => {
  const { analysis } = JSON.parse(readFileSync(new URL('fixtures/section8-map.json', import.meta.url), 'utf8'));
  const layout = createLayout(analysis);
  assert.equal(layout.nodes.length, 16);
  assert.deepEqual(new Set(layout.nodes.map(node => node.id)), new Set(analysis.fragments.map(fragment => fragment.id)));
  assert(layout.nodes.some(node => node.focused));
});

test('host permits only app-visible map reads and versioned focus requests', () => {
  const tools = ['show_map', 'focus_root', 'capture_thought'].map(name => ({ name, _meta: { ui: { visibility: ['app'] } } }));
  assert.doesNotThrow(() => validateAppCall({ name: 'show_map', arguments: {} }, tools));
  assert.doesNotThrow(() => validateAppCall({ name: 'focus_root', arguments: { version: 16, root_id: 1 } }, tools));
  for (const request of [
    { name: 'capture_thought', arguments: { text: 'no' } },
    { name: 'show_map', arguments: { retry: true } },
    { name: 'show_map', arguments: { retry: 'false' } },
    { name: 'show_map', arguments: { extra: true } },
    { name: 'focus_root', arguments: { version: 1, root_id: -1 } },
    { name: 'focus_root', arguments: { version: 1, root_id: 1, retry: true } }
  ]) assert.throws(() => validateAppCall(request, tools));
  tools[0]._meta.ui.visibility = ['model'];
  assert.throws(() => validateAppCall({ name: 'show_map' }, tools));
});

test('host command matching never rewrites ordinary input and sandbox is separate loopback', () => {
  for (const command of ['show my map', 'Show me the map!', '見せて', '整理して。']) assert(isShowCommand(command));
  const original = '  I want to show my map someday.\n';
  assert(!isShowCommand(original)); assert.equal(original, '  I want to show my map someday.\n');
  assert.equal(sandboxAddress('http://127.0.0.1:3001', 'http://127.0.0.1:3000').origin, 'http://127.0.0.1:3001');
  for (const address of ['http://127.0.0.1:3000', 'https://example.com', 'http://127.0.0.1:3001/other', 'http://user:pass@localhost:3001']) {
    assert.throws(() => sandboxAddress(address, 'http://127.0.0.1:3000'));
  }
});
