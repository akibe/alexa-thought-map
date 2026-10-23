import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { setImmediate as tick } from 'node:timers/promises';
import { createLayout } from '../src/layout.js';
import * as hostContract from '../web/host-contract.js';

const fixture = JSON.parse(readFileSync(new URL('../demo/section8-map.en.json', import.meta.url), 'utf8'));

class Element {
  constructor(ownerDocument) { this.ownerDocument = ownerDocument; }
  listeners = new Map();
  children = [];
  style = {};
  dataset = {};
  classList = { toggle() {} };
  textContent = '';
  value = '';
  open = false;
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  fire(type, properties = {}) {
    const event = { ...properties, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    this.listeners.get(type)?.(event);
    // Model the native dialog's default Escape/cancel behavior, not a custom key handler.
    if (type === 'keydown' && event.key === 'Escape' && this.open && !event.defaultPrevented && !this.fire('cancel').defaultPrevented) this.close();
    return event;
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute() {}
  removeAttribute() {}
  focus() { if (this.ownerDocument) this.ownerDocument.activeElement = this; }
  showModal() { this.open = true; }
  close() {
    if (!this.open) return;
    this.open = false;
    // Native dialog close events are queued, so a new selection can open first.
    setImmediate(() => this.fire('close'));
  }
}

async function load(file) {
  const document = { activeElement: null };
  const nodes = new Map();
  const get = id => {
    if (!nodes.has(id)) nodes.set(id, new Element(document));
    return nodes.get(id);
  };
  Object.assign(document, { getElementById: get, createElement: () => new Element(document), querySelector: get,
    querySelectorAll: () => [], documentElement: new Element(document) });
  get('details').showModal = () => { get('details').open = true; get('close-details').focus(); };
  const pending = [];
  let connection;
  class Connection {
    constructor() { connection = this; }
    async connect() {}
    getHostContext() { return {}; }
    async listTools() { return { tools: [] }; }
    callTool(params) {
      return new Promise((resolve, reject) => pending.push({ params, resolve, reject }));
    }
    callServerTool(params) { return this.callTool(params); }
  }
  // Execute the actual module body; replace only imports with boundary doubles.
  const source = readFileSync(new URL(`../web/${file}.js`, import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replace(/^const .* = await import\(.*\);\n/gm, '');
  await runInNewContext(`(async () => {${source}\n})()`, {
    ...hostContract, App: Connection, Client: Connection, StreamableHTTPClientTransport: class {}, URL,
    CfWorkerJsonSchemaValidator: class {}, z: { config() {} },
    document,
    window: new Element(), matchMedia: () => new Element(), innerWidth: 768, innerHeight: 480,
    location: { origin: 'http://127.0.0.1:3000' }, setTimeout, clearTimeout,
    fetch: async () => ({ ok: true, json: async () => ({ demo: false, sandboxOrigin: 'http://127.0.0.1:3001' }) })
  }, { filename: `web/${file}.js` });
  if (file === 'map') {
    connection.ontoolresult({ structuredContent: fixture, _meta: { layout: createLayout(fixture.analysis) } });
    get('next').fire('click'); get('next').fire('click');
  }
  return { get, pending, connection, document };
}

function detail(index) {
  const root = fixture.analysis.roots[index];
  return { structuredContent: { version: fixture.analysis.version, root_id: root.root_id,
    root_sentence: root.sentence, reason: root.reason, next_action: root.next_action,
    fragments: fixture.analysis.fragments.filter(fragment => root.fragment_ids.includes(fragment.id)) } };
}

for (const invoker of ['root', 'Read thoughts']) {
  for (const close of ['Escape', 'close button']) {
    test(`dialog contains Tab in both directions and ${close} restores ${invoker} focus`, async () => {
      const { get, pending, document } = await load('map');
      const opener = invoker === 'root' ? get('insight').children.find(node => node.className === 'root-choice') : get('all-thoughts');
      opener.focus(); opener.fire('click');
      assert.equal(get('details').open, true);
      assert.equal(document.activeElement, get('close-details'));
      if (invoker === 'root') { pending[0].resolve(detail(0)); await tick(); }
      for (const shiftKey of [false, true]) {
        const event = get('details').fire('keydown', { key: 'Tab', shiftKey });
        assert.equal(event.defaultPrevented, true, 'Tab must not escape through the nested iframe');
        assert.equal(document.activeElement, get('close-details'));
      }
      assert.equal(get('details').fire('keydown', { key: 'ArrowDown' }).defaultPrevented, false, 'Keep native text scrolling');
      if (close === 'Escape') assert.equal(get('details').fire('keydown', { key: 'Escape' }).defaultPrevented, false);
      else get('close-details').fire('click');
      await tick();
      assert.equal(get('details').open, false);
      assert.equal(document.activeElement, opener);
      for (const shiftKey of [false, true]) assert.equal(get('details').fire('keydown', { key: 'Tab', shiftKey }).defaultPrevented, false);
      assert.equal(document.activeElement, opener, 'A closed dialog must not take focus');
    });
  }
}

for (const late of ['success', 'error']) {
  for (const selection of ['closed', 'read thoughts', 'root B pending', 'root B ready']) {
    test(`late root A ${late} cannot replace ${selection}`, async () => {
      const { get, pending } = await load('map');
      const roots = get('insight').children.filter(node => node.className === 'root-choice');
      roots[0].fire('click');
      assert.equal(pending[0].params.arguments.root_id, fixture.analysis.roots[0].root_id);
      if (selection !== 'root B pending') get('close-details').fire('click');
      if (selection === 'read thoughts') get('all-thoughts').fire('click');
      if (selection.startsWith('root B')) {
        roots[1].fire('click');
        assert.equal(pending[1].params.arguments.root_id, fixture.analysis.roots[1].root_id);
        // Deliver the previous dialog's queued close before root B's response.
        await tick();
        if (selection === 'root B ready') { pending[1].resolve(detail(1)); await tick(); }
      }
      const snapshot = () => ({ open: get('details').open, title: get('detail-title').textContent,
        reason: get('detail-reason').textContent, action: get('detail-action').textContent,
        originals: get('detail-list').children.map(node => node.textContent) });
      const before = snapshot();
      if (late === 'success') pending[0].resolve(detail(0));
      else pending[0].reject(Error('Delayed failure'));
      await tick();
      assert.deepEqual(snapshot(), before);
      if (selection === 'read thoughts') assert.equal(get('detail-list').children.length, fixture.analysis.fragments.length);
      if (selection === 'root B pending') { pending[1].resolve(detail(1)); await tick(); }
      if (selection.startsWith('root B')) {
        assert.equal(get('detail-title').textContent, detail(1).structuredContent.root_sentence);
        assert.equal(get('detail-reason').textContent, detail(1).structuredContent.reason);
        assert.deepEqual(get('detail-list').children.map(node => node.textContent), detail(1).structuredContent.fragments.map(fragment => fragment.text));
      }
    });
  }
}

test('current root error remains visible', async () => {
  const { get, pending } = await load('map');
  get('insight').children.find(node => node.className === 'root-choice').fire('click');
  pending[0].reject(Error('Current failure')); await tick();
  assert.match(get('detail-reason').textContent, /This map may have changed/);
});

for (const changed of [false, true]) {
  test(`capture preserves exact submitted text and ${changed ? 'keeps a new draft' : 'clears unchanged input'}`, async () => {
    const { get, pending } = await load('simulator');
    const original = '  Original thought.\n<script>text only</script>  ';
    const draft = '  次の下書き\nStill unsaved.  ';
    get('thought').value = original;
    get('capture-form').fire('submit');
    assert.equal(pending.length, 1);
    assert.equal(pending[0].params.name, 'capture_thought');
    assert.equal(pending[0].params.arguments.text, original);
    assert.equal(get('save').disabled, true);
    if (changed) get('thought').value = draft;
    pending[0].resolve({ structuredContent: { received: true, pending_count: 1 } });
    await tick();
    assert.equal(get('thought').value, changed ? draft : '');
    assert.equal(get('quiet-count').textContent, '1 thoughts received');
    assert.equal(get('feedback').textContent, 'Received.');
    assert.equal(get('save').disabled, false);
    assert.equal(pending.length, 1);
  });
}
