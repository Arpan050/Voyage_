import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import Packages from "../pages/Packages";
import { pkg, renderApp } from "./helpers";

const getPackages = vi.fn();
vi.mock("../api/client", async (orig) => ({ ...(await orig<typeof import("../api/client")>()), api: { getPackages: (...a: unknown[]) => getPackages(...a) } }));

beforeEach(() => { getPackages.mockReset(); });

describe("Packages page", () => {
  it("renders packages from the API", async () => {
    getPackages.mockResolvedValue({ packages: [pkg(), pkg({ id: "p2", name: "Santorini Escape" })], total: 2, page: 1, limit: 9, totalPages: 1 });
    renderApp(<Packages />);
    expect(await screen.findByText("Kyoto in Bloom")).toBeInTheDocument();
    expect(screen.getByText("Santorini Escape")).toBeInTheDocument();
  });

  it("shows a real error with retry instead of 'no packages match'", async () => {
    getPackages.mockImplementationOnce(() => Promise.reject(new ApiError("Can't reach the server.", 0)));
    getPackages.mockResolvedValueOnce({ packages: [pkg()], total: 1, page: 1, limit: 9, totalPages: 1 });
    renderApp(<Packages />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Can't reach the server.");
    expect(screen.queryByText(/No packages match/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("Kyoto in Bloom")).toBeInTheDocument();
  });

  it("empty result shows the empty state", async () => {
    getPackages.mockResolvedValue({ packages: [], total: 0, page: 1, limit: 9, totalPages: 1 });
    renderApp(<Packages />);
    expect(await screen.findByText(/No packages match/)).toBeInTheDocument();
  });

  it("filtering by region asks the API for that region and resets to page 1", async () => {
    getPackages.mockResolvedValue({ packages: [pkg()], total: 1, page: 1, limit: 9, totalPages: 1 });
    renderApp(<Packages />);
    await screen.findByText("Kyoto in Bloom");
    await userEvent.click(screen.getByRole("button", { name: "Europe" }));
    await waitFor(() => expect(getPackages).toHaveBeenLastCalledWith(expect.objectContaining({ region: "europe", page: 1 })));
  });

  it("debounces search so typing doesn't fire a request per keystroke", async () => {
    getPackages.mockResolvedValue({ packages: [pkg()], total: 1, page: 1, limit: 9, totalPages: 1 });
    renderApp(<Packages />);
    await screen.findByText("Kyoto in Bloom");
    const before = getPackages.mock.calls.length;
    await userEvent.type(screen.getByLabelText("Search packages"), "kyoto");
    await waitFor(() => expect(getPackages).toHaveBeenLastCalledWith(expect.objectContaining({ search: "kyoto" })));
    expect(getPackages.mock.calls.length - before).toBeLessThanOrEqual(2);
  });

  it("paginates", async () => {
    getPackages.mockResolvedValue({ packages: [pkg()], total: 20, page: 1, limit: 9, totalPages: 3 });
    renderApp(<Packages />);
    await screen.findByText("Page 1 of 3");
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => expect(getPackages).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });
});
