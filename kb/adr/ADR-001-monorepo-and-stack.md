# ADR-001 — pnpm monorepo; React + Vite front-ends; Express + Prisma + SQLite API

**Status:** accepted · 2026-10-07 (re-affirmed on rebuild)

## Context
The original project was a pnpm monorepo with seven `@snipbook/*` workspace packages, React/TSX apps under `apps/client-app` and `apps/server-app`, a shared `packages/ui` design system, a Prisma data model and a REST API (all confirmed by the recovered artifacts). The backend framework and database were not recorded.

## Decision
Keep the layout. Use **Vite + React 18 + react-router** for both front-ends, **Express 4 + Prisma 5** for the API, and **SQLite** for local dev so the project runs with zero setup. The Prisma schema avoids SQLite-only features so the provider can flip to Postgres for production.

## Consequences
- `String[]` columns are stored as comma-separated strings (`csvToList`/`listToCsv` in `@bookmystylo/shared`).
- One API serves all three UIs; role is on the JWT.
