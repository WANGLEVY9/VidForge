# VidForge Agent Runtime

VidForge uses a deterministic LangGraph workflow with specialized agents. The
graph keeps the high-cost media steps behind explicit state boundaries:

```text
material_analysis -> script_generation -> [human_review] -> video_composition -> quality_control
                                      ^                         |
                                      |----- quality replan ----|
```

## Runtime guarantees

- `POST /api/agent/run` creates a durable `agent_runs` control-plane record and
  returns a task ID immediately; `GET /api/agent/status/:taskId` reads the
  latest state from PostgreSQL rather than process memory.
- If `requireHumanReview=true`, the graph persists a LangGraph `interrupt()`
  after script generation. The owner resumes it with
  `POST /api/agent/runs/:taskId/resume` and an approval decision.
- The database record is the durable control plane for status and final output.
  It also carries an optional idempotency key, worker ownership, attempt count,
  lease expiry, heartbeat, graph thread ID and the latest checkpoint ID. The
  metadata prevents two workers from claiming the same pending run and links
  the control-plane record to LangGraph's persisted state.
- `Idempotency-Key` can be sent with `POST /api/agent/run`. Repeating the same
  key for the same authenticated user returns the existing run instead of
  creating another provider-consuming task. The key is capped at 200
  characters and is backed by a database unique index.
- The API process writes the run and its `agent_outbox_events` dispatch intent
  in one transaction. The outbox dispatcher retries BullMQ delivery. The
  `PROCESS_ROLE=agent-worker` process starts a separate Nest application
  context with the Agent consumer; the worker claims a pending run with a
  conditional status update. Progress updates renew its lease and heartbeat.
- LangGraph is compiled with `PostgresSaver` and invoked with the run's stable
  `thread_id`. Each graph super-step is persisted. When a worker lease expires,
  the next worker changes the run back to `pending` and invokes the same thread
  with `null` input, so LangGraph resumes from the latest unfinished node
  rather than replaying completed nodes.
- Checkpointer tables are initialized explicitly with
  `pnpm checkpointer:setup`; schema setup is never hidden in a request path.
  The CI PostgreSQL job runs a failure-and-resume smoke test that asserts the
  completed predecessor node executes exactly once.
- Every Agent video-shot request has a persisted `provider_operations` ledger
  record. It contains a stable operation key, a deterministic request hash,
  sanitized metadata, remote provider task ID, attempt count and terminal
  outcome. A recovered node reuses the remote task ID when it is available.
- `GET /api/agent/runs/:taskId/audit` is owner-scoped and exposes the durable
  run control plane, a compact checkpoint timeline and sanitized Provider
  operation records. It deliberately excludes raw prompts and checkpoint
  channel values.
- Checkpoint inspection is deliberately redacted. `replay` resumes the same
  thread; `fork` copies the selected checkpoint into a new thread so the
  parent latest checkpoint cannot be mutated by the child.
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
# PROCESS_ROLE=api                 # no long-task consumer
# PROCESS_ROLE=agent-worker        # dedicated LangGraph consumer
# PROCESS_ROLE=media-worker        # material/media queue consumer
# AGENT_WORKER_ID=agent-worker-1
# AGENT_WORKER_CONCURRENCY=2       # bounded 1..16 per process
# QUEUE_INLINE_FALLBACK=false      # production default
```

Values are clamped by the runtime to prevent accidental retry storms or
unbounded prompt growth. The
workflow remains deterministic at the graph level; model calls are isolated in
specialized nodes so later work can replace one node with a router, subagent,
or human approval step without changing the media pipeline contract.

## Reliability boundary

The durable execution boundary is now implemented for the LangGraph workflow:

- PostgreSQL protects the run record, duplicate create requests and graph
  checkpoints;
- BullMQ + Redis provides durable dispatch, retry and independent worker
  execution;
- the conditional claim and lease reclaimer protect a run from concurrent
  ownership and recover stale workers;
- the composition node writes a durable Provider operation record before a
  paid ARK request, then saves the remote task ID immediately after acceptance;
  it reuses checkpointed remote task IDs or completed URLs where possible. A
  provider must honor the `Idempotency-Key` header to close the crash window
  between remote acceptance and local remote-ID persistence;
- PostgreSQL/Redis must be configured in production. Inline execution is only
  a development fallback and should not be enabled for a production API.

Workflow code versioning, event-sourced history, provider-independent
exactly-once semantics and full business implementations for every reserved
media queue remain follow-up milestones. See [the reliability model](./RELIABILITY_MODEL.md)
for the current guarantee and failure boundary.

## Deployment checklist

Run the TypeORM migrations and initialize the LangGraph tables against the same
PostgreSQL instance before accepting Agent traffic:

```bash
pnpm --filter @vidforge/backend migration:run
pnpm checkpointer:setup
```

Run the API and Agent Worker as separate processes with the same
`DATABASE_URL`, `REDIS_URL`, and provider credentials:

```bash
PROCESS_ROLE=api pnpm --filter @vidforge/backend start:prod
PROCESS_ROLE=agent-worker AGENT_WORKER_CONCURRENCY=2 pnpm --filter @vidforge/backend start:worker
PROCESS_ROLE=media-worker pnpm --filter @vidforge/backend start:media-worker
```

`render.yaml` contains the API and Agent Worker definitions. For Railway,
deploy the normal `railway.json` as the API service, `railway.worker.json` for
the Agent Worker, and `railway.media-worker.json` for the optional Media
Worker. Workers do not expose HTTP; health is represented by BullMQ activity
and AgentRun lease heartbeats.
