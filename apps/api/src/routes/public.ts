import { Router } from "express";
import { z } from "zod";
import { prisma } from "@bookmystylo/db";
import { todayYmd } from "@bookmystylo/shared";
import { parse } from "../lib/validate";
import { notFound } from "../lib/errors";
import { loadShop, shopInclude, toShop, toShopCard } from "../lib/serialize";
import { availability } from "../lib/availability";

export const publicRouter = Router();

publicRouter.get("/localities", async (_req, res) => {
  const ls = await prisma.locality.findMany({ orderBy: [{ city: "asc" }, { name: "asc" }], include: { _count: { select: { shops: { where: { status: "LIVE" } } } } } });
  res.json(ls.map((l) => ({ id: l.id, name: l.name, city: l.city, state: l.state, shopCount: l._count.shops })));
});

publicRouter.get("/services", async (_req, res) => {
  res.json(await prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }));
});

publicRouter.get("/shops", async (req, res) => {
  const { localityId, available } = parse(z.object({ localityId: z.string().optional(), available: z.string().optional() }), req.query);
  const shops = await prisma.shop.findMany({
    where: { ...(localityId ? { localityId } : {}), status: { in: ["LIVE", "PENDING"] } },
    include: shopInclude, orderBy: [{ status: "asc" }, { name: "asc" }],
  });
  let cards = shops.map(toShopCard).sort((a, b) => Number(b.bookable) - Number(a.bookable));
  if (available === "1") cards = cards.filter((c) => c.bookable && c.openNow);
  res.json(cards);
});

publicRouter.get("/shops/:id", async (req, res) => {
  const shop = await loadShop(req.params.id);
  if (!shop) throw notFound("Shop not found");
  res.json(toShop(shop));
});

publicRouter.get("/shops/:id/availability", async (req, res) => {
  const { date } = parse(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(todayYmd()) }), req.query);
  const shop = await loadShop(req.params.id);
  if (!shop) throw notFound("Shop not found");
  res.json(await availability(shop, date, req.user?.id ?? null));
});
