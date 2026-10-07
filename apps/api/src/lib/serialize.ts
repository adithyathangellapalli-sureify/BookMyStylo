import { csvToList, PAYMENT_UNDO_MINUTES, type BookingDTO, type LocalityDTO, type ShopCardDTO, type ShopDTO, type StylistDTO, type TicketDTO } from "@bookmystylo/shared";
import { prisma, type Prisma } from "@bookmystylo/db";
import { todayYmd, toMinutes } from "@bookmystylo/shared";

export const shopInclude = {
  locality: true,
  services: { include: { service: true } },
  staff: { include: { user: true, chair: true, leaves: true } },
  chairs: true,
} satisfies Prisma.ShopInclude;
export type ShopWithAll = Prisma.ShopGetPayload<{ include: typeof shopInclude }>;

export const toLocality = (l: { id: string; name: string; city: string; state: string }): LocalityDTO => ({ id: l.id, name: l.name, city: l.city, state: l.state });

export function toStylist(s: ShopWithAll["staff"][number], date = todayYmd()): StylistDTO {
  return {
    id: s.id, name: s.user.name, chairId: s.chair?.id ?? null, chairLabel: s.chair?.label ?? null, isAdmin: s.isAdmin,
    experienceYears: s.experienceYears, speciality: s.speciality, skills: csvToList(s.skills),
    ratingAvg: s.ratingAvg, ratingCount: s.ratingCount,
    onLeave: s.leaves.some((l) => date >= l.from && date <= l.to),
  };
}

function openNow(shop: ShopWithAll) {
  const now = new Date(); const mins = now.getHours() * 60 + now.getMinutes();
  const off = csvToList(shop.weeklyDaysOff).map(Number).includes(now.getDay());
  return !off && mins >= toMinutes(shop.opensAt) && mins < toMinutes(shop.closesAt);
}

export function toShopCard(shop: ShopWithAll): ShopCardDTO {
  const active = shop.services.filter((s) => s.service.active);
  const prices = active.map((s) => s.price);
  return {
    id: shop.id, name: shop.name, status: shop.status as ShopCardDTO["status"], locality: toLocality(shop.locality),
    stylistCount: shop.staff.filter((s) => s.chair).length, serviceCount: active.length,
    fromPrice: prices.length ? Math.min(...prices) : null, bookable: shop.status === "LIVE" && active.length > 0 && shop.staff.some((s) => s.chair),
    openNow: openNow(shop),
  };
}

export function toShop(shop: ShopWithAll, opts: { includePrivate?: boolean } = {}): ShopDTO {
  return {
    ...toShopCard(shop),
    upiId: shop.upiId, acceptsCash: shop.acceptsCash, autoApprove: shop.autoApprove, opensAt: shop.opensAt, closesAt: shop.closesAt,
    slotMinutes: shop.slotMinutes, weeklyDaysOff: csvToList(shop.weeklyDaysOff).map(Number),
    services: shop.services.filter((s) => opts.includePrivate || s.service.active).map((s) => ({ id: s.id, serviceId: s.serviceId, name: s.service.name, price: s.price })),
    stylists: shop.staff.map((s) => toStylist(s)),
    chairs: shop.chairs.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })).map((c) => ({ id: c.id, label: c.label, staffId: c.staffId })),
  };
}

export const bookingInclude = {
  shop: { include: { locality: true } }, customer: true, staff: { include: { user: true } }, chair: true, services: true, review: true,
} satisfies Prisma.BookingInclude;
export type BookingWithAll = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

export function toBooking(b: BookingWithAll): BookingDTO {
  const undoUntil = b.paymentStatus === "PAID" && b.paidVia === "UPI_CONFIRMED" && b.paidAt ? new Date(b.paidAt.getTime() + PAYMENT_UNDO_MINUTES * 60_000) : null;
  return {
    id: b.id,
    shop: { id: b.shop.id, name: b.shop.name, locality: `${b.shop.locality.name}, ${b.shop.locality.city}`, upiId: b.shop.upiId, acceptsCash: b.shop.acceptsCash },
    customer: { id: b.customer.id, name: b.customer.name, phone: b.customer.phone },
    stylist: { id: b.staff.id, name: b.staff.user.name }, chair: { id: b.chair.id, label: b.chair.label },
    date: b.date, startTime: b.startTime, endTime: b.endTime, status: b.status as BookingDTO["status"], amount: b.amount,
    paymentMethod: b.paymentMethod as BookingDTO["paymentMethod"], paymentStatus: b.paymentStatus as BookingDTO["paymentStatus"],
    paidAt: b.paidAt?.toISOString() ?? null, paidVia: b.paidVia,
    services: b.services.map((s) => ({ name: s.name, price: s.price })),
    review: b.review ? { id: b.review.id, stars: b.review.stars, tags: csvToList(b.review.tags), comment: b.review.comment, createdAt: b.review.createdAt.toISOString() } : null,
    createdAt: b.createdAt.toISOString(),
    canUndoPaymentUntil: undoUntil && undoUntil > new Date() ? undoUntil.toISOString() : null,
  };
}

export const ticketInclude = { customer: true, booking: { include: { shop: true } }, messages: { orderBy: { createdAt: "asc" } } } satisfies Prisma.TicketInclude;
export type TicketWithAll = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;
export function toTicket(t: TicketWithAll): TicketDTO {
  return {
    id: t.id, status: t.status as TicketDTO["status"], createdAt: t.createdAt.toISOString(),
    customer: { id: t.customer.id, name: t.customer.name, phone: t.customer.phone },
    booking: t.booking ? { id: t.booking.id, shopName: t.booking.shop.name, date: t.booking.date, startTime: t.booking.startTime } : null,
    messages: t.messages.map((m) => ({ id: m.id, sender: m.sender as "CUSTOMER" | "ADMIN", body: m.body, createdAt: m.createdAt.toISOString() })),
  };
}

export const loadShop = (id: string) => prisma.shop.findUnique({ where: { id }, include: shopInclude });
export const loadBooking = (id: string) => prisma.booking.findUnique({ where: { id }, include: bookingInclude });
