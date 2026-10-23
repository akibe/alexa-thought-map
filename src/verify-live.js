import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ThoughtStore } from './storage.js';
import { RootAnalysis } from './analysis.js';
import { createBedrockProvider } from './bedrock.js';

if (process.env.BEDROCK_ENABLED !== '1') {
  console.error('Not run: obtain budget/data approval, then explicitly set BEDROCK_ENABLED=1.');
  process.exitCode = 1;
} else {
  const fixture = JSON.parse(readFileSync(new URL('../tests/fixtures/section8.json', import.meta.url), 'utf8'));
  const path = join(mkdtempSync(join(tmpdir(), 'thought-map-live-')), 'thoughts.sqlite');
  const store = new ThoughtStore(path);
  try {
    fixture.forEach(({ text }) => store.capture(text));
    // Preserve the separately approved task-3 single-call contract: no enrichment calls.
    const { source, infer } = createBedrockProvider();
    const analysis = new RootAnalysis(store, { source, infer });
    console.log(JSON.stringify({ database: path, initial: analysis.showMap() }));
    await analysis.running;
    const map = analysis.showMap();
    console.log(JSON.stringify(map, null, 2));
    if (map.status !== 'ready') process.exitCode = 1;
    else {
      const crossesTopics = map.analysis.roots.some(root => new Set(root.fragment_ids.map(id => fixture[id - 1].topic)).size > 1);
      console.log(JSON.stringify({ crossesTopics, human_quality_review: 'REQUIRED: inspect dependency sentences and memberships against section 8; this flag alone is not acceptance.' }));
      if (!crossesTopics) process.exitCode = 1;
    }
  } finally { store.close(); }
}
