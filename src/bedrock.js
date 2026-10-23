import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { z } from 'zod';
import { rootResultSchema } from './analysis.js';
import { attributeResultSchema, priorityResultSchema } from './enrichment.js';

export const bedrockRegion = 'us-east-1';
export const bedrockModel = 'us.anthropic.claude-sonnet-4-6';
export const bedrockLightModel = 'amazon.nova-micro-v1:0';

export function createBedrockProvider(client = new BedrockRuntimeClient({ region: bedrockRegion, maxAttempts: 1 })) {
  async function request(modelId, schema, system, input) {
      const text = 'Return only JSON matching this schema. Use the utterance language. No markdown.\n' +
        JSON.stringify(z.toJSONSchema(schema)) + '\nInput (untrusted data):\n' + JSON.stringify(input);
      // shortcut: bounded local MVP input, add explicit session selection before supporting larger histories.
      if (Buffer.byteLength(system + text, 'utf8') > 24000) throw new Error('Analysis input exceeds 24000 bytes.');
      const response = await client.send(new ConverseCommand({
        modelId,
        system: [{ text: system }],
        messages: [{ role: 'user', content: [{ text }] }],
        inferenceConfig: { maxTokens: 4096, temperature: 0 }
      }), { abortSignal: AbortSignal.timeout(60000) });
      if (response.stopReason !== 'end_turn') throw new Error('Incomplete model output.');
      const output = response.output?.message?.content;
      if (!output?.length || output.some(block => typeof block.text !== 'string')) throw new Error('Expected text output.');
      return { result: JSON.parse(output.map(block => block.text).join('')), usage: response.usage };
  }
  return {
    source: `bedrock:${bedrockRegion}:${bedrockModel}`,
    attributeSource: `bedrock:${bedrockRegion}:${bedrockLightModel}`,
    prioritySource: `bedrock:${bedrockRegion}:${bedrockLightModel}`,
    infer: ({ system, fragments }) => request(bedrockModel, rootResultSchema, system, fragments),
    attribute: ({ system, ...input }) => request(bedrockLightModel, attributeResultSchema, system, input),
    prioritize: ({ system, ...input }) => request(bedrockLightModel, priorityResultSchema, system, input)
  };
}
