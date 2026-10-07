import { Router } from "express";
import { z } from "zod";
import { prisma } from "@bookmystylo/db";
import { listToCsv, normalizePhone, PAYMENT_UNDO_MINUTES, todayYmd } from "@bookmystylo/shared";
import { parse } from "../lib/validate";
import { bad, conflict, forbidden, notFound } from "../lib/errors";
import { partnerAdminContext, partnerContext, requireRole } from "../lib/auth";
import { bookingInclude, loadBooking, loadShop, toBooking, toShop, toStylist } from "../lib/serialize";

export const partnerRouter = Router();
partnerRouter.use(requireRole("PARTNER"));

// ---------------------------------------------------------------- registration wizard
partnerRouter.post("/register", async (req, res) => {
  const existing = await prisma.staff.findUnique({ where: { userId: req.user!.id } });
  if (existing) throw conflict("You already belong to a shop");
  const p = parse(z.object({
    shop: z.object({ name: z.string().trim().min(2).max(80), chairs: z.number().int().min(1).max(20), localityId: z.string() }),
    team: z.array(z.object({ name: z.string().trim().min(1), phone: z.string() })).default([]),
    services: z.array(z.object({ serviceId: z.string(), price: z.number().int().min(0) })).min(1),
    payment: z.object({ upiId: z.string().trim().nullable(), acceptsCash: z.boolean() }),
  }), req.body);
  const shop = await prisma.$transaction(async (tx) => {
    const shop = await tx.shop.create({ data: { name: p.shop.name, localityId: p.shop.localityId, upiId: p.payment.upiId || null, acceptsCash: p.payment.acceptsCash } });
    const chairs = [];
    for (let i = 1; i <= p.shop.chairs; i++) chairs.push(await tx.chair.create({ data: { shopId: shop.id, label: `Chair ${i}` } }));
    const admin = await tx.staff.create({ data: { userId: req.user!.id, shopId: shop.id, isAdmin: true } });
    await tx.chair.update({ where: { id: chairs[0]!.id }, data: { staffId: admin.id } });
    let ci = 1;
    for (const m of p.team) {
      const phone = normalizePhone(m.phone);
      if (phone.length !== 10 || phone === req.user!.phone) continue;
      let user = await tx.user.findUnique({ where: { phone } });
      if (user && user.role !== "PARTNER") throw bad(`${phone} is registered as a customer`);
      if (user && (await tx.staff.findUnique({ where: { userId: user.id } }))) throw bad(`${m.name} already belongs to another shop`);
      if (!user) user = await tx.user.create({ data: { phone, name: m.name, role: "PARTNER" } });
      const st = await tx.staff.create({ data: { userId: user.id, shopId: shop.id } });
      if (ci < chairs.length) await tx.chair.update({ where: { id: chairs[ci++]!.id }, data: { staffId: st.id } });
    }
    for (const s of p.services) await tx.shopService.create({ data: { shopId: shop.id, serviceId: s.serviceId, price: s.price } });
    return shop;
  });
  res.status(201).json(toShop((await loadShop(shop.id))!, { includePrivate: true }));
});

// ---------------------------------------------------------------- me / shop
partnerRouter.get("/me", async (req, res) => {
  const staff = await partnerContext(req);
  const shop = (await loadShop(staff.shopId))!;
  res.json({ user: req.user, staff: toStylist(shop.staff.find((s) => s.id === staff.id)!), shop: toShop(shop, { includePrivate: true }) });
});

partnerRouter.patch("/shop", async (req, res) => {
  const staff = await partnerAdminContext(req);
  const p = parse(z.object({
    autoApprove: z.boolean().optional(), opensAt: z.string().regex(/^\d{2}:\d{2}$/).optional(), closesAt: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    slotMinutes: z.number().int().min(10).max(120).optional(), weeklyDaysOff: z.array(z.number().int().min(0).max(6)).optional(),
    upiId: z.string().trim().nullable().optional(), acceptsCash: z.boolean().optional(), name: z.string().trim().min(2).optional(),
  }), req.body);
  await prisma.shop.update({ where: { id: staff.shopId }, data: { ...p, weeklyDaysOff: p.weeklyDaysOff ? p.weeklyDaysOff.join(",") : undefined } });
  res.json(toShop((await loadShop(staff.shopId))!, { includePrivate: true }));
});

partnerRouter.put("/shop/services", async (req, res) => {
  const staff = await partnerAdminContext(req);
  const { services } = parse(z.object({ services: z.array(z.object({ serviceId: z.string(), price: z.number().int().min(0) })) }), req.body);
  await prisma.$transaction(async (tx) => {
    await tx.shopService.deleteMany({ where: { shopId: staff.shopId, serviceId: { notIn: services.map((s) => s.serviceId) } } });
    for (const s of services) await tx.shopService.upsert({ where: { shopId_serviceId: { shopId: staff.shopId, serviceId: s.serviceId } }, create: { shopId: staff.shopId, ...s }, update: { price: s.price } });
  });
  res.json(toShop((await loadShop(staff.shopId))!, { includePrivate: true }));
});

// ---------------------------------------------------------------- bookings
partnerRouter.get("/bookings", async (req, res) => {
  const staff = await partnerContext(req);
  const { date, pending } = parse(z.object({ date: z.string().optional(), pending: z.string().optional() }), req.query);
  const where = pending === "1" ? { shopId: staff.shopId, status: "PENDING" } : { shopId: staff.shopId, date: date ?? todayYmd() };
  const list = await prisma.booking.findMany({ where, include: bookingInclude, orderBy: [{ date: "asc" }, { startTime: "asc" }] });
  res.json(list.map(toBooking));
});

const TRANSITIONS: Record<string, { from: string[]; to: string }> = {
  accept: { from: ["PENDING"], to: "ACCEPTED" }, reject: { from: ["PENDING"], to: "REJECTED" },
  start: { from: ["ACCEPTED"], to: "IN_SERVICE" }, complete: { from: ["IN_SERVICE", "ACCEPTED"], to: "COMPLETED" },
  "no-show": { from: ["ACCEPTED"], to: "NO_SHOW" },
};
partnerRouter.post("/bookings/:id/:action(accept|reject|start|complete|no-show)", async (req, res) => {
  const staff = await partnerContext(req);
  const b = await loadBooking(req.params.id);
  if (!b || b.shopId !== staff.shopId) throw notFound("Booking not found");
  if (!staff.isAdmin && b.staffId !== staff.id) throw forbidden("Not your booking");
  const t = TRANSITIONS[req.params.action]!;
  if (!t.from.includes(b.status)) throw conflict(`Can't ${req.params.action} a booking that is ${b.status.toLowerCase().replace("_", " ")}`);
  await prisma.booking.update({ where: { id: b.id }, data: { status: t.to } });
  res.json(toBooking((await loadBooking(b.id))!));
});

// ---- payment (shop-confirmed UPI flow + cash)
partnerRouter.post("/bookings/:id/payment/:action(collect-cash|confirm|not-received|undo|refund)", async (req, res) => {
  const staff = await partnerContext(req);
  const b = await loadBooking(req.params.id);
  if (!b || b.shopId !== staff.shopId) throw notFound("Booking not found");
  if (!staff.isAdmin && b.staffId !== staff.id) throw forbidden("Not your booking");
  const a = req.params.action;
  if (a === "collect-cash") {
    if (b.paymentStatus === "PAID") throw conflict("Already paid");
    await prisma.booking.update({ where: { id: b.id }, data: { paymentMethod: "CASH", paymentStatus: "PAID", paidAt: new Date(), paidVia: "CASH" } });
  } else if (a === "confirm") {
    if (b.paymentStatus === "PAID") throw conflict("Already paid");
    await prisma.booking.update({ where: { id: b.id }, data: { paymentMethod: "ONLINE", paymentStatus: "PAID", paidAt: new Date(), paidVia: "UPI_CONFIRMED" } });
  } else if (a === "not-received") {
    // Deliberately a no-op on the record: the customer keeps waiting; nothing is charged or cancelled.
  } else if (a === "undo") {
    if (b.paymentStatus !== "PAID" || !b.paidAt) throw conflict("Nothing to undo");
    if (Date.now() - b.paidAt.getTime() > PAYMENT_UNDO_MINUTES * 60_000) throw conflict(`Undo window (${PAYMENT_UNDO_MINUTES} min) has passed — use Refund`);
    await prisma.booking.update({ where: { id: b.id }, data: { paymentStatus: "UNPAID", paidAt: null, paidVia: null } });
  } else if (a === "refund") {
    if (b.paymentStatus !== "PAID") throw conflict("Only a paid booking can be refunded");
    await prisma.booking.update({ where: { id: b.id }, data: { paymentStatus: "REFUNDED" } });
  }
  res.json(toBooking((await loadBooking(b.id))!));
});

// ---------------------------------------------------------------- chairs & team (admin)
partnerRouter.post("/chairs", async (req, res) => {
  const staff = await partnerAdminContext(req);
  const n = await prisma.chair.count({ where: { shopId: staff.shopId } });
  await prisma.chair.create({ data: { shopId: staff.shopId, label: `Chair ${n + 1}` } });
  res.json(toShop((await loadShop(staff.shopId))!, { includePrivate: true }));
});
partnerRouter.delete("/chairs/:id", async (req, res) => {
  const staff = await partnerAdminContext(req);
  const c = await prisma.chair.findFirst({ where: { id: req.params.id, shopId: staff.shopId } });
  if (!c) throw notFound();
  const upcoming = await prisma.booking.count({ where: { chairId: c.id, status: { in: ["PENDING", "ACCEPTED", "IN_SERVICE"] } } });
  if (upcoming) throw conflict("This chair has upcoming bookings");
  await prisma.chair.delete({ where: { id: c.id } });
  res.json(toShop((await loadShop(staff.shopId))!, { includePrivate: true }));
});
partnerRouter.patch("/chairs/:id", async (req, res) => {
  const staff = await partnerAdminContext(req);
  const { staffId } = parse(z.object({ staffId: z.string().nullable() }), req.body);
  const c = await prisma.chair.findFirst({ where: { id: req.params.id, shopId: staff.shopId } });
  if (!c) throw notFound();
  await prisma.$transaction(async (tx) => {
    if (staffId) await tx.chair.updateMany({ where: { shopId: staff.shopId, staffId }, data: { staffId: null } });
    await tx.chair.update({ where: { id: c.id }, data: { staffId } });
  });
  res.json(toShop((await loadShop(staff.shopId))!, { includePrivate: true }));
});

partnerRouter.post("/staff", async (req, res) => {
  const staff = await partnerAdminContext(req);
  const { name, phone: raw } = parse(z.object({ name: z.string().trim().min(1), phone: z.string() }), req.body);
  const phone = normalizePhone(raw);
  if (phone.length !== 10) throw bad("Enter a 10-digit mobile number");
  let user = await prisma.user.findUnique({ where: { phone }, include: { staff: true } });
  if (user?.role === "CUSTOMER") throw bad("That number is registered as a customer");
  if (user?.staff) throw conflict("That person already belongs to a shop");
  if (!user) user = await prisma.user.create({ data: { phone, name, role: "PARTNER" }, include: { staff: true } });
  await prisma.staff.create({ data: { userId: user.id, shopId: staff.shopId } });
  res.json(toShop((await loadShop(staff.shopId))!, { includePrivate: true }));
});
partnerRouter.delete("/staff/:id", async (req, res) => {
  const staff = await partnerAdminContext(req);
  const s = await prisma.staff.findFirst({ where: { id: req.params.id, shopId: staff.shopId } });
  if (!s) throw notFound();
  if (s.isAdmin) throw conflict("The admin can't be removed");
  await prisma.$transaction([
    prisma.chair.updateMany({ where: { staffId: s.id }, data: { staffId: null } }),
    prisma.staff.delete({ where: { id: s.id } }),
  ]);
  res.json(toShop((await loadShop(staff.shopId))!, { includePrivate: true }));
});
// stylist profile: experience, speciality, skills (admin, or the stylist themself)
partnerRouter.patch("/staff/:id", async (req, res) => {
  const staff = await partnerContext(req);
  if (!staff.isAdmin && staff.id !== req.params.id) throw forbidden();
  const p = parse(z.object({ experienceYears: z.number().int().min(0).max(60).nullable().optional(), speciality: z.string().trim().max(160).nullable().optional(), skills: z.array(z.string().trim().min(1).max(30)).max(12).optional() }), req.body);
  const s = await prisma.staff.findFirst({ where: { id: req.params.id, shopId: staff.shopId } });
  if (!s) throw notFound();
  await prisma.staff.update({ where: { id: s.id }, data: { experienceYears: p.experienceYears, speciality: p.speciality, skills: p.skills ? listToCsv(p.skills) : undefined } });
  res.json(toShop((await loadShop(staff.shopId))!, { includePrivate: true }));
});

// ---------------------------------------------------------------- schedule: holidays & leave
partnerRouter.get("/schedule", async (req, res) => {
  const staff = await partnerContext(req);
  const [holidays, leaves] = await Promise.all([
    prisma.holiday.findMany({ where: { shopId: staff.shopId }, orderBy: { date: "asc" } }),
    prisma.leave.findMany({ where: { staff: { shopId: staff.shopId } }, include: { staff: { include: { user: true } } }, orderBy: { from: "asc" } }),
  ]);
  res.json({ holidays: holidays.map((h) => ({ id: h.id, date: h.date })), leaves: leaves.map((l) => ({ id: l.id, staffId: l.staffId, staffName: l.staff.user.name, from: l.from, to: l.to })) });
});
partnerRouter.post("/holidays", async (req, res) => {
  const staff = await partnerAdminContext(req);
  const { date } = parse(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }), req.body);
  await prisma.holiday.upsert({ where: { shopId_date: { shopId: staff.shopId, date } }, create: { shopId: staff.shopId, date }, update: {} });
  res.json({ ok: true });
});
partnerRouter.delete("/holidays/:id", async (req, res) => {
  const staff = await partnerAdminContext(req);
  await prisma.holiday.deleteMany({ where: { id: req.params.id, shopId: staff.shopId } });
  res.json({ ok: true });
});
partnerRouter.post("/leaves", async (req, res) => {
  const staff = await partnerContext(req);
  const { staffId, from, to } = parse(z.object({ staffId: z.string().optional(), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }), req.body);
  const target = staffId ?? staff.id;
  if (!staff.isAdmin && target !== staff.id) throw forbidden();
  const s = await prisma.staff.findFirst({ where: { id: target, shopId: staff.shopId } });
  if (!s) throw notFound();
  if (to < from) throw bad("Leave end must be after its start");
  await prisma.leave.create({ data: { staffId: target, from, to } });
  res.json({ ok: true });
});
partnerRouter.delete("/leaves/:id", async (req, res) => {
  const staff = await partnerContext(req);
  const l = await prisma.leave.findFirst({ where: { id: req.params.id, staff: { shopId: staff.shopId } } });
  if (!l) throw notFound();
  if (!staff.isAdmin && l.staffId !== staff.id) throw forbidden();
  await prisma.leave.delete({ where: { id: l.id } });
  res.json({ ok: true });
});

// ---------------------------------------------------------------- earnings
partnerRouter.get("/earnings", async (req, res) => {
  const staff = await partnerContext(req);
  const shop = (await loadShop(staff.shopId))!;
  const paid = await prisma.booking.findMany({ where: { shopId: staff.shopId, paymentStatus: "PAID" }, select: { staffId: true, amount: true } });
  const byStylist = shop.staff.map((s) => {
    const mine = paid.filter((p) => p.staffId === s.id);
    return { staffId: s.id, name: s.user.name, isAdmin: s.isAdmin, paidCount: mine.length, total: mine.reduce((a, p) => a + p.amount, 0), isMe: s.id === staff.id };
  }).sort((a, b) => b.total - a.total);
  res.json({ shopTotal: paid.reduce((a, p) => a + p.amount, 0), shopPaidCount: paid.length, teamSize: shop.staff.length, byStylist });
});
