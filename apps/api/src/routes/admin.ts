import { Router } from "express";
import { z } from "zod";
import { prisma } from "@bookmystylo/db";
import { parse } from "../lib/validate";
import { conflict, notFound } from "../lib/errors";
import { requireRole } from "../lib/auth";
import { shopInclude, ticketInclude, toLocality, toShopCard, toTicket } from "../lib/serialize";

export const adminRouter = Router();
adminRouter.use(requireRole("SUPER_ADMIN"));

adminRouter.get("/stats", async (_req, res) => {
  const [totalShops, liveShops, pendingShops, suspendedShops, services, activeServices, localities, openTickets] = await Promise.all([
    prisma.shop.count(), prisma.shop.count({ where: { status: "LIVE" } }), prisma.shop.count({ where: { status: "PENDING" } }), prisma.shop.count({ where: { status: "SUSPENDED" } }),
    prisma.service.count(), prisma.service.count({ where: { active: true } }), prisma.locality.count(), prisma.ticket.count({ where: { status: "OPEN" } }),
  ]);
  res.json({ totalShops, liveShops, pendingShops, suspendedShops, services, activeServices, localities, openTickets });
});

adminRouter.get("/shops", async (req, res) => {
  const { status, q, page, pageSize } = parse(z.object({ status: z.enum(["PENDING", "LIVE", "SUSPENDED"]).optional(), q: z.string().optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(10) }), req.query);
  const where = { ...(status ? { status } : {}), ...(q ? { OR: [{ name: { contains: q } }, { locality: { name: { contains: q } } }] } : {}) };
  const [total, items] = await Promise.all([
    prisma.shop.count({ where }),
    prisma.shop.findMany({ where, include: shopInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
  ]);
  res.json({ items: items.map(toShopCard), total, page, pageSize });
});
adminRouter.post("/shops/:id/:action(approve|suspend|reinstate)", async (req, res) => {
  const shop = await prisma.shop.findUnique({ where: { id: req.params.id } });
  if (!shop) throw notFound();
  const to = req.params.action === "suspend" ? "SUSPENDED" : "LIVE";
  if (shop.status === to) throw conflict(`Shop is already ${to.toLowerCase()}`);
  await prisma.shop.update({ where: { id: shop.id }, data: { status: to } });
  res.json(toShopCard((await prisma.shop.findUnique({ where: { id: shop.id }, include: shopInclude }))!));
});

// ---- services catalog
adminRouter.get("/services", async (_req, res) => res.json(await prisma.service.findMany({ orderBy: { name: "asc" } })));
adminRouter.post("/services", async (req, res) => {
  const { name } = parse(z.object({ name: z.string().trim().min(2).max(40) }), req.body);
  const s = await prisma.service.upsert({ where: { name }, create: { name, active: true }, update: {} });
  res.status(201).json(s);
});
adminRouter.put("/services", async (req, res) => {
  const { services } = parse(z.object({ services: z.array(z.object({ id: z.string(), active: z.boolean() })) }), req.body);
  await prisma.$transaction(services.map((s) => prisma.service.update({ where: { id: s.id }, data: { active: s.active } })));
  res.json(await prisma.service.findMany({ orderBy: { name: "asc" } }));
});

// ---- localities
adminRouter.get("/localities", async (_req, res) => {
  const ls = await prisma.locality.findMany({ orderBy: [{ city: "asc" }, { name: "asc" }], include: { _count: { select: { shops: true } } } });
  res.json(ls.map((l) => ({ ...toLocality(l), shopCount: l._count.shops })));
});
adminRouter.post("/localities", async (req, res) => {
  const p = parse(z.object({ name: z.string().trim().min(2), city: z.string().trim().min(2), state: z.string().trim().min(2) }), req.body);
  const l = await prisma.locality.upsert({ where: { name_city: { name: p.name, city: p.city } }, create: p, update: { state: p.state } });
  res.status(201).json(toLocality(l));
});
adminRouter.delete("/localities/:id", async (req, res) => {
  const n = await prisma.shop.count({ where: { localityId: req.params.id } });
  if (n) throw conflict("Localities with shops can't be deleted");
  await prisma.locality.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ---- support
adminRouter.get("/tickets", async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(["OPEN", "RESOLVED", "ALL"]).default("OPEN") }), req.query);
  const ts = await prisma.ticket.findMany({ where: status === "ALL" ? {} : { status }, include: ticketInclude, orderBy: { updatedAt: "desc" } });
  res.json(ts.map(toTicket));
});
adminRouter.post("/tickets/:id/messages", async (req, res) => {
  const { body } = parse(z.object({ body: z.string().trim().min(1).max(1000) }), req.body);
  const t = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!t) throw notFound();
  await prisma.ticketMessage.create({ data: { ticketId: t.id, sender: "ADMIN", body } });
  await prisma.ticket.update({ where: { id: t.id }, data: { updatedAt: new Date() } });
  res.json(toTicket((await prisma.ticket.findUnique({ where: { id: t.id }, include: ticketInclude }))!));
});
adminRouter.post("/tickets/:id/:action(resolve|reopen)", async (req, res) => {
  const t = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!t) throw notFound();
  await prisma.ticket.update({ where: { id: t.id }, data: { status: req.params.action === "resolve" ? "RESOLVED" : "OPEN" } });
  res.json(toTicket((await prisma.ticket.findUnique({ where: { id: t.id }, include: ticketInclude }))!));
});
