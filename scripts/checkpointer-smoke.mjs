import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../apps/backend/package.json', import.meta.url));
const { Annotation, END, START, StateGraph } = require('@langchain/langgraph');
const { PostgresSaver } = require('@langchain/langgraph-checkpoint-postgres');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for the checkpointer smoke test');

const saver = PostgresSaver.fromConnString(databaseUrl);
const threadId = `ci-checkpointer-${randomUUID()}`;
let firstCalls = 0;
let flakyCalls = 0;
let failOnce = true;

const State = Annotation.Root({
  value: Annotation({ reducer: (_left, right) => right, default: () => 0 }),
});

const graph = new StateGraph(State)
  .addNode('first', () => {
    firstCalls += 1;
    return { value: 1 };
  })
  .addNode('flaky', () => {
    flakyCalls += 1;
    if (failOnce) {
      failOnce = false;
      throw new Error('intentional checkpoint smoke failure');
    }
    return { value: 2 };
  })
  .addEdge(START, 'first')
  .addEdge('first', 'flaky')
  .addEdge('flaky', END)
  .compile({ checkpointer: saver });

const config = { configurable: { thread_id: threadId } };
try {
  await assert.rejects(graph.invoke({ value: 0 }, config), /intentional checkpoint smoke failure/);
  const interrupted = await graph.getState(config);
  assert.deepEqual(interrupted.next, ['flaky']);
  assert.equal(interrupted.values.value, 1);

  const resumed = await graph.invoke(null, config);
  assert.equal(resumed.value, 2);
  assert.equal(firstCalls, 1, 'completed nodes must not run again after resume');
  assert.equal(flakyCalls, 2);
  console.log('LangGraph node-level resume smoke test passed.');
} finally {
  await saver.deleteThread(threadId);
  await saver.end();
}
