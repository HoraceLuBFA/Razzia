# Contributing to Razzia

本 Fork 由 [HoraceLuBFA](https://github.com/HoraceLuBFA/Razzia) 维护，默认开发与 PR 目标为 `main`，保留原版历史及许可证。向原始公版贡献时，请查阅 Ralex91/Razzia 当时的贡献要求。

Thank you for your interest in contributing!

## Getting Started

Requirements: Node.js 26+ and [pnpm](https://pnpm.io/) 10.16+.

1. Fork the repository
2. Clone your fork: `git clone https://github.com/HoraceLuBFA/Razzia.git`
3. Checkout the `main` branch: `git checkout main`
4. Install dependencies from the repository root: `pnpm install --frozen-lockfile`
5. Create your `.env`: `cp .env.example .env` and set `MANAGER_PASSWORD`
6. Create a branch from `dev`: `git checkout -b feat/your-feature-name`
7. Start the app in development mode: `pnpm dev`

## Project Structure

Razzia is a pnpm monorepo:

- `packages/web` — React frontend
- `packages/socket` — game server (HTTP API and Socket.IO)
- `packages/common` — types, validators and logic shared by both
- `packages/e2e` — Playwright end-to-end tests

## Branch Naming

- `feat/` — new feature
- `fix/` — bug fix
- `chore/` — maintenance, dependencies
- `docs/` — documentation only
- `test/` — tests only

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add timer display to question screen
fix: prevent crash when quiz has no questions
chore: update dependencies
```

## Pull Requests

- **Target this Fork’s `main` branch**: `HoraceLuBFA/Razzia`.
- Start from the latest Fork main: `git checkout main && git pull --ff-only`.
- **One PR = one feature or fix.** Do not bundle multiple features in a single PR — it becomes unmanageable to review and harder to revert if something breaks.
- Make sure the CI passes before requesting review (format, lint, unit and e2e tests)
- Add or update tests when you change behavior
- Link any related issue with `Closes #123`

## Code Style

Run these from the repository root before committing:

```bash
pnpm format:fix   # format with Prettier
pnpm lint:fix     # lint with oxlint
```

- Keep components small and focused
- No commented-out code

## Testing

```bash
pnpm test       # unit and integration tests (Vitest)
pnpm test:e2e   # end-to-end tests (Playwright)
```

Before the first e2e run, install the browser: `pnpm --filter @razzia/e2e exec playwright install chromium`.

See [docs/testing.md](../docs/testing.md) for details.

## Reporting Issues

Use the issue templates provided in this repository.
