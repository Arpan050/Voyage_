/**
 * Booking lifecycle.
 *
 *   pending ──► confirmed ──► completed
 *      │            │
 *      ├──► rejected│
 *      └──► cancelled ◄──┘
 *
 * rejected, cancelled and completed are terminal.
 */
export const BOOKING_STATUSES = ["pending", "confirmed", "rejected", "cancelled", "completed"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const ALLOWED_TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  pending:   ["confirmed", "rejected", "cancelled"],
  confirmed: ["completed", "cancelled"],
  rejected:  [],
  cancelled: [],
  completed: [],
};

export type Actor = "admin" | "customer";

/** Statuses a customer may move their own booking into. */
const CUSTOMER_TARGETS: readonly BookingStatus[] = ["cancelled"];

export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && (BOOKING_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: BookingStatus, to: BookingStatus, actor: Actor = "admin"): boolean {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) return false;
  // Customers can only cancel, and only while the booking is still pending.
  if (actor === "customer") return CUSTOMER_TARGETS.includes(to) && from === "pending";
  return true;
}
