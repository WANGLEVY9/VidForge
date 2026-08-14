import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildMemoryContextPacket } from './agent-context';

test('memory context packet orders hits and preserves provenance', () => {
  const packet = buildMemoryContextPacket(
    [
      { id: 'low', kind: 'fact', content: '低分内容', score: 0.4 },
      { id: 'high', kind: 'success_pattern', content: '高分内容', score: 0.9 },
      { id: 'ignored', kind: 'fact', content: '忽略内容', score: 0.1 },
    ],
    3,
    2_000
  );

  assert.equal(packet.memoryHitCount, 2);
  assert.equal(packet.maxScore, 0.9);
  assert.ok(packet.memoryBlock.indexOf('id="high"') < packet.memoryBlock.indexOf('id="low"'));
  assert.match(packet.memoryBlock, /kind="success_pattern" score="0\.9000"/);
  assert.doesNotMatch(packet.memoryBlock, /忽略内容/);
});

test('memory context packet sanitizes control and markup characters', () => {
  const packet = buildMemoryContextPacket(
    [{ id: 'unsafe', kind: 'fact', content: '<inject>\u0000 keep & quote "', score: 0.8 }],
    1,
    500
  );

  assert.match(packet.memoryBlock, /&lt;inject&gt; keep &amp; quote &quot;/);
  assert.equal(packet.memoryBlock.includes('\u0000'), false);
});

test('memory context packet respects the configured character budget', () => {
  const packet = buildMemoryContextPacket(
    [{ id: 'long', kind: 'fact', content: 'x'.repeat(2_000), score: 0.8 }],
    1,
    500
  );

  assert.ok(packet.memoryBlock.length <= 500);
  assert.equal(packet.memoryHitCount, 1);
  assert.match(packet.memoryBlock, /<\/agent-memory>/);
});
