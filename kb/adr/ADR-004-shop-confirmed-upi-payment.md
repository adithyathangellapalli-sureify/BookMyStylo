# ADR-004 — Online payment is shop-confirmed UPI, not a PSP, and the customer never self-confirms

**Status:** accepted (designed in the gallery as "proposed"; built on rebuild)

## Context
The first version had an abusable "I've paid — confirm" button on the customer side. The gallery's finalized design replaces it: the customer pays the shop's own UPI VPA directly (QR + `upi://pay` deep link with amount and booking ref); only the shop can see the money land, so only the shop confirms.

## Decision
- `paymentMethod` CASH (default) | ONLINE; `paymentStatus` UNPAID | PAID | REFUNDED.
- Customer: `POST /customer/bookings/:id/payment/method` picks the method and opens the pay sheet, which polls every 3 s and flips to *Payment successful* when `PAID`. After 90 s it shows a time-based "taking longer" nudge (never a false failure) with *Message the saloon*, *Show QR again*, *Pay cash instead*.
- Shop: *Confirm ₹X received* and *Not received yet* are both two-step confirms; Cancel changes nothing. Confirm → `PAID` with `paidVia=UPI_CONFIRMED`. *Undo* is allowed for 10 minutes (customer's receipt flips to *Reopened — don't pay again*); after that, *Refund* → `REFUNDED`.
- *Not received yet* is intentionally a no-op on the record.

## Consequences
- Works in production with no gateway or fees.
- A PSP (Razorpay/Cashfree) can later be added as a webhook that calls the same confirm transition — screens unchanged.
