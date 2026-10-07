import { Router } from "express";
import { z } from "zod";
import { prisma } from "@bookmystylo/db";
import { normalizePhone, OTP_TTL_MINUTES, type Role } from "@bookmystylo/shared";
import { env } from "../env";
import { parse } from "../lib/validate";
import { bad, forbidden, notFound } from "../lib/errors";
import { requireAuth, signSession, signSignup, verifySignup } from "../lib/auth";

export const authRouter = Router();
const appSchema = z.enum(["customer", "partner"]);
const roleForApp = (app: "customer" | "partner"): Role => (app === "customer" ? "CUSTOMER" : "PARTNER");
const roleFitsApp = (role: string, app: "customer" | "partner") => (app === "customer" ? role === "CUSTOMER" : role === "PARTNER" || role === "SUPER_ADMIN");

authRouter.post("/otp/send", async (req, res) => {
  const { phone: raw, app } = parse(z.object({ phone: z.string(), app: appSchema }), req.body);
  const phone = normalizePhone(raw);
  if (phone.length !== 10) throw bad("Enter a 10-digit mobile number");
  const user = await prisma.user.findUnique({ where: { phone } });
  if (user && !roleFitsApp(user.role, app)) throw forbidden(app === "customer" ? "This number belongs to a partner account — use the Partner app." : "This number belongs to a customer account.");
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.otpCode.deleteMany({ where: { phone } });
  await prisma.otpCode.create({ data: { phone, code, expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000) } });
  // TODO(prod): send via SMS provider. In dev the code is returned so the UI can show it.
  res.json({ ok: true, phone, exists: !!user, devCode: env.OTP_DEV_REVEAL ? code : undefined });
});

authRouter.post("/otp/verify", async (req, res) => {
  const { phone: raw, code, app } = parse(z.object({ phone: z.string(), code: z.string().length(6), app: appSchema }), req.body);
  const phone = normalizePhone(raw);
  const otp = await prisma.otpCode.findFirst({ where: { phone, code, expiresAt: { gt: new Date() } } });
  if (!otp) throw bad("That code didn't match or has expired");
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return res.json({ needsSignup: true, signupToken: signSignup(phone, roleForApp(app)) });
  if (!roleFitsApp(user.role, app)) throw forbidden("This number is registered for the other app");
  await prisma.otpCode.delete({ where: { id: otp.id } });
  const session = { id: user.id, phone: user.phone, name: user.name, role: user.role as Role };
  res.json({ token: signSession(session), user: session });
});

authRouter.post("/signup", async (req, res) => {
  const { signupToken, name } = parse(z.object({ signupToken: z.string(), name: z.string().trim().min(2).max(60) }), req.body);
  const { phone, role } = verifySignup(signupToken);
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw bad("An account already exists for this number — log in instead");
  const user = await prisma.user.create({ data: { phone, name, role } });
  await prisma.otpCode.deleteMany({ where: { phone } });
  const session = { id: user.id, phone: user.phone, name: user.name, role: user.role as Role };
  res.json({ token: signSession(session), user: session });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { staff: { include: { shop: true } } } });
  if (!u) throw notFound();
  const bookingCount = u.role === "CUSTOMER" ? await prisma.booking.count({ where: { customerId: u.id } }) : 0;
  const upcoming = u.role === "CUSTOMER" ? await prisma.booking.count({ where: { customerId: u.id, status: { in: ["PENDING", "ACCEPTED", "IN_SERVICE"] } } }) : 0;
  res.json({ user: req.user, hasShop: !!u.staff, shopStatus: u.staff?.shop.status ?? null, bookingCount, upcoming });
});
