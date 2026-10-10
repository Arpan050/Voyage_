import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BookingModal from "../components/BookingModal";
import { CUSTOMER, pkg, renderApp } from "./helpers";

const createBooking = vi.fn();
vi.mock("../api/client", async (orig) => ({ ...(await orig<typeof import("../api/client")>()), api: { createBooking: (...a: unknown[]) => createBooking(...a) } }));

const future = () => { const d = new Date(Date.now() + 10 * 864e5); return d.toISOString().slice(0, 10); };
beforeEach(() => { createBooking.mockClear(); });

describe("BookingModal", () => {
  it("asks guests for name, email and date before calling the API", async () => {
    renderApp(<BookingModal pkg={pkg()} onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /request booking/i }));
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Please pick a start date")).toBeInTheDocument();
    expect(createBooking).not.toHaveBeenCalled();
  });

  it("logged-in users aren't asked for contact details", () => {
    renderApp(<BookingModal pkg={pkg()} onClose={() => {}} />, { user: CUSTOMER });
    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
    expect(screen.getByText(CUSTOMER.email, { exact: false })).toBeInTheDocument();
  });

  it("caps the travellers dropdown at the package's group maximum", () => {
    renderApp(<BookingModal pkg={pkg({ group_max: 4 })} onClose={() => {}} />, { user: CUSTOMER });
    const options = screen.getByLabelText("Travellers").querySelectorAll("option");
    expect(options).toHaveLength(4);
  });

  it("success screen says the request is pending, not 'confirmed', and shows the real reference", async () => {
    createBooking.mockResolvedValue({ booking: {}, refCode: "VYG-REAL1234" });
    renderApp(<BookingModal pkg={pkg()} onClose={() => {}} />, { user: CUSTOMER });
    await userEvent.type(screen.getByLabelText(/preferred start date/i), future());
    await userEvent.click(screen.getByRole("button", { name: /request booking/i }));
    expect(await screen.findByText("VYG-REAL1234")).toBeInTheDocument();
    expect(screen.getByText(/request received/i)).toBeInTheDocument();
    expect(screen.queryByText(/booking confirmed/i)).not.toBeInTheDocument();
    expect(createBooking).toHaveBeenCalledWith(expect.objectContaining({ package_id: "p1", travelers: 2 }));
  });

  it("shows the API's error message when the booking fails", async () => {
    createBooking.mockImplementation(() => Promise.reject(new Error("This package accepts at most 10 travellers")));
    renderApp(<BookingModal pkg={pkg()} onClose={() => {}} />, { user: CUSTOMER });
    await userEvent.type(screen.getByLabelText(/preferred start date/i), future());
    await userEvent.click(screen.getByRole("button", { name: /request booking/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("at most 10 travellers");
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    renderApp(<BookingModal pkg={pkg()} onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
