import { Router } from "express";
import { z } from "zod";
import { prisma } from "@bookmystylo/db";
import { HOLD_MINUTES, listToCsv, REVIEW_TAGS, toHHMM, toMinutes } from "@bookmystylo/shared";
import { parse } from "../lib/validate";
import { bad, conflict, forbidden, notFound } from "../lib/errors";
import { requireRole } from "../lib/auth";
import { availability } from "../lib/availability";
import { bookingInclude, loadBooking, loadShop, ticketInclude, toBooking, toTicket } from "../lib/serialize";

export const customerRouter = Router();
customerRouter.use(requireRole("CUSTOMER"));

// ---------------------------------------------------------------- holds
customerRouter.post("/holds", async (req, res) => {
  const { shopId, staffId, date, time } = parse(z.object({ shopId: z.string(), staffId: z.string().nullable().optional(), date: z.string(), time: z.string() }), req.body);
  const shop = await loadShop(shopId);
  if (!shop || shop.status !== "LIVE") throw notFound("Shop is not bookable");
  const av = await availability(shop, date, req.user!.id);
  if (av.closed) throw conflict(av.reason ?? "Closed that day");
  const candidates = av.stylists.filter((s) => (staffId ? s.staffId === staffId : true));
  const pick = candidates.find((s) => s.slots.some((sl) => sl.time === time && (sl.state === "open" || sl.state === "mine")));
  if (!pick) throw conflict("That time was just taken — pick another slot");
  const staff = shop.staff.find((s) => s.id === pick.staffId)!;
  await prisma.hold.deleteMany({ where: { customerId: req.user!.id } });
  const hold = await prisma.hold.create({
    data: { shopId, chairId: staff.chair!.id, staffId: staff.id, customerId: req.user!.id, date, startTime: time, expiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000) },
  });
  res.json({ id: hold.id, shopId, staffId: staff.id, chairId: staff.chair!.id, date, startTime: time, expiresAt: hold.expiresAt.toISOString() });
});
customerRouter.get("/holds/current", async (req, res) => {
  await prisma.hold.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const h = await prisma.hold.findFirst({ where: { customerId: req.user!.id }, orderBy: { createdAt: "desc" } });
  res.json(h ? { id: h.id, shopId: h.shopId, staffId: h.staffId, chairId: h.chairId, date: h.date, startTime: h.startTime, expiresAt: h.expiresAt.toISOString() } : null);
});
customerRouter.delete("/holds/:id", async (req, res) => {
  await prisma.hold.deleteMany({ where: { id: req.params.id, customerId: req.user!.id } });
  res.json({ ok: true });
});

// ---------------------------------------------------------------- bookings
customerRouter.post("/bookings", async (req, res) => {
  const { holdId, shopServiceIds } = parse(z.object({ holdId: z.string(), shopServiceIds: z.array(z.string()).min(1) }), req.body);
  const hold = await prisma.hold.findUnique({ where: { id: holdId } });
  if (!hold || hold.customerId !== req.user!.id) throw notFound("Hold not found");
  if (hold.expiresAt < new Date()) { await prisma.hold.delete({ where: { id: hold.id } }); throw conflict("Your held time expired — pick a slot again"); }
  const shop = await loadShop(hold.shopId);
  if (!shop) throw notFound();
  const lines = shop.services.filter((s) => shopServiceIds.includes(s.id) && s.service.active);
  if (lines.length !== shopServiceIds.length) throw bad("One of the services isn't available");
  const clash = await prisma.booking.findFirst({ where: { staffId: hold.staffId, date: hold.date, startTime: hold.startTime, status: { in: ["PENDING", "ACCEPTED", "IN_SERVICE"] } } });
  if (clash) throw conflict("That slot was just booked");
  const booking = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.create({
      data: {
        shopId: shop.id, customerId: req.user!.id, chairId: hold.chairId, staffId: hold.staffId, date: hold.date, startTime: hold.startTime,
        endTime: toHHMM(toMinutes(hold.startTime) + shop.slotMinutes), status: shop.autoApprove ? "ACCEPTED" : "PENDING",
        amount: lines.reduce((a, l) => a + l.price, 0), services: { create: lines.map((l) => ({ name: l.service.name, price: l.price })) },
      }, include: bookingInclude,
    });
    await tx.hold.delete({ where: { id: hold.id } });
    return b;
  });
  res.status(201).json(toBooking(booking));
});

customerRouter.get("/bookings", async (req, res) => {
  const list = await prisma.booking.findMany({ where: { customerId: req.user!.id }, include: bookingInclude, orderBy: [{ date: "desc" }, { startTime: "desc" }] });
  res.json(list.map(toBooking));
});

async function ownBooking(req: { user?: { id: string } ; params: { id: string } }) {
  const b = await loadBooking(req.params.id);
  if (!b) throw notFound("Booking not found");
  if (b.customerId !== req.user!.id) throw forbidden();
  return b;
}
customerRouter.get("/bookings/:id", async (req, res) => res.json(toBooking(await ownBooking(req))));

customerRouter.post("/bookings/:id/cancel", async (req, res) => {
  const b = await ownBooking(req);
  if (!["PENDING", "ACCEPTED"].includes(b.status)) throw conflict("This booking can't be cancelled now");
  await prisma.booking.update({ where: { id: b.id }, data: { status: "CANCELLED" } });
  res.json(toBooking((await loadBooking(b.id))!));
});

// Customer picks how to pay. ONLINE flips the partner row to "Paying online"; the shop confirms receipt.
customerRouter.post("/bookings/:id/payment/method", async (req, res) => {
  const { method } = parse(z.object({ method: z.enum(["CASH", "ONLINE"]) }), req.body);
  const b = await ownBooking(req);
  if (b.paymentStatus === "PAID") throw conflict("Already paid");
  if (!["ACCEPTED", "IN_SERVICE", "COMPLETED"].includes(b.status)) throw conflict("Payment starts once the saloon accepts");
  if (method === "ONLINE" && !b.shop.upiId) throw conflict("This saloon only takes cash");
  await prisma.booking.update({ where: { id: b.id }, data: { paymentMethod: method } });
  res.json(toBooking((await loadBooking(b.id))!));
});

// ---------------------------------------------------------------- reviews
customerRouter.post("/bookings/:id/review", async (req, res) => {
  const { stars, tags, comment } = parse(z.object({ stars: z.number().int().min(1).max(5), tags: z.array(z.enum(REVIEW_TAGS)).default([]), comment: z.string().trim().max(500).optional() }), req.body);
  const b = await ownBooking(req);
  if (b.status !== "COMPLETED") throw conflict("You can rate a visit once it's completed");
  await prisma.$transaction(async (tx) => {
    await tx.review.upsert({
      where: { bookingId: b.id },
      create: { bookingId: b.id, staffId: b.staffId, customerId: req.user!.id, stars, tags: listToCsv(tags), comment: comment || null },
      update: { stars, tags: listToCsv(tags), comment: comment || null },
    });
    const agg = await tx.review.aggregate({ where: { staffId: b.staffId }, _avg: { stars: true }, _count: { _all: true } });
    await tx.staff.update({ where: { id: b.staffId }, data: { ratingAvg: Math.round((agg._avg.stars ?? 0) * 10) / 10, ratingCount: agg._count._all } });
  });
  const staff = await prisma.staff.findUnique({ where: { id: b.staffId } });
  res.json({ booking: toBooking((await loadBooking(b.id))!), stylistRating: { avg: staff!.ratingAvg, count: staff!.ratingCount } });
});

// ---------------------------------------------------------------- support
customerRouter.get("/support/ticket", async (req, res) => {
  const t = await prisma.ticket.findFirst({ where: { customerId: req.user!.id, status: "OPEN" }, include: ticketInclude, orderBy: { createdAt: "desc" } });
  res.json(t ? toTicket(t) : null);
});
customerRouter.get("/support/tickets", async (req, res) => {
  const ts = await prisma.ticket.findMany({ where: { customerId: req.user!.id }, include: ticketInclude, orderBy: { createdAt: "desc" } });
  res.json(ts.map(toTicket));
});
customerRouter.post("/support/messages", async (req, res) => {
  const { body, bookingId } = parse(z.object({ body: z.string().trim().min(1).max(1000), bookingId: z.string().optional() }), req.body);
  let t = await prisma.ticket.findFirst({ where: { customerId: req.user!.id, status: "OPEN" } });
  if (!t) t = await prisma.ticket.create({ data: { customerId: req.user!.id, bookingId: bookingId ?? null } });
  await prisma.ticketMessage.create({ data: { ticketId: t.id, sender: "CUSTOMER", body } });
  await prisma.ticket.update({ where: { id: t.id }, data: { updatedAt: new Date() } });
  res.json(toTicket((await prisma.ticket.findUnique({ where: { id: t.id }, include: ticketInclude }))!));
});
