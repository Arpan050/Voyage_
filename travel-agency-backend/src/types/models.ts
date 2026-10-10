import type { BookingStatus } from "../domain/booking.js";

/** NUMERIC columns come back from `pg` as strings. */
export interface PackageRow {
  id: string;
  name: string;
  destination: string;
  region: "europe" | "asia" | "americas" | "africa" | "oceania";
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
  created_at: Date;
  updated_at: Date;
}

export interface BookingRow {
  id: string;
  ref_code: string;
  user_id: string | null;
  package_id: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  travelers: number;
  start_date: string;
  total_price: string;
  status: BookingStatus;
  special_notes: string | null;
  created_at: Date;
  updated_at: Date;
}
