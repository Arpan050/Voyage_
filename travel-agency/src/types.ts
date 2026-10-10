export type Role = "user" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  avatar_url: string | null;
}

export const REGIONS = ["europe", "asia", "americas", "africa", "oceania"] as const;
export type Region = (typeof REGIONS)[number];

/** NUMERIC columns arrive from the API as strings. */
export interface TravelPackage {
  id: string;
  name: string;
  destination: string;
  region: Region;
  badge: string | null;
  duration_days: number;
  group_min: number;
  group_max: number;
  price: string;
  description: string | null;
  highlights: string[] | null;
  emoji: string | null;
  bg_gradient: string | null;
  is_active: boolean;
  avg_rating?: number;
  review_count?: number;
}

export interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  author_name: string | null;
  package_name?: string;
}

export const BOOKING_STATUSES = ["pending", "confirmed", "rejected", "cancelled", "completed"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Mirrors the backend lifecycle so the admin UI only offers valid actions. */
export const NEXT_STATUSES: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["completed", "cancelled"],
  rejected: [],
  cancelled: [],
  completed: [],
};

export interface Booking {
  id: string;
  ref_code: string;
  package_id: string;
  travelers: number;
  start_date: string;
  total_price: string;
  status: BookingStatus;
  special_notes: string | null;
  created_at: string;
  package_name?: string;
  destination?: string;
  emoji?: string | null;
  duration_days?: number;
  reviewed?: boolean;
  customer_name?: string | null;
  customer_email?: string | null;
}

export interface Paginated {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUser {
  id: string; name: string; email: string; role: Role; phone: string | null; created_at: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalBookings: number;
  activeBookings: number;
  bookingsByStatus: Partial<Record<BookingStatus, number>>;
  totalCustomers: number;
  avgRating: number;
  reviewCount: number;
}

export interface PublicStats {
  packages: number;
  destinations: number;
  reviews: number;
  avg_rating: number | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
