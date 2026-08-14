import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { AgentMemoryService, __memoryTestables } from './agent-memory.service';

test('memory retrieval tokenization is deterministic and ignores one-character noise', () => {
  assert.deepEqual(__memoryTestables.tokenize('清新, 轻便；A 级!'), ['清新', '轻便']);
  assert.equal(__memoryTestables.lexicalScore(['清新', '轻便'], '清新风格，轻便耐用'), 1);
});

test('memory retrieval ranks lexical evidence above weakly related memories', async () => {
  const updated: Array<{ id: string; patch: Record<string, unknown> }> = [];
  const memories = [
    {
      id: 'm1',
      userId: 'u1',
      productSpaceId: 'space-1',
      scope: 'product_space',
      kind: 'preference',
      semanticKey: 'brand.voice',
      content: '品牌语气保持清新、轻便、克制',
      metadata: null,
      importance: 0.5,
      accessCount: 0,
      updatedAt: new Date(),
      expiresAt: null,
    },
    {
      id: 'm2',
      userId: 'u1',
      productSpaceId: 'space-1',
      scope: 'product_space',
      kind: 'fact',
      semanticKey: 'unrelated',
      content: '冬季大衣使用暖色调',
      metadata: null,
      importance: 0.9,
      accessCount: 0,
      updatedAt: new Date(),
      expiresAt: null,
    },
  ];
  const repo = {
    createQueryBuilder: () => {
      const query = {
        where: () => query,
        andWhere: () => query,
        orderBy: () => query,
        addOrderBy: () => query,
        take: () => query,
        getMany: async () => memories,
      };
      return query;
    },
    update: async (id: string, patch: Record<string, unknown>) => updated.push({ id, patch }),
  };
  const service = new AgentMemoryService(repo as never);
  const result = await service.recall({
    userId: 'u1',
    productSpaceId: 'space-1',
    query: '清新 轻便 品牌',
    limit: 1,
  });

  assert.equal(result[0]?.id, 'm1');
  assert.equal(updated[0]?.id, 'm1');
});
