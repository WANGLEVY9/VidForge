# VidForge examples

These examples are intentionally provider-neutral and contain no credentials. They are useful as fixtures for local development, API documentation, and contributor tests.

## Storyboard request

[`storyboard-short-video.json`](./storyboard-short-video.json) is a minimal body for `POST /api/creation/task` after authentication:

```bash
curl -X POST http://localhost:3001/api/creation/task \
  -H "Authorization: Bearer <local-token>" \
  -H "Content-Type: application/json" \
  --data-binary @examples/storyboard-short-video.json
```

The request may enter the provider fallback path when ARK is not configured. It is a shape example, not a promise that a local environment can render without FFmpeg and the configured providers.

## Adding an example

- Keep it small, deterministic, and free of credentials or personal data.
- State which endpoint or module consumes it.
- Add an assertion or reproducible command when the example encodes a contract.
