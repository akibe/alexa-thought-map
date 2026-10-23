import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { rootReasoningInstructions } from '../src/root-reasoning.js';

test('loads the actual skill body without discovery metadata', () => {
  const source = readFileSync(new URL('../skills/infer-thought-roots/SKILL.md', import.meta.url), 'utf8');
  assert.equal(rootReasoningInstructions, source.slice(source.indexOf('\n---\n') + 5).trim());
  assert.ok(rootReasoningInstructions.length > 0);
  assert.ok(!rootReasoningInstructions.includes('description:'));
});

test('server startup requires its packaged skill and resolves it independently of cwd', t => {
  const directory = mkdtempSync(join(tmpdir(), 'thought-map-skill-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, 'src'));
  mkdirSync(join(directory, 'skills/infer-thought-roots'), { recursive: true });
  copyFileSync(new URL('../src/root-reasoning.js', import.meta.url), join(directory, 'src/root-reasoning.js'));
  copyFileSync(new URL('../src/server.js', import.meta.url), join(directory, 'src/server.js'));
  copyFileSync(new URL('../src/storage.js', import.meta.url), join(directory, 'src/storage.js'));
  for (const file of ['analysis.js', 'bedrock.js', 'enrichment.js', 'layout.js', 'demo.js', 'ui.js']) copyFileSync(new URL('../src/' + file, import.meta.url), join(directory, 'src', file));
  symlinkSync(fileURLToPath(new URL('../node_modules', import.meta.url)), join(directory, 'node_modules'));
  const startup = spawnSync(process.execPath, [join(directory, 'src/server.js')], {
    cwd: tmpdir(), encoding: 'utf8', timeout: 5000,
    env: { ...process.env, PORT: '0', DB_PATH: join(directory, 'unused.sqlite') }
  });
  assert.equal(startup.status, 1, startup.stderr);
  assert.match(startup.stderr, /ENOENT.*SKILL\.md/);
  const entry = join(directory, 'src/start.mjs');
  writeFileSync(entry, "import { rootReasoningInstructions } from './root-reasoning.js';\nprocess.stdout.write(rootReasoningInstructions);");
  const run = () => spawnSync(process.execPath, [entry], { cwd: tmpdir(), encoding: 'utf8' });
  assert.notEqual(run().status, 0, 'missing skill must fail');
  const path = join(directory, 'skills/infer-thought-roots/SKILL.md');
  for (const invalid of ['body without frontmatter', '---\nname: test\n---\n  ']) {
    writeFileSync(path, invalid);
    const result = run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /nonempty instruction body/);
  }
  writeFileSync(path, '---\r\nname: test\r\ndescription: test\r\n---\r\nChanged packaged instructions.\r\n');
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'Changed packaged instructions.');
});
