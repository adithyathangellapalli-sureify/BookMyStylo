export type Role = "CUSTOMER" | "PARTNER" | "SUPER_ADMIN";
export type BookingStatus = "PENDING" | "ACCEPTED" | "IN_SERVICE" | "COMPLETED" | "REJECTED" | "CANCELLED" | "NO_SHOW";
export type ShopStatus = "PENDING" | "LIVE" | "SUSPENDED";
export type PaymentMethod = "CASH" | "ONLINE";
export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED";
export type SlotState = "open" | "booked" | "held" | "mine" | "past" | "leave";

export interface SessionUser { id: string; phone: string; name: string; role: Role }
export interface AuthResponse { token: string; user: SessionUser }

export interface LocalityDTO { id: string; name: string; city: string; state: string; shopCount?: number }
export interface ServiceDTO { id: string; name: string; active: boolean }

export interface StylistDTO {
  id: string; name: string; chairId: string | null; chairLabel: string | null; isAdmin: boolean;
  experienceYears: number | null; speciality: string | null; skills: string[]; ratingAvg: number; ratingCount: number;
  onLeave?: boolean;
}
export interface ShopCardDTO {
  id: string; name: string; status: ShopStatus; locality: LocalityDTO; stylistCount: number;
  serviceCount: number; fromPrice: number | null; bookable: boolean; openNow: boolean;
}
export interface ShopDTO extends ShopCardDTO {
  upiId: string | null; acceptsCash: boolean; autoApprove: boolean; opensAt: string; closesAt: string;
  slotMinutes: number; weeklyDaysOff: number[]; services: { id: string; serviceId: string; name: string; price: number }[];
  stylists: StylistDTO[]; chairs: { id: string; label: string; staffId: string | null }[];
}
export interface SlotDTO { time: string; state: SlotState; holdId?: string }
export interface AvailabilityDTO { date: string; closed: boolean; reason?: string; stylists: { staffId: string; onLeave: boolean; slots: SlotDTO[] }[] }

export interface HoldDTO { id: string; shopId: string; staffId: string; chairId: string; date: string; startTime: string; expiresAt: string }

export interface BookingDTO {
  id: string; shop: { id: string; name: string; locality: string; upiId: string | null; acceptsCash: boolean };
  customer: { id: string; name: string; phone: string };
  stylist: { id: string; name: string }; chair: { id: string; label: string };
  date: string; startTime: string; endTime: string; status: BookingStatus; amount: number;
  paymentMethod: PaymentMethod; paymentStatus: PaymentStatus; paidAt: string | null; paidVia: string | null;
  services: { name: string; price: number }[]; review: ReviewDTO | null; createdAt: string;
  canUndoPaymentUntil?: string | null;
}
export interface ReviewDTO { id: string; stars: number; tags: string[]; comment: string | null; createdAt: string }

export interface TicketDTO {
  id: string; status: "OPEN" | "RESOLVED"; createdAt: string;
  customer: { id: string; name: string; phone: string }; booking: { id: string; shopName: string; date: string; startTime: string } | null;
  messages: { id: string; sender: "CUSTOMER" | "ADMIN"; body: string; createdAt: string }[];
}

export interface PartnerMeDTO { user: SessionUser; staff: StylistDTO; shop: ShopDTO }
export interface EarningsDTO { shopTotal: number; shopPaidCount: number; teamSize: number; byStylist: { staffId: string; name: string; isAdmin: boolean; paidCount: number; total: number; isMe: boolean }[] }
export interface AdminStatsDTO { totalShops: number; liveShops: number; pendingShops: number; suspendedShops: number; services: number; activeServices: number; localities: number; openTickets: number }
export interface Paged<T> { items: T[]; total: number; page: number; pageSize: number }

export interface RegisterShopPayload {
  shop: { name: string; chairs: number; localityId: string };
  team: { name: string; phone: string }[];
  services: { serviceId: string; price: number }[];
  payment: { upiId: string | null; acceptsCash: boolean };
}
