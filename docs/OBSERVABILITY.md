# Observability

VidForge keeps the database trace table as the durable product-level record. It also propagates a bounded `X-Request-Id` through HTTP handlers and async work, stores it in trace metadata, emits one-line JSON HTTP access events, and can optionally export the same span to an OTLP/HTTP collector.

HTTP logs contain only `event`, request ID, method, route path, status, and latency. Query strings, authorization headers, request bodies, and provider credentials are intentionally excluded.

## Provider operation audit

For Agent video generation, `provider_operations` is a separate durable audit
ledger. It correlates a stable idempotency key, a request hash, remote task ID,
attempt count and terminal provider outcome without copying secrets or raw
prompts into telemetry. An authenticated run owner can inspect a compact
checkpoint timeline and these sanitized records through
`GET /api/agent/runs/:taskId/audit`.

This ledger complements `trace_spans`; it does not make third-party calls
exactly once. Provider-side idempotency and the remaining crash window are
documented in [Agent reliability model](./RELIABILITY_MODEL.md).

## Agent control-plane signals

The `agent_outbox_events` table exposes dispatch intent separately from graph
execution. Operators can distinguish a run that is waiting for delivery
(`pending`), being claimed (`dispatching`), accepted by BullMQ (`dispatched`)
or exhausted after bounded retries (`failed`). HITL pauses are represented by
the `paused` AgentRun status and the redacted `control` payload returned to the
run owner. Checkpoint replay and fork preserve these signals without exposing
raw prompt or memory channels.

## Local benchmark

The benchmark is deliberately offline: it never calls an AI provider, uploads media, or requires Redis/PostgreSQL.

```bash
pnpm benchmark:local
```

The JSON output reports a cache-key hashing latency baseline, estimated text/video costs, and `providerCalls: 0`. It is a regression signal for local changes, not a claim about end-to-end provider latency.

## Optional OTLP export

Set either variable in the backend environment:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
# or use a complete traces endpoint:
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
```

Export is best-effort with a 1.5-second timeout. Collector failures are swallowed so telemetry cannot fail video generation. Do not put API keys in request IDs or trace attributes; sensitive provider credentials are never exported.

## Media smoke test

The backend test suite includes a local Composer smoke test. It generates a one-second color fixture with FFmpeg, runs the real download/concat/audio/publish/probe path, and verifies a non-empty 270×480 MP4. It is skipped when FFmpeg is not installed and never contacts a paid provider.
