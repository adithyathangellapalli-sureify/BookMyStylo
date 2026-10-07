import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "@bookmystylo/db";
import type { Role } from "@bookmystylo/shared";
import { env } from "../env";
import { forbidden, unauthorized } from "./errors";

export interface AuthUser { id: string; phone: string; name: string; role: Role }
declare global { namespace Express { interface Request { user?: AuthUser } } }

export const signSession = (u: AuthUser) => jwt.sign({ sub: u.id, role: u.role }, env.JWT_SECRET, { expiresIn: "30d" });
export const signSignup = (phone: string, role: Role) => jwt.sign({ phone, role, kind: "signup" }, env.JWT_SECRET, { expiresIn: "15m" });
export const verifySignup = (token: string): { phone: string; role: Role } => {
  const p = jwt.verify(token, env.JWT_SECRET) as { phone: string; role: Role; kind: string };
  if (p.kind !== "signup") throw unauthorized("Bad signup token");
  return { phone: p.phone, role: p.role };
};

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return next();
  try {
    const p = jwt.verify(h.slice(7), env.JWT_SECRET) as { sub: string };
    const u = await prisma.user.findUnique({ where: { id: p.sub } });
    if (u) req.user = { id: u.id, phone: u.phone, name: u.name, role: u.role as Role };
  } catch { /* invalid token: treat as anonymous */ }
  next();
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => (req.user ? next() : next(unauthorized()));
export const requireRole = (...roles: Role[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.role)) return next(forbidden());
  next();
};

/** Partner helper: the caller's staff record + shop. */
export async function partnerContext(req: Request) {
  if (!req.user) throw unauthorized();
  const staff = await prisma.staff.findUnique({ where: { userId: req.user.id }, include: { shop: true, chair: true } });
  if (!staff) throw forbidden("No shop yet — finish registration first");
  return staff;
}
export async function partnerAdminContext(req: Request) {
  const s = await partnerContext(req);
  if (!s.isAdmin) throw forbidden("Admin only");
  return s;
}
