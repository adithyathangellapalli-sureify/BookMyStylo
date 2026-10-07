# ADR-002 — Mobile-number OTP login, no passwords

**Status:** accepted

## Decision
Every user (customer, partner, super admin) logs in with a 10-digit Indian mobile number and a 6-digit OTP. One `User` per phone with one role; the customer app only accepts `CUSTOMER`, the partner app accepts `PARTNER` and `SUPER_ADMIN`. First login on a new number returns `needsSignup` + a short-lived signup token; signup only asks for a name.

In dev, `OTP_DEV_REVEAL=true` returns the code in the API response and the UI shows it ("Dev code: …"), matching the original screens.

## Consequences
- No password reset flows, no email.
- A real SMS provider is needed before production; the send endpoint is the single place to wire it.
