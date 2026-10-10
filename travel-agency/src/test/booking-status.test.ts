import { describe, expect, it } from "vitest";
import { BOOKING_STATUSES, NEXT_STATUSES } from "../types";

describe("booking lifecycle shown in the admin UI", () => {
  it("every status has an entry", () => {
    for (const s of BOOKING_STATUSES) expect(NEXT_STATUSES[s]).toBeDefined();
  });
  it("matches the backend rules", () => {
    expect([...NEXT_STATUSES.pending]).toEqual(["confirmed", "rejected", "cancelled"]);
    expect([...NEXT_STATUSES.confirmed]).toEqual(["completed", "cancelled"]);
  });
  it("terminal states offer no actions", () => {
    for (const s of ["rejected", "cancelled", "completed"] as const) expect(NEXT_STATUSES[s]).toHaveLength(0);
  });
});
