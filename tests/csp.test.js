import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { setImmediate as tick } from 'node:timers/promises';

test('bundled simulator connects without string code generation and rejects invalid tool output', async () => {
  const nodes = new Map();
  const element = id => {
    if (!nodes.has(id)) nodes.set(id, {
      dataset: {}, listeners: {}, value: '', textContent: '',
      addEventListener(type, callback) { this.listeners[type] = callback; },
      setAttribute() {}, removeAttribute() {}, focus() {}
    });
    return nodes.get(id);
  };
  const requests = [];
  let output = { received: true, pending_count: 1 };
  const html = readFileSync(new URL('../web/dist/simulator.html', import.meta.url), 'utf8');
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  const context = {
    document: { getElementById: element, documentElement: element('html') }, window: element('window'),
    matchMedia: () => ({ matches: false }), location: { origin: 'http://127.0.0.1:3000' },
    URL, URLSearchParams, Headers, Response, Request, AbortController, TextDecoder, TextEncoder, TransformStream,
    setTimeout, clearTimeout, console: { error() {}, warn() {}, log() {} },
    fetch: async (url, options = {}) => {
      if (url === '/ui-config') return Response.json({ demo: false, sandboxOrigin: 'http://127.0.0.1:3001' });
      if (options.method === 'GET') return new Response(null, { status: 405 });
      const request = JSON.parse(options.body);
      requests.push(request);
      if (request.id === undefined) return new Response(null, { status: 202 });
      let result;
      if (request.method === 'initialize') result = {
        protocolVersion: '2025-11-25', capabilities: { tools: {} }, serverInfo: { name: 'CSP test', version: '1' }
      };
      else if (request.method === 'tools/list') result = { tools: [{
        name: 'capture_thought', inputSchema: { type: 'object' },
        outputSchema: { type: 'object', properties: { received: { type: 'boolean' }, pending_count: { type: 'integer', minimum: 0 } },
          required: ['received', 'pending_count'], additionalProperties: false }
      }] };
      else if (request.method === 'tools/call') result = { content: [], structuredContent: output };
      else throw Error(`Unexpected method: ${request.method}`);
      return Response.json({ jsonrpc: '2.0', id: request.id, result });
    }
  };
  await runInNewContext(`(async () => {
    globalThis.codegenAttempts = 0;
    globalThis.codegenStacks = [];
    globalThis.Function = new Proxy(Function, {
      construct(target, args) { codegenAttempts++; codegenStacks.push(new Error().stack); return Reflect.construct(target, args); },
      apply(target, receiver, args) { codegenAttempts++; codegenStacks.push(new Error().stack); return Reflect.apply(target, receiver, args); }
    });
    ${script}
  })()`, context, { contextCodeGeneration: { strings: false, wasm: false } });
  assert.equal(context.codegenAttempts, 0, `Even a caught Zod eval probe violates browser CSP: ${context.codegenStacks}`);
  assert.equal(element('feedback').textContent, 'Ready when you are.');
  assert(requests.some(request => request.method === 'tools/list'));
  for (const invalid of [false, true]) {
    output = { received: true, pending_count: invalid ? -1 : 1 };
    element('thought').value = '  Exact original thought.\n';
    element('capture-form').listeners.submit({ preventDefault() {} });
    for (let i = 0; i < 20 && element('save').disabled; i++) await tick();
    assert.equal(element('save').disabled, false);
    if (invalid) {
      assert.match(element('feedback').textContent, /connection could not finish/);
      assert.equal(element('thought').value, '  Exact original thought.\n');
    } else {
      assert.equal(element('feedback').textContent, 'Received.');
      assert.equal(element('thought').value, '');
    }
  }
  assert.equal(requests.filter(request => request.method === 'tools/call').length, 2);
  assert.equal(context.codegenAttempts, 0);
  element('window').listeners.pagehide();
});
