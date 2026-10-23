import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ThoughtStore } from './storage.js';
import { mapAnalysisSchema, validateResult } from './analysis.js';

export function createDemoStore() {
  const { analysis } = JSON.parse(readFileSync(new URL('../demo/section8-map.en.json', import.meta.url), 'utf8'));
  mapAnalysisSchema.parse(analysis);
  validateResult({ conditions: analysis.conditions, roots: analysis.roots.map(({ sentence, fragment_ids, leverage }) => ({ sentence, fragment_ids, leverage })), unmatched_fragment_ids: analysis.unmatched_fragment_ids }, analysis.fragments);
  const directory = mkdtempSync(join(tmpdir(), 'thought-map-demo-'));
  const path = join(directory, 'thoughts.sqlite');
  const store = new ThoughtStore(path);
  try {
    const insert = store.db.prepare('INSERT INTO fragments (id, text, received_at) VALUES (?, ?, ?)');
    store.db.exec('BEGIN');
    for (const fragment of analysis.fragments) insert.run(fragment.id, fragment.text, fragment.received_at);
    const snapshot = store.snapshot();
    if (snapshot.version !== analysis.version) throw new Error('Invalid demo version.');
    store.startAnalysis(snapshot, analysis.source);
    store.finishAnalysis(snapshot.version, analysis);
    store.db.exec('COMMIT');
  } catch (error) {
    store.close();
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
  return { store, path, cleanup: () => rmSync(directory, { recursive: true, force: true }) };
}
