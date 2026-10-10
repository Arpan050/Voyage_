import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Admin from "../pages/Admin";
import { ADMIN, CUSTOMER, booking, page, pkg, renderApp } from "./helpers";

const mocks = vi.hoisted(() => ({
  getStats: vi.fn(), getAllBookings: vi.fn(), updateStatus: vi.fn(), getPackages: vi.fn(), updatePackage: vi.fn(), createPackage: vi.fn(),
}));
vi.mock("../api/client", async (orig) => ({ ...(await orig<typeof import("../api/client")>()), api: mocks }));

const stats = { totalRevenue: 12800, totalBookings: 4, activeBookings: 2, bookingsByStatus: {}, totalCustomers: 3, avgRating: 4.5, reviewCount: 2 };
beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.getStats.mockResolvedValue(stats);
});

describe("Admin", () => {
  it("redirects non-admins away", () => {
    renderApp(<Admin />, { user: CUSTOMER });
    expect(screen.queryByText("Admin Dashboard")).not.toBeInTheDocument();
  });

  it("shows live stats", async () => {
    mocks.getAllBookings.mockResolvedValue({ bookings: [], ...page });
    renderApp(<Admin />, { user: ADMIN });
    expect(await screen.findByText("$12,800")).toBeInTheDocument();
    expect(screen.getByText("4.5★")).toBeInTheDocument();
  });

  it("offers only the transitions the lifecycle allows", async () => {
    mocks.getAllBookings.mockResolvedValue({
      bookings: [
        booking({ id: "1", ref_code: "VYG-PENDING1", status: "pending" }),
        booking({ id: "2", ref_code: "VYG-CONFIRM1", status: "confirmed" }),
        booking({ id: "3", ref_code: "VYG-DONE0001", status: "completed" }),
      ], ...page, total: 3,
    });
    renderApp(<Admin />, { user: ADMIN });
    await userEvent.click(screen.getByRole("button", { name: "Bookings" }));

    const row = async (ref: string) => within((await screen.findByText(ref)).closest("tr")!);
    const pending = await row("VYG-PENDING1");
    expect(pending.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(pending.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(pending.getByRole("button", { name: "Cancel" })).toBeInTheDocument();

    const confirmed = await row("VYG-CONFIRM1");
    expect(confirmed.getByRole("button", { name: "Complete" })).toBeInTheDocument();
    expect(confirmed.queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();

    expect(within((await screen.findByText("VYG-DONE0001")).closest("tr")!).queryAllByRole("button")).toHaveLength(0);
  });

  it("confirming a booking calls the API with the new status", async () => {
    mocks.getAllBookings.mockResolvedValue({ bookings: [booking()], ...page });
    mocks.updateStatus.mockResolvedValue({ booking: booking({ status: "confirmed" }) });
    renderApp(<Admin />, { user: ADMIN });
    await userEvent.click(screen.getByRole("button", { name: "Bookings" }));
    await userEvent.click(await screen.findByRole("button", { name: "Confirm" }));
    expect(mocks.updateStatus).toHaveBeenCalledWith("b1", "confirmed");
  });

  it("lists inactive packages so they can be reactivated", async () => {
    mocks.getAllBookings.mockResolvedValue({ bookings: [], ...page });
    mocks.getPackages.mockResolvedValue({ packages: [pkg({ is_active: false })], ...page });
    mocks.updatePackage.mockResolvedValue({ package: pkg() });
    renderApp(<Admin />, { user: ADMIN });
    await userEvent.click(screen.getByRole("button", { name: "Packages" }));
    expect(mocks.getPackages).toHaveBeenCalledWith(expect.objectContaining({ include_inactive: true }));
    await userEvent.click(await screen.findByRole("button", { name: "Reactivate" }));
    expect(mocks.updatePackage).toHaveBeenCalledWith("p1", { is_active: true });
  });

  it("creates a package from the form", async () => {
    mocks.getAllBookings.mockResolvedValue({ bookings: [], ...page });
    mocks.getPackages.mockResolvedValue({ packages: [], ...page, total: 0 });
    mocks.createPackage.mockResolvedValue({ package: pkg() });
    renderApp(<Admin />, { user: ADMIN });
    await userEvent.click(screen.getByRole("button", { name: "Packages" }));
    await userEvent.click(await screen.findByRole("button", { name: /new package/i }));
    await userEvent.type(screen.getByLabelText("Name"), "Lisbon Long Weekend");
    await userEvent.type(screen.getByLabelText("Destination"), "Portugal");
    await userEvent.type(screen.getByLabelText("Price per person (USD)"), "1200");
    await userEvent.type(screen.getByLabelText(/highlights/i), "Tram 28{Enter}Pastéis de nata");
    await userEvent.click(screen.getByRole("button", { name: "Create package" }));
    expect(mocks.createPackage).toHaveBeenCalledWith(expect.objectContaining({
      name: "Lisbon Long Weekend", destination: "Portugal", price: 1200, highlights: ["Tram 28", "Pastéis de nata"],
    }));
  });
});
