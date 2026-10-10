import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../pages/Home";
import { pkg, renderApp } from "./helpers";

const mocks = vi.hoisted(() => ({ getPublicStats: vi.fn(), getPackages: vi.fn(), getRecentReviews: vi.fn() }));
vi.mock("../api/client", async (orig) => ({ ...(await orig<typeof import("../api/client")>()), api: mocks }));

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.getPackages.mockResolvedValue({ packages: [pkg(), pkg({ id: "p2", region: "europe" })], total: 2, page: 1, limit: 50, totalPages: 1 });
});

describe("Home page honesty", () => {
  it("shows real numbers and hides ratings/reviews when there are none", async () => {
    mocks.getPublicStats.mockResolvedValue({ packages: 6, destinations: 6, reviews: 0, avg_rating: null });
    mocks.getRecentReviews.mockResolvedValue({ reviews: [] });
    renderApp(<Home />);
    expect(await screen.findByText("Packages", { selector: "div" })).toBeInTheDocument();
    expect(screen.queryByText("Traveller Stories")).not.toBeInTheDocument();
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  it("never shows the old invented claims", async () => {
    mocks.getPublicStats.mockResolvedValue({ packages: 6, destinations: 6, reviews: 0, avg_rating: null });
    mocks.getRecentReviews.mockResolvedValue({ reviews: [] });
    renderApp(<Home />);
    await screen.findByText(/portfolio demo/i, { selector: "p" });
    for (const fake of [/Since 2018/, /2,400/, /68/, /4\.9/]) expect(screen.queryByText(fake)).not.toBeInTheDocument();
  });

  it("renders real reviews when they exist", async () => {
    mocks.getPublicStats.mockResolvedValue({ packages: 6, destinations: 6, reviews: 1, avg_rating: 5 });
    mocks.getRecentReviews.mockResolvedValue({ reviews: [{ id: "r1", rating: 5, review_text: "Loved it", created_at: "2030-01-01", author_name: "Cy", package_name: "Kyoto in Bloom" }] });
    renderApp(<Home />);
    expect(await screen.findByText(/Loved it/)).toBeInTheDocument();
    expect(screen.getByText("Traveller Stories")).toBeInTheDocument();
  });

  it("builds region cards from real package data", async () => {
    mocks.getPublicStats.mockResolvedValue({ packages: 2, destinations: 2, reviews: 0, avg_rating: null });
    mocks.getRecentReviews.mockResolvedValue({ reviews: [] });
    renderApp(<Home />);
    expect(await screen.findByText("Asia")).toBeInTheDocument();
    expect(screen.getByText("Europe")).toBeInTheDocument();
    expect(screen.queryByText("Africa")).not.toBeInTheDocument();
  });
});
