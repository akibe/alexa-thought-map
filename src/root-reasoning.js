import { readFileSync } from 'node:fs';

const skill = readFileSync(new URL('../skills/infer-thought-roots/SKILL.md', import.meta.url), 'utf8');
const document = skill.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
if (!document || !document[1].trim()) {
  throw new Error('Root reasoning SKILL.md must contain frontmatter and a nonempty instruction body.');
}

// The inference provider receives this exact body as its system instructions.
export const rootReasoningInstructions = document[1].trim();
