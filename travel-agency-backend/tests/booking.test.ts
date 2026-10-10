import { describe, expect, it } from "vitest";
import { ALLOWED_TRANSITIONS, BOOKING_STATUSES, canTransition, isBookingStatus } from "../src/domain/booking.js";

describe("booking state machine", () => {
  it("admin may follow every edge of the lifecycle", () => {
    for (const [from, targets] of Object.entries(ALLOWED_TRANSITIONS)) {
      for (const to of targets) expect(canTransition(from as never, to, "admin")).toBe(true);
    }
  });

  it("terminal states allow no further changes", () => {
    for (const from of ["rejected", "cancelled", "completed"] as const) {
      for (const to of BOOKING_STATUSES) expect(canTransition(from, to, "admin")).toBe(false);
    }
  });

  it("cannot skip steps", () => {
    expect(canTransition("pending", "completed")).toBe(false);
    expect(canTransition("confirmed", "rejected")).toBe(false);
    expect(canTransition("confirmed", "pending")).toBe(false);
  });

  it("a status can't transition to itself", () => {
    for (const s of BOOKING_STATUSES) expect(canTransition(s, s)).toBe(false);
  });

  it("customers can only cancel, and only while pending", () => {
    expect(canTransition("pending", "cancelled", "customer")).toBe(true);
    expect(canTransition("confirmed", "cancelled", "customer")).toBe(false);
    expect(canTransition("pending", "confirmed", "customer")).toBe(false);
    expect(canTransition("pending", "rejected", "customer")).toBe(false);
  });

  it("isBookingStatus narrows unknown input", () => {
    expect(isBookingStatus("pending")).toBe(true);
    expect(isBookingStatus("banana")).toBe(false);
    expect(isBookingStatus(undefined)).toBe(false);
  });
});
