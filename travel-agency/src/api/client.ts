import type {
  AdminUser, Booking, ChatMessage, DashboardStats, Paginated, PublicStats, Review, TravelPackage, User,
} from "../types";

const BASE: string = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const TOKEN_KEY = "voyage_token";

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (t: string): void => localStorage.setItem(TOKEN_KEY, t),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

export interface FieldError { field: string; message: string }

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly errors?: FieldError[]) {
    super(message);
    this.name = "ApiError";
  }
  /** One readable line, including per-field messages when the API sent them. */
  get friendly(): string {
    return this.errors?.length ? this.errors.map((e) => e.message).join(". ") : this.message;
  }
}

export const errorMessage = (e: unknown): string =>
  e instanceof ApiError ? e.friendly : e instanceof Error ? e.message : "Something went wrong";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string; errors?: FieldError[] } & Record<string, unknown>;
  if (!res.ok) throw new ApiError(data.error || "Request failed", res.status, data.errors);
  return data as T;
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

const qs = (params: Record<string, string | number | boolean | undefined>): string => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export interface PackageQuery {
  region?: string; search?: string; sort?: string; page?: number; limit?: number; include_inactive?: boolean;
}

export type PackageInput = Partial<Omit<TravelPackage, "id" | "price" | "avg_rating" | "review_count">> & { price?: number };

export interface BookingInput {
  package_id: string; travelers: number; start_date: string; special_notes?: string;
  guest_name?: string; guest_email?: string; guest_phone?: string;
}

export const api = {
  // Auth
  register: (b: { name: string; email: string; password: string; phone?: string }) =>
    request<{ token: string; user: User }>("/auth/register", json("POST", b)),
  login: (b: { email: string; password: string }) =>
    request<{ token: string; user: User }>("/auth/login", json("POST", b)),
  getMe: () => request<{ user: User }>("/auth/me"),
  updateMe: (b: { name?: string; phone?: string }) => request<{ user: User }>("/auth/me", json("PATCH", b)),
  changePassword: (b: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>("/auth/change-password", json("POST", b)),

  // Packages
  getPackages: (p: PackageQuery = {}) =>
    request<{ packages: TravelPackage[] } & Paginated>(`/packages${qs({ ...p })}`),
  getPackage: (id: string) => request<{ package: TravelPackage; reviews: Review[] }>(`/packages/${id}`),
  createPackage: (b: PackageInput) => request<{ package: TravelPackage }>("/packages", json("POST", b)),
  updatePackage: (id: string, b: PackageInput) => request<{ package: TravelPackage }>(`/packages/${id}`, json("PATCH", b)),
  deletePackage: (id: string) => request<{ message: string }>(`/packages/${id}`, json("DELETE")),

  // Bookings
  createBooking: (b: BookingInput) => request<{ booking: Booking; refCode: string }>("/bookings", json("POST", b)),
  getMyBookings: () => request<{ bookings: Booking[] }>("/bookings/me"),
  cancelBooking: (id: string) => request<{ message: string }>(`/bookings/${id}`, json("DELETE")),
  getAllBookings: (p: { status?: string; page?: number; limit?: number } = {}) =>
    request<{ bookings: Booking[] } & Paginated>(`/bookings${qs(p)}`),
  updateStatus: (id: string, status: string) =>
    request<{ booking: Booking }>(`/bookings/${id}/status`, json("PATCH", { status })),

  // Admin
  getStats: () => request<DashboardStats>("/admin/stats"),
  getAdminUsers: (p: { role?: string; page?: number; limit?: number } = {}) =>
    request<{ users: AdminUser[] } & Paginated>(`/admin/users${qs(p)}`),
  updateUserRole: (id: string, role: string) => request<{ user: AdminUser }>(`/admin/users/${id}/role`, json("PATCH", { role })),

  // Reviews
  createReview: (b: { package_id: string; rating: number; review_text?: string }) =>
    request<{ review: Review }>("/reviews", json("POST", b)),

  // Public
  getPublicStats: () => request<PublicStats>("/public/stats"),
  getRecentReviews: () => request<{ reviews: Review[] }>("/public/reviews"),

  // AI concierge (proxied through the API so the key never reaches the browser)
  askConcierge: (messages: ChatMessage[]) => request<{ reply: string }>("/concierge", json("POST", { messages })),
};
