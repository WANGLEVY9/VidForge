# VidForge Agent Runtime

VidForge uses a deterministic LangGraph workflow with specialized agents. The
graph keeps the high-cost media steps behind explicit state boundaries:

```text
material_analysis -> script_generation -> video_composition -> quality_control
                                      ^                         |
                                      |----- quality replan ----|
```

## Runtime guarantees

- `POST /api/agent/run` creates a durable `agent_runs` control-plane record and
  returns a task ID immediately; `GET /api/agent/status/:taskId` reads the
  latest state from PostgreSQL rather than process memory.
- The database record is the durable control plane for status and final output.
  It also carries an optional idempotency key, worker ownership, attempt count,
  lease expiry, heartbeat, graph thread ID and a reserved checkpoint ID. The
  metadata prevents two API processes from claiming the same pending run and
  makes the missing checkpoint boundary explicit.
- `Idempotency-Key` can be sent with `POST /api/agent/run`. Repeating the same
  key for the same authenticated user returns the existing run instead of
  creating another provider-consuming task. The key is capped at 200
  characters and is backed by a database unique index.
- A worker claims a pending run with a conditional status update. Progress
  updates renew its lease and heartbeat. On startup, only runs with no lease
  or an expired lease are marked interrupted; a run with a live lease is left
  to its current worker.
- The current LangGraph checkpoint is still not persisted. A worker restart
  does not yet resume from an exact node checkpoint; `graphThreadId` and
  `checkpointId` are compatibility fields for the Checkpointer rollout.
- Provider, database, and transient network failures use LangGraph retry
  policies with exponential backoff.
- Cancellation, syntax/type errors, and HTTP 4xx input errors are not retried.
- Quality failures re-enter `script_generation`, so the quality feedback is
  actually available to the next plan instead of repeating the same render.
- The replan budget is bounded by `AGENT_QC_MAX_RETRIES` (default `2`).
- The complete workflow is persisted as an `agent_workflow` trace span with
  status, retry count, final node, quality score, and trace span count.
- Status reads and cancellation are scoped to the authenticated user, so a task
  ID cannot be used to inspect another user's run.
- Long-term agent memory is stored separately in `agent_memories`, rather than
  being mixed into product-space configuration. Memories are scoped by user
  and optionally product space, carry a source run ID, importance, expiry and
  access metadata, and can be listed or deleted through `/api/agent/memory`.
- Workflow startup performs bounded, deterministic retrieval of relevant
  memories. Retrieved items are hints only; they never replace the current
  request or bypass authorization. A successful quality-controlled run may
  write one `success_pattern` memory. Memory-write idempotency and HTTP run
  idempotency are separate concerns.
- Retrieved memories enter the script prompt through a bounded context packet.
  The packet keeps hit IDs, kinds and scores, escapes control/markup characters,
  labels the content as reference data rather than instructions, and enforces
  `AGENT_MEMORY_MAX_CHARS` before model invocation.
- Script generation retains the seed RAG references in `scriptGeneration` and
  the workflow trace metadata, so a future hybrid retriever or reranker can be
  evaluated against evidence instead of only the final text.
- The initial retriever is lexical and provider-neutral. It is intentionally a
  stable seam for a later pgvector hybrid retriever or reranker without making
  the workflow depend on a specific embedding vendor.

## Tuning

```dotenv
AGENT_MAX_RETRIES=3
AGENT_RETRY_BASE_DELAY_MS=2000
AGENT_QC_MAX_RETRIES=2
AGENT_MEMORY_TOP_K=6
AGENT_MEMORY_MAX_CHARS=1800
AGENT_LEASE_DURATION_MS=120000
# AGENT_WORKER_ID=api-1
```

Values are clamped by the runtime to prevent accidental retry storms or
unbounded prompt growth. The
workflow remains deterministic at the graph level; model calls are isolated in
specialized nodes so later work can replace one node with a router, subagent,
or human approval step without changing the media pipeline contract.

## Reliability boundary

The current release deliberately stops short of claiming durable Agent
execution. The next reliability milestone is to connect `graphThreadId` to a
real LangGraph checkpointer and run orchestration from a dedicated worker
queue. That milestone must include node-level replay tests, provider operation
idempotency, a lease reclaimer, human approval checkpoints and a cost guard.

Until then:

- PostgreSQL protects the run record and duplicate create requests;
- the conditional claim protects a pending run from double dispatch;
- the lease is ownership metadata and a stale-run signal, not a checkpoint;
- production deployments must configure Redis and should not enable inline
  fallback except for a deliberate emergency override.
