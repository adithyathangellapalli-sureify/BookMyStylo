/* Seed: the demo world shown in the recovered design gallery.
   Run: pnpm db:seed  (or pnpm db:reset to wipe + reseed) */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const today = new Date();
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return ymd(d); };

async function main() {
  // wipe (order matters for FKs)
  await prisma.ticketMessage.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.review.deleteMany();
  await prisma.bookingService.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.hold.deleteMany();
  await prisma.leave.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.chair.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.shopService.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.service.deleteMany();
  await prisma.locality.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();

  // ---- localities
  const locNames = ["Indiranagar", "Koramangala", "HSR Layout", "Jayanagar", "Whitefield", "Malleshwaram"];
  const localities: Record<string, { id: string }> = {};
  for (const name of locNames) {
    localities[name] = await prisma.locality.create({ data: { name, city: "Bengaluru", state: "Karnataka" } });
  }

  // ---- services catalog (11 total, 9 active)
  const catalog: [string, boolean][] = [
    ["Haircut", true], ["Beard trim", true], ["Hair colour", true], ["Head massage", true],
    ["Shave", true], ["Kids cut", false], ["Facial", true], ["Hair spa", false],
    ["Threading", true], ["Hair wash", true], ["Waxing", true],
  ];
  const services: Record<string, { id: string }> = {};
  for (const [name, active] of catalog) services[name] = await prisma.service.create({ data: { name, active } });

  // ---- users
  const superAdmin = await prisma.user.create({ data: { phone: "9000000000", name: "Platform Admin", role: "SUPER_ADMIN" } });
  const priya = await prisma.user.create({ data: { phone: "9876543210", name: "Priya Nair", role: "CUSTOMER" } });
  const arjunRao = await prisma.user.create({ data: { phone: "9811122334", name: "Arjun Rao", role: "CUSTOMER" } });

  // ---- helper to create a shop with team + chairs + prices
  type Member = { name: string; phone: string; admin?: boolean; chair?: number; exp?: number; spec?: string; skills?: string[]; rating?: [number, number] };
  async function makeShop(opts: {
    name: string; locality: string; status: string; upi?: string; autoApprove?: boolean;
    chairs: number; team: Member[]; prices: Record<string, number>; daysOff?: string;
  }) {
    const shop = await prisma.shop.create({
      data: {
        name: opts.name, localityId: localities[opts.locality].id, status: opts.status,
        upiId: opts.upi ?? null, autoApprove: opts.autoApprove ?? false, weeklyDaysOff: opts.daysOff ?? "0",
      },
    });
    const chairs: { id: string }[] = [];
    for (let i = 1; i <= opts.chairs; i++) chairs.push(await prisma.chair.create({ data: { shopId: shop.id, label: `Chair ${i}` } }));
    const staffByName: Record<string, { id: string }> = {};
    for (const m of opts.team) {
      const user = await prisma.user.create({ data: { phone: m.phone, name: m.name, role: "PARTNER" } });
      const staff = await prisma.staff.create({
        data: {
          userId: user.id, shopId: shop.id, isAdmin: !!m.admin, experienceYears: m.exp ?? null,
          speciality: m.spec ?? null, skills: (m.skills ?? []).join(","),
          ratingAvg: m.rating?.[0] ?? 0, ratingCount: m.rating?.[1] ?? 0,
        },
      });
      staffByName[m.name] = staff;
      if (m.chair) await prisma.chair.update({ where: { id: chairs[m.chair - 1].id }, data: { staffId: staff.id } });
    }
    for (const [svc, price] of Object.entries(opts.prices)) {
      await prisma.shopService.create({ data: { shopId: shop.id, serviceId: services[svc].id, price } });
    }
    return { shop, chairs, staff: staffByName };
  }

  const demo = await makeShop({
    name: "Demo Cuts", locality: "Indiranagar", status: "LIVE", upi: "democuts@okaxis", chairs: 3,
    team: [
      { name: "Ravi Kumar", phone: "9990000001", admin: true, chair: 1, exp: 12, spec: "Classic cuts & hot-towel shaves", skills: ["Classic cut", "Shave", "Beard"], rating: [4.8, 131] },
      { name: "Sam", phone: "9990000002", chair: 2, exp: 8, spec: "Skin fades & sharp beard sculpting — precise, quick, great with classic cuts.", skills: ["Fades", "Beard", "Classic cut"], rating: [4.9, 214] },
      { name: "Priya", phone: "9990000003", chair: 3, exp: 6, spec: "Colour & balayage specialist", skills: ["Colour", "Balayage", "Hair spa"], rating: [4.7, 88] },
    ],
    prices: { Haircut: 300, "Beard trim": 150, "Head massage": 250, "Hair colour": 1200 },
  });
  await prisma.holiday.createMany({ data: [{ shopId: demo.shop.id, date: addDays(20) }, { shopId: demo.shop.id, date: addDays(45) }] });
  await prisma.leave.create({ data: { staffId: demo.staff["Priya"].id, from: addDays(2), to: addDays(4) } });

  const gents = await makeShop({
    name: "The Gentleman's Cut", locality: "Indiranagar", status: "LIVE", upi: "gentlemanscut@okaxis", chairs: 2,
    team: [
      { name: "Imran Shaikh", phone: "9990000011", admin: true, chair: 1, exp: 10, spec: "Fades, tapers and beard design", skills: ["Fades", "Beard", "Taper"], rating: [4.9, 302] },
      { name: "Kiran", phone: "9990000012", chair: 2, exp: 3, spec: "Textured crops & kids' cuts", skills: ["Textured", "Scissor cut", "Kids"], rating: [4.8, 98] },
    ],
    prices: { Haircut: 200, "Beard trim": 100, "Hair colour": 1200 },
  });

  await makeShop({
    name: "Fade Factory", locality: "Indiranagar", status: "PENDING", chairs: 4,
    team: [
      { name: "Arjun Mehta", phone: "9990000021", admin: true, chair: 1, exp: 5 },
      { name: "Dev", phone: "9990000022", chair: 2 }, { name: "Rohan", phone: "9990000023", chair: 3 }, { name: "Zaid", phone: "9990000024", chair: 4 },
    ],
    prices: { Haircut: 250, "Beard trim": 120 },
  });
  await makeShop({ name: "Sharp & Co.", locality: "Koramangala", status: "PENDING", chairs: 2, team: [{ name: "Nikhil Sharma", phone: "9990000031", admin: true, chair: 1 }], prices: { Haircut: 350 } });
  await makeShop({ name: "Curl & Co.", locality: "HSR Layout", status: "PENDING", chairs: 3, team: [{ name: "Anjali Rao", phone: "9990000041", admin: true, chair: 1 }], prices: { Haircut: 400, "Hair colour": 1500 } });
  await makeShop({ name: "Blade Runners", locality: "Whitefield", status: "PENDING", chairs: 2, team: [{ name: "Vikram S", phone: "9990000051", admin: true, chair: 1 }], prices: { Haircut: 300 } });
  await makeShop({ name: "Scissor Sisters", locality: "Malleshwaram", status: "SUSPENDED", chairs: 2, team: [{ name: "Meera Iyer", phone: "9990000061", admin: true, chair: 1 }], prices: { Haircut: 350, Threading: 80 } });

  // filler live shops so the console shows a fleet
  const fillers: [string, string][] = [
    ["Kanaka Studio", "Koramangala"], ["Royal Hair Cutting", "Jayanagar"], ["Sharma Hair Studio", "Malleshwaram"],
    ["Urban Edge", "Whitefield"], ["Looks Unisex Salon", "HSR Layout"], ["Blush & Blow", "Koramangala"],
    ["Mane Street", "Jayanagar"], ["Clipper Club", "Whitefield"], ["Salon Nova", "Malleshwaram"],
    ["Trim Lab", "HSR Layout"], ["Glow Studio", "Koramangala"], ["Barber Bros", "Whitefield"],
    ["Hair Affair", "Jayanagar"], ["Style Street", "Malleshwaram"], ["Shear Genius", "HSR Layout"], ["Crown & Comb", "Koramangala"],
  ];
  let n = 100;
  for (const [name, loc] of fillers) {
    n++;
    await makeShop({ name, locality: loc, status: "LIVE", upi: `${name.toLowerCase().replace(/[^a-z]/g, "")}@okaxis`, chairs: 2,
      team: [{ name: `${name.split(" ")[0]} Owner`, phone: `99900${String(n).padStart(5, "0")}`, admin: true, chair: 1, exp: 4, rating: [4.5, 20] }],
      prices: { Haircut: 250 + (n % 4) * 50, "Beard trim": 120 } });
  }

  // ---- bookings for Priya Nair
  const mkBooking = (data: Parameters<typeof prisma.booking.create>[0]["data"]) => prisma.booking.create({ data });
  const svcLine = (name: string, price: number) => ({ create: [{ name, price }] });

  // today, accepted, cash
  await mkBooking({
    shopId: demo.shop.id, customerId: priya.id, chairId: demo.chairs[1].id, staffId: demo.staff["Sam"].id,
    date: addDays(0), startTime: "11:00", endTime: "11:30", status: "ACCEPTED", amount: 300, services: svcLine("Haircut", 300),
  });
  // +1 day, pending at Gentleman's
  await mkBooking({
    shopId: gents.shop.id, customerId: priya.id, chairId: gents.chairs[0].id, staffId: gents.staff["Imran Shaikh"].id,
    date: addDays(1), startTime: "16:30", endTime: "17:00", status: "PENDING", amount: 300,
    services: { create: [{ name: "Haircut", price: 200 }, { name: "Beard trim", price: 100 }] },
  });
  // past completed + paid online + reviewed
  const past = await mkBooking({
    shopId: demo.shop.id, customerId: priya.id, chairId: demo.chairs[1].id, staffId: demo.staff["Sam"].id,
    date: addDays(-8), startTime: "10:30", endTime: "11:00", status: "COMPLETED", amount: 550,
    paymentMethod: "ONLINE", paymentStatus: "PAID", paidAt: new Date(Date.now() - 8 * 864e5), paidVia: "UPI_CONFIRMED",
    services: { create: [{ name: "Haircut", price: 300 }, { name: "Head massage", price: 250 }] },
  });
  await prisma.review.create({ data: { bookingId: past.id, staffId: demo.staff["Sam"].id, customerId: priya.id, stars: 4, tags: "Fades,On time", comment: "Cleanest fade I've had in ages — in and out in 20 minutes." } });
  // past cancelled
  await mkBooking({
    shopId: gents.shop.id, customerId: priya.id, chairId: gents.chairs[1].id, staffId: gents.staff["Kiran"].id,
    date: addDays(-17), startTime: "18:00", endTime: "18:30", status: "CANCELLED", amount: 200, services: svcLine("Haircut", 200),
  });
  // earnings history for Demo Cuts (completed + paid)
  const hist: [string, number, number, string][] = [
    ["Ravi Kumar", -1, 300, "CASH"], ["Ravi Kumar", -2, 450, "CASH"], ["Ravi Kumar", -3, 1200, "ONLINE"], ["Ravi Kumar", -5, 300, "CASH"],
    ["Sam", -1, 300, "ONLINE"], ["Sam", -4, 450, "CASH"], ["Sam", -6, 300, "CASH"],
    ["Priya", -2, 1200, "ONLINE"], ["Priya", -9, 1200, "CASH"],
  ];
  for (const [who, d, amt, method] of hist) {
    const st = demo.staff[who]; const chair = await prisma.chair.findFirst({ where: { staffId: st.id } });
    await mkBooking({
      shopId: demo.shop.id, customerId: arjunRao.id, chairId: chair!.id, staffId: st.id, date: addDays(d), startTime: "12:00", endTime: "12:30",
      status: "COMPLETED", amount: amt, paymentMethod: method, paymentStatus: "PAID", paidAt: new Date(Date.now() + d * 864e5), paidVia: method === "CASH" ? "CASH" : "UPI_CONFIRMED",
      services: svcLine(amt === 1200 ? "Hair colour" : amt === 450 ? "Haircut + Beard trim" : "Haircut", amt),
    });
  }
  // today's live schedule at Demo Cuts (other customers)
  await mkBooking({ shopId: demo.shop.id, customerId: arjunRao.id, chairId: demo.chairs[0].id, staffId: demo.staff["Ravi Kumar"].id, date: addDays(0), startTime: "10:00", endTime: "10:30", status: "IN_SERVICE", amount: 300, services: svcLine("Haircut", 300) });
  await mkBooking({ shopId: demo.shop.id, customerId: arjunRao.id, chairId: demo.chairs[2].id, staffId: demo.staff["Priya"].id, date: addDays(0), startTime: "09:00", endTime: "09:30", status: "COMPLETED", amount: 300, paymentStatus: "PAID", paidAt: new Date(), paidVia: "CASH", services: svcLine("Haircut", 300) });
  await mkBooking({ shopId: demo.shop.id, customerId: arjunRao.id, chairId: demo.chairs[0].id, staffId: demo.staff["Ravi Kumar"].id, date: addDays(0), startTime: "13:30", endTime: "14:00", status: "PENDING", amount: 1200, services: svcLine("Hair colour", 1200) });

  // ---- support tickets
  const t1 = await prisma.ticket.create({ data: { customerId: priya.id, bookingId: past.id, status: "OPEN" } });
  await prisma.ticketMessage.createMany({ data: [
    { ticketId: t1.id, sender: "CUSTOMER", body: "I was charged but the booking still shows unpaid — can you check?" },
    { ticketId: t1.id, sender: "ADMIN", body: "Hi Priya! I can see the payment landed. Marking it paid now — sorry for the scare." },
    { ticketId: t1.id, sender: "CUSTOMER", body: "Perfect, thank you!" },
  ] });
  const t2 = await prisma.ticket.create({ data: { customerId: arjunRao.id, status: "OPEN" } });
  await prisma.ticketMessage.create({ data: { ticketId: t2.id, sender: "CUSTOMER", body: "Can I change the stylist on an accepted booking?" } });

  console.log("Seeded. Logins (any OTP shown on screen in dev):");
  console.log("  Customer     +91 98765 43210  Priya Nair");
  console.log("  Partner admin +91 99900 00001  Ravi Kumar (Demo Cuts)");
  console.log("  Partner staff +91 99900 00002  Sam (Demo Cuts)");
  console.log("  Super admin  +91 90000 00000  Platform Admin");
  void superAdmin;
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
