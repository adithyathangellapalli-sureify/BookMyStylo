import { prisma } from "@bookmystylo/db";
import { csvToList, slotTimes, todayYmd, toMinutes, weekday, type AvailabilityDTO, type SlotDTO } from "@bookmystylo/shared";
import type { ShopWithAll } from "./serialize";

const ACTIVE = ["PENDING", "ACCEPTED", "IN_SERVICE"];

export async function purgeExpiredHolds() {
  await prisma.hold.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

export async function availability(shop: ShopWithAll, date: string, viewerId: string | null): Promise<AvailabilityDTO> {
  await purgeExpiredHolds();
  const daysOff = csvToList(shop.weeklyDaysOff).map(Number);
  if (daysOff.includes(weekday(date))) return { date, closed: true, reason: "Weekly day off", stylists: [] };
  const holiday = await prisma.holiday.findUnique({ where: { shopId_date: { shopId: shop.id, date } } });
  if (holiday) return { date, closed: true, reason: "Closed for a holiday", stylists: [] };

  const [bookings, holds] = await Promise.all([
    prisma.booking.findMany({ where: { shopId: shop.id, date, status: { in: ACTIVE } }, select: { staffId: true, startTime: true } }),
    prisma.hold.findMany({ where: { shopId: shop.id, date }, select: { id: true, staffId: true, startTime: true, customerId: true } }),
  ]);
  const isToday = date === todayYmd();
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  const times = slotTimes(shop.opensAt, shop.closesAt, shop.slotMinutes);

  const stylists = shop.staff.filter((s) => s.chair).map((s) => {
    const onLeave = s.leaves.some((l) => date >= l.from && date <= l.to);
    const slots: SlotDTO[] = times.map((time) => {
      if (onLeave) return { time, state: "leave" };
      if (isToday && toMinutes(time) <= nowMins) return { time, state: "past" };
      if (bookings.some((b) => b.staffId === s.id && b.startTime === time)) return { time, state: "booked" };
      const h = holds.find((h) => h.staffId === s.id && h.startTime === time);
      if (h) return viewerId && h.customerId === viewerId ? { time, state: "mine", holdId: h.id } : { time, state: "held" };
      return { time, state: "open" };
    });
    return { staffId: s.id, onLeave, slots };
  });
  return { date, closed: false, stylists };
}
