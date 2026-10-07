# ADR-003 — Chair + slot is the bookable unit; stylist-first picker; 5-minute holds

**Status:** accepted

## Context
The product promise is "book the chair, not the queue". Each stylist is assigned to a chair; the shop defines opening hours and a slot length; availability is computed per stylist per day from bookings, holds, leave, holidays and weekly days off. The customer picks a **stylist** (Option A stylist tabs — finalized in the gallery) or *Any*, then a slot.

## Decision
- `Hold` rows reserve a (staff, date, time) for 5 minutes for one customer; a customer has at most one hold; expired holds are purged lazily on every availability read.
- "Any stylist" resolves to the first stylist with that slot open at hold time; the chair follows the stylist.
- Booking creation consumes the hold in a transaction and re-checks for clashes.
- Status machine: `PENDING → ACCEPTED → IN_SERVICE → COMPLETED`, with `REJECTED`, `CANCELLED` (customer, while pending/accepted) and `NO_SHOW` (shop, from accepted).
