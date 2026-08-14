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
- The database record is the durable control plane for status and final output;
  the current LangGraph checkpoint is still process-local, so a worker restart
  does not yet resume from an exact node checkpoint; recovery policy remains a
  follow-up area.
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
  write one `success_pattern` memory, making replayed runs idempotent.
- The initial retriever is lexical and provider-neutral. It is intentionally a
  stable seam for a later pgvector hybrid retriever or reranker without making
  the workflow depend on a specific embedding vendor.

## Tuning

```dotenv
AGENT_MAX_RETRIES=3
AGENT_RETRY_BASE_DELAY_MS=2000
AGENT_QC_MAX_RETRIES=2
```

Values are clamped by the runtime to prevent accidental retry storms. The
workflow remains deterministic at the graph level; model calls are isolated in
specialized nodes so later work can replace one node with a router, subagent,
or human approval step without changing the media pipeline contract.
