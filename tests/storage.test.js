import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';
import { ThoughtStore } from '../src/storage.js';

test('SQLite preserves original text, timestamp, and count across a process restart', t => {
  const directory = mkdtempSync(join(tmpdir(), 'thought-map-storage-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'nested', 'thoughts.sqlite');
  const original = '  見積もり、安くしすぎた気がする\n"音楽"も続けたい 🎵  ';
  const before = new Date().toISOString();
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { ThoughtStore } from ${JSON.stringify(new URL('../src/storage.js', import.meta.url).href)};
    const store = new ThoughtStore(process.env.TEST_DB);
    console.log(JSON.stringify(store.capture(process.env.TEST_TEXT)));
    store.close();
  `], { encoding: 'utf8', env: { ...process.env, TEST_DB: path, TEST_TEXT: original } });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), { received: true, pending_count: 1 });
  const store = new ThoughtStore(path);
  assert.equal(store.pendingCount(), 1);
  assert.deepEqual(store.capture("literal '); DROP TABLE fragments; --"), { received: true, pending_count: 2 });
  store.close();
  const db = new DatabaseSync(path, { readOnly: true });
  const rows = db.prepare('SELECT * FROM fragments ORDER BY id').all();
  db.close();
  assert.equal(rows[0].text, original);
  assert.ok(rows[0].received_at >= before && rows[0].received_at <= new Date().toISOString());
  assert.equal(rows[1].text, "literal '); DROP TABLE fragments; --");
  assert.equal(statSync(path).mode & 0o777, 0o600);
});
