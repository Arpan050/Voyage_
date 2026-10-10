import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import { AuthContext, type AuthContextValue } from "../context/AuthContext";
import type { Booking, TravelPackage, User } from "../types";

export const ADMIN: User = { id: "a1", name: "Ada Admin", email: "ada@example.com", role: "admin", phone: null, avatar_url: null };
export const CUSTOMER: User = { id: "u1", name: "Cy Customer", email: "cy@example.com", role: "user", phone: null, avatar_url: null };

export function authValue(user: User | null): AuthContextValue {
  return {
    user, loading: false, isAdmin: user?.role === "admin",
    login: async () => user!, register: async () => user!, logout: () => {}, refreshUser: async () => {},
  };
}

export function renderApp(ui: ReactElement, { user = null, route = "/" }: { user?: User | null; route?: string } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={authValue(user)}>{ui}</AuthContext.Provider>
    </MemoryRouter>,
  );
}

export const pkg = (over: Partial<TravelPackage> = {}): TravelPackage => ({
  id: "p1", name: "Kyoto in Bloom", destination: "Japan", region: "asia", badge: "Seasonal",
  duration_days: 7, group_min: 2, group_max: 10, price: "3200.00", description: "Temples and tea.",
  highlights: ["Fushimi Inari", "Tea ceremony"], emoji: "🌸", bg_gradient: null, is_active: true,
  avg_rating: 0, review_count: 0, ...over,
});

export const booking = (over: Partial<Booking> = {}): Booking => ({
  id: "b1", ref_code: "VYG-ABCD2345", package_id: "p1", travelers: 2, start_date: "2030-01-10",
  total_price: "6400.00", status: "pending", special_notes: null, created_at: "2029-12-01T00:00:00Z",
  package_name: "Kyoto in Bloom", customer_name: "Cy Customer", ...over,
});

export const page = { total: 1, page: 1, limit: 20, totalPages: 1 };
