import { z } from 'zod';
import { rootReasoningInstructions } from './root-reasoning.js';
import { attributeSchema, focusSchema, judgmentSchema, provenanceSchema, attributeInput, attributeInstructions, priorityInstructions, validateAttributes, validatePriority, selectFocus, groupTopics } from './enrichment.js';

const id = z.number().int().positive();
const sentence = z.string().trim().min(1).max(2000);
export const rootResultSchema = z.strictObject({
  conditions: z.array(z.strictObject({ fragment_id: id, condition: sentence })),
  roots: z.array(z.strictObject({ sentence, fragment_ids: z.array(id).min(1), leverage: z.number().int().positive() })).max(5),
  unmatched_fragment_ids: z.array(id)
});

// Optional enrichments keep persisted task-3-only maps readable without inventing missing stages.
export const mapAnalysisSchema = rootResultSchema.extend({
  version: id, source: z.string(), usage: z.unknown(),
  fragments: z.array(z.object({ id, text: z.string(), received_at: z.string(),
    ...attributeSchema.omit({ fragment_id: true }).partial().shape })),
  roots: z.array(rootResultSchema.shape.roots.element.extend({
    ...judgmentSchema.partial().shape, score: z.number().int().nonnegative().optional()
  })).max(5),
  session_theme: z.string().optional(),
  topics: z.array(z.object({ topic: z.string(), fragment_ids: z.array(id) })).optional(),
  focus: focusSchema.nullable().optional(),
  provenance: z.object({ attributes: provenanceSchema.optional(), roots: provenanceSchema, priority: provenanceSchema.optional() }).optional()
});

export function validateResult(value, fragments) {
  const result = rootResultSchema.parse(value);
  const expected = fragments.map(fragment => fragment.id).sort((a, b) => a - b);
  const complete = ids => ids.length === expected.length &&
    ids.sort((a, b) => a - b).every((value, index) => value === expected[index]);
  if (!complete(result.conditions.map(item => item.fragment_id)) ||
      !complete([...result.roots.flatMap(root => root.fragment_ids), ...result.unmatched_fragment_ids]) ||
      result.roots.some(root => root.leverage !== root.fragment_ids.length)) {
    throw new Error('Invalid analysis membership.');
  }
  return result;
}

export class RootAnalysis {
  constructor(store, provider = null) {
    this.store = store;
    this.provider = provider;
    this.running = null;
  }

  showMap({ retry = false } = {}) {
    const snapshot = this.store.snapshot();
    let analysis = this.store.analysis(snapshot.version);
    if (snapshot.version && this.provider && (!analysis || (retry && analysis.status === 'failed')) && !this.running) {
      this.store.startAnalysis(snapshot, this.provider.source);
      this.running = new Promise(resolve => setImmediate(resolve)).then(async () => {
        let stage = 'roots';
        try {
          const provider = this.provider;
          const checkpoint = this.store.analysis(snapshot.version).checkpoint ?? {};
          const save = (name, response, result, source) => {
            checkpoint[name] = { result, source, usage: response.usage ?? null };
            this.store.saveCheckpoint(snapshot.version, checkpoint);
          };
          let fragments = snapshot.fragments;
          if (provider.attribute) {
            stage = 'attributes';
            if (!checkpoint.attributes) {
              const response = await provider.attribute({ system: attributeInstructions, ...attributeInput(fragments) });
              save(stage, response, validateAttributes(response.result, fragments), provider.attributeSource);
            }
            const attributes = validateAttributes(checkpoint.attributes.result, fragments).attributes;
            fragments = fragments.map(fragment => {
              const { fragment_id, ...attribute } = attributes.find(item => item.fragment_id === fragment.id);
              return { ...fragment, ...attribute };
            });
          }
          stage = 'roots';
          if (!checkpoint.roots) {
            const response = await provider.infer({ system: rootReasoningInstructions, fragments });
            save(stage, response, validateResult(response.result, fragments), provider.source);
          }
          const result = validateResult(checkpoint.roots.result, fragments);
          const output = { ...result, source: checkpoint.roots.source, usage: checkpoint.roots.usage, fragments,
            provenance: { roots: { source: checkpoint.roots.source, usage: checkpoint.roots.usage } } };
          if (checkpoint.attributes) {
            output.session_theme = checkpoint.attributes.result.session_theme;
            output.topics = groupTopics(fragments);
            output.provenance.attributes = { source: checkpoint.attributes.source, usage: checkpoint.attributes.usage };
          }
          if (provider.prioritize && result.roots.length === 0) {
            output.focus = null;
          } else if (provider.prioritize) {
            stage = 'priority';
            const roots = result.roots.map(root => ({ ...root, root_id: Math.min(...root.fragment_ids) }));
            if (!checkpoint.priority) {
              const response = await provider.prioritize({ system: priorityInstructions, fragments, roots, conditions: result.conditions });
              save(stage, response, validatePriority(response.result, roots), provider.prioritySource);
            }
            Object.assign(output, selectFocus(roots, checkpoint.priority.result));
            output.provenance.priority = { source: checkpoint.priority.source, usage: checkpoint.priority.usage };
          }
          mapAnalysisSchema.parse({ version: snapshot.version, ...output });
          this.store.finishAnalysis(snapshot.version, output);
        } catch {
          // Do not persist provider errors: they can contain private input or credentials.
          this.store.finishAnalysis(snapshot.version, null, stage === 'roots' ? 'analysis_failed' : `${stage}_failed`);
        }
      }).catch(() => {
        // Keep the durable analyzing row for startup recovery, without automatic retries.
        console.error('Unable to persist analysis status. Restore database writes and restart to recover.');
      }).finally(() => { this.running = null; });
      analysis = this.store.analysis(snapshot.version);
    }
    const response = {
      status: !snapshot.version ? 'empty' : analysis?.status === 'ready' ? 'ready' : analysis?.status === 'analyzing' ? 'analyzing' : 'pending',
      pending_count: this.store.pendingCount(), root_sentence: null, next_action: null
    };
    if (analysis?.status === 'failed') response.error = analysis.error;
    if (analysis?.status === 'ready') response.analysis = {
      version: analysis.version, source: analysis.source, fragments: analysis.snapshot, ...analysis.result
    };
    if (response.analysis?.focus) {
      response.root_sentence = response.analysis.focus.sentence;
      response.next_action = response.analysis.focus.next_action;
    }
    return response;
  }
}
