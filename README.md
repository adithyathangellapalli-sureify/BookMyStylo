# BookMyStylo

Locality-first salon booking for India. A customer picks a **stylist and a slot** at a saloon near them, the shop runs its day from the partner app, and the platform owner runs the network from the super-admin console.

> Formerly **Snipbook**. Renamed per the naming board (see `kb/recovered/naming-board-artifact.txt`); brand direction A, "the mirror".

## Apps & packages

| Path | What | Port |
|---|---|---|
| `apps/client-app` | Customer app (mobile-first React) — discover, book, track, pay, review, support | 5173 |
| `apps/server-app` | Partner app (shop dashboard, chairs & team, schedule, earnings) **and** the super-admin console (same app, different role) | 5174 |
| `apps/api` | Express + Prisma REST API | 4000 |
| `packages/ui` | Shared design system (`design.css`), brand layer (`brand.css`), React primitives | — |
| `packages/shared` | Types, constants, formatting/time helpers, API client | — |
| `packages/db` | Prisma schema, client, seed | — |
| `packages/tsconfig` | Shared TS configs | — |

## Run it

```bash
pnpm install
pnpm db:generate && pnpm db:push && pnpm db:seed   # SQLite, zero setup
pnpm dev                                            # api + both front-ends
```

Then open http://localhost:5173 (customer) and http://localhost:5174 (partner / console).

**Dev logins** — OTP codes are shown on screen in dev (`OTP_DEV_REVEAL=true` in `apps/api/.env`):

| Role | Number |
|---|---|
| Customer (Priya Nair) | 98765 43210 |
| Partner admin (Ravi Kumar, Demo Cuts) | 99900 00001 |
| Partner stylist (Sam, Demo Cuts) | 99900 00002 |
| Super admin | 90000 00000 |

`pnpm db:reset` wipes and reseeds.

## How booking works

1. Customer picks services, a day, a stylist (or *Any*) and an open slot → the slot is **held for 5 minutes**.
2. *Request booking* → `PENDING` (or `ACCEPTED` instantly if the shop has auto-approve on).
3. Shop accepts/rejects. At the appointment time the shop can *Start service* → `IN_SERVICE` → *Mark complete* → `COMPLETED`, or *No-show*.
4. Payment: **cash is the default**. The customer may switch to **online** — a UPI QR / deep link to the shop's own VPA. The customer never self-confirms: the **shop confirms receipt** (two-step confirm), the customer's screen polls and flips to *Payment successful* on its own. The shop can *Undo* within 10 minutes; after that, *Refund*.
5. After `COMPLETED` the customer rates the stylist (stars, tags, note) → the stylist's aggregate rating updates in the same transaction.

See `kb/` for the state of the project, decision records, and the recovered design specs.

## Scripts

`pnpm typecheck` · `pnpm build` · `pnpm dev:api` / `dev:client` / `dev:partner` · `pnpm --filter @bookmystylo/db studio`
