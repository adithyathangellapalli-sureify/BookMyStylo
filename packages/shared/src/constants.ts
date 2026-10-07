export const BRAND = "BookMyStylo";
export const BRAND_SHORT = "Stylo";
export const HOLD_MINUTES = 5;
export const PAYMENT_UNDO_MINUTES = 10;
export const OTP_TTL_MINUTES = 10;
export const PAYMENT_POLL_MS = 3000;
export const PAYMENT_SLOW_AFTER_MS = 90_000;

export const BOOKING_STATUSES = ["PENDING", "ACCEPTED", "IN_SERVICE", "COMPLETED", "REJECTED", "CANCELLED", "NO_SHOW"] as const;
export const SHOP_STATUSES = ["PENDING", "LIVE", "SUSPENDED"] as const;
export const REVIEW_TAGS = ["Fades", "Beard", "Colour", "On time", "Friendly", "Value", "Clean"] as const;

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending", ACCEPTED: "Accepted", IN_SERVICE: "In service", COMPLETED: "Done",
  REJECTED: "Rejected", CANCELLED: "Cancelled", NO_SHOW: "No-show",
};
export const STATUS_PILL: Record<string, string> = {
  PENDING: "p-new", ACCEPTED: "p-available", IN_SERVICE: "p-frozen", COMPLETED: "p-booked",
  REJECTED: "p-closed", CANCELLED: "p-closed", NO_SHOW: "p-leave",
};
