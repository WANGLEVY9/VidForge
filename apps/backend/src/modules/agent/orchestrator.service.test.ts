import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { OrchestratorService } from './orchestrator.service';

test('orchestrator replans the script after a quality failure', async () => {
  let scriptCalls = 0;
  let qualityCalls = 0;
  const recordedSpans: Array<{ span?: string; metadata?: Record<string, unknown> }> = [];

  const orchestrator = new OrchestratorService(
    { analyze: async () => ({}) } as never,
    {
      generate: async () => {
        scriptCalls += 1;
        return {
          scriptGeneration: {
            shots: [],
            voiceover: '',
            style: 'professional',
            source: 'fallback' as const,
          },
        };
      },
    } as never,
    { compose: async () => ({ videoComposition: {} }) } as never,
    {
      evaluate: async () => {
        qualityCalls += 1;
        return {
          qualityControl: {
            qualityScore: qualityCalls === 1 ? 60 : 85,
            passed: qualityCalls > 1,
            dimensions: {
              completeness: 100,
              duration: 100,
              consistency: 80,
              compliance: 100,
              hookStrength: 80,
            },
            issues: [],
            feedback: qualityCalls === 1 ? '强化开头钩子' : '可发布',
          },
        };
      },
    } as never,
    { learnFromHighScore: async () => undefined } as never,
    {
      recordSpan: async (input: { span?: string; metadata?: Record<string, unknown> }) => {
        recordedSpans.push(input);
      },
    } as never
  );

  const result = await orchestrator.run({
    productName: '测试商品',
    category: '家居',
    sellingPoints: '轻便耐用',
  });

  assert.equal(result.status, 'completed');
  assert.equal(scriptCalls, 2);
  assert.equal(qualityCalls, 2);

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(recordedSpans[0]?.span, 'agent_workflow');
  assert.equal(recordedSpans[0]?.metadata?.retryCount, 2);
});
