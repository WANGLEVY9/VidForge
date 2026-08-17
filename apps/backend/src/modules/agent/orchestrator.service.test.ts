import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { MemorySaver } from '@langchain/langgraph';
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

test('orchestrator resumes only the unfinished node from a graph checkpoint', async () => {
  const previousRetries = process.env.AGENT_MAX_RETRIES;
  process.env.AGENT_MAX_RETRIES = '0';
  const saver = new MemorySaver();
  let materialCalls = 0;
  let scriptCalls = 0;
  let compositionCalls = 0;
  let shouldFailComposition = true;
  const checkpoint = {
    get: () => saver,
    hasCheckpoint: async (threadId: string) =>
      Boolean(await saver.getTuple({ configurable: { thread_id: threadId } })),
  };
  const orchestrator = new OrchestratorService(
    {
      analyze: async () => {
        materialCalls += 1;
        return {
          materialAnalysis: {
            matchedMaterials: [],
            tags: {},
            analysis: '',
            hasRealMaterials: false,
          },
        };
      },
    } as never,
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
    {
      compose: async () => {
        compositionCalls += 1;
        if (shouldFailComposition) throw new Error('composition interrupted');
        return {
          videoComposition: {
            videoUrl: '',
            duration: 0,
            hasRealVideo: false,
            composed: false,
            shotResults: [],
          },
        };
      },
    } as never,
    {
      evaluate: async () => ({
        qualityControl: {
          qualityScore: 90,
          passed: true,
          dimensions: {
            completeness: 100,
            duration: 100,
            consistency: 100,
            compliance: 100,
            hookStrength: 100,
          },
          issues: [],
          feedback: 'ok',
        },
      }),
    } as never,
    { learnFromHighScore: async () => undefined } as never,
    { recordSpan: async () => undefined } as never,
    undefined,
    checkpoint as never
  );

  const dto = { productName: '测试商品', category: '家居', sellingPoints: '轻便' };
  const first = await orchestrator.run(dto, 'checkpoint-resume-test');
  assert.equal(first.status, 'failed');

  shouldFailComposition = false;
  const resumed = await orchestrator.run(dto, 'checkpoint-resume-test');
  assert.equal(resumed.status, 'completed');
  assert.equal(materialCalls, 1);
  assert.equal(scriptCalls, 1);
  assert.equal(compositionCalls, 2);
  if (previousRetries === undefined) delete process.env.AGENT_MAX_RETRIES;
  else process.env.AGENT_MAX_RETRIES = previousRetries;
});
