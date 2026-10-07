# Project state

_Last updated: 2026-10-07_

## Where we are

**Rebuilt from scratch on 2026-10-07** after the original repo was lost with a laptop (never pushed). The only surviving records were two claude.ai artifacts — the design-system/screen gallery and the naming board — both preserved as plain text in `kb/recovered/`. Everything in this repo was reconstructed from them; the original prompts and code are gone.

## What's built (all verified in-browser on 2026-10-07)

- **Design system** — `packages/ui/src/design.css` is the gallery's "verbatim" copy of the original `design.css`, plus the finalized stylist-picker / rating classes. `brand.css` layers the BookMyStylo brass palette and the mirror-O wordmark on top (Direction A from the naming board).
- **Customer app** — OTP login & signup, Discover by locality (available / all), Shop page (services, 7-day picker, **Option A stylist tabs + profile card**, slot grid with open/booked/held/past, 5-min hold with countdown, request), Confirmation, My bookings, Booking detail (status tracker, map placeholder, cancel), **UPI pay sheet with auto-success / slow nudge / reopened states**, Rate your visit (post + edit), Support chat, Profile.
- **Partner app** — OTP login & signup, **6-step registration wizard**, Dashboard (auto-approve toggle, KPIs, booking requests, day schedule with start / complete / no-show / collect cash / **confirm UPI received (two-step) / not received / undo / refund**), Chairs & team (assign, add/remove, **stylist profile editor**), Schedule (hours, slot length, days off, holidays, staff leave, staged save bar), Earnings (shop + per-stylist), Profile (self-leave; stylists edit their own profile). Staff see a trimmed nav.
- **Super-admin console** — stats dashboard + pending queue, shop review (segmented by status, search, paging, approve/suspend/reinstate), services catalog (toggle + add, staged save), cities & localities, support tickets (thread, reply, resolve/reopen). Collapsing sticky header; sidebar → bottom tabs on mobile.
- **API** — Express 4 + Prisma 5 + SQLite. See `apps/api/src/routes/*`.

## Known gaps / next

- Seeded stylist ratings are a cached number with no backing `Review` rows; the first real review on a seeded stylist recomputes from reviews only (so Ravi drops from 4.8/131 to the real count). Fine for dev; seed real reviews if it matters.
- No SMS provider — OTP codes are returned by the API in dev (`OTP_DEV_REVEAL`). Wire MSG91/Twilio before any real users.
- No PSP. The shop-confirmed UPI flow is deliberate (see ADR-004); Razorpay/Cashfree can later replace the Confirm tap with a webhook without changing screens.
- No tests yet. Smoke-tested manually (curl + browser). Playwright suite is the obvious next step.
- No push notifications / SMS to the customer on accept ("You'll get a text" is aspirational copy from the original).
- Map on booking detail is a placeholder (as in the original).
- Prod datasource: switch `packages/db/prisma/schema.prisma` to `postgresql`; csv-string columns (`skills`, `tags`, `weeklyDaysOff`) could become arrays then.

## Decisions

See `kb/adr/`.
