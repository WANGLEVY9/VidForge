# Contributor quickstart

This is the shortest path from a fresh checkout to a reviewable VidForge change.

## 1. Prepare the workspace

```bash
corepack pnpm@8.15.4 install --frozen-lockfile
cp apps/backend/.env.example apps/backend/.env
docker compose up -d
corepack pnpm@8.15.4 --filter @vidforge/backend migration:run
```

If Docker or PostgreSQL is unavailable, you can still run the frontend build, repository checks, backend unit tests, the offline benchmark, and the FFmpeg smoke test when FFmpeg is installed.

## 2. Choose a focused contribution

- `good first issue`: documentation, fixture, accessibility, or test improvements.
- `help wanted`: provider adapters, preview transports, evaluation, and internationalization.
- Security issues belong in a private GitHub Security Advisory, not a public Issue.

Read [`docs/CONTRIBUTION_IDEAS.md`](./CONTRIBUTION_IDEAS.md) and search existing Issues before starting. A useful contribution has a clear user scenario, a bounded diff, and a reproducible verification command.

## 3. Verify before opening a PR

```bash
corepack pnpm@8.15.4 test:repo
corepack pnpm@8.15.4 --filter @vidforge/backend build
corepack pnpm@8.15.4 --filter @vidforge/frontend build
corepack pnpm@8.15.4 benchmark:local
corepack pnpm@8.15.4 docs:check
```

For changes to media processing, also run the backend test suite; the local Composer smoke test uses no paid provider and skips only when FFmpeg is missing.

## 4. Pull request checklist

Explain the user problem, the behavior change, the tests you ran, and any deployment or migration impact. Do not commit `.env`, credentials, generated videos, private user data, or copied third-party code without a license review.
