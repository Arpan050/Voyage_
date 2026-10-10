import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { api, errorMessage } from "../api/client";
import { useApi } from "../hooks/useApi";
import { useToast } from "../hooks/useToast";
import Toast from "../components/Toast";
import type { Booking, BookingStatus, User } from "../types";
import styles from "./Dashboard.module.css";

type Tab = "bookings" | "profile" | "security";
type ShowToast = ReturnType<typeof useToast>["showToast"];

const STATUS_CLASS: Record<BookingStatus, string | undefined> = {
  confirmed: styles.confirmed,
  pending: styles.pending,
  cancelled: styles.cancelled,
  rejected: styles.cancelled,
  completed: styles.completed,
};

const TABS: [Tab, string][] = [["bookings", "My Bookings"], ["profile", "Profile"], ["security", "Security"]];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [tab, setTab] = useState<Tab>("bookings");
  const [reviewing, setReviewing] = useState<string | null>(null);

  const { data, loading, error, reload } = useApi(() => api.getMyBookings(), []);
  const bookings = data?.bookings ?? [];

  const handleCancel = async (id: string) => {
    if (!window.confirm("Cancel this booking?")) return;
    try {
      await api.cancelBooking(id);
      showToast("Booking cancelled.", "success");
      await reload();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };

  if (!user) return null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.label}>Member Portal</p>
          <h1 className={styles.title}>My Dashboard</h1>
        </div>
        <div className={styles.userBadge}>
          <div className={styles.avatar} aria-hidden="true">{user.name[0]?.toUpperCase()}</div>
          <div>
            <p className={styles.userName}>{user.name}</p>
            <p className={styles.userEmail}>{user.email}</p>
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          {TABS.map(([k, l]) => (
            <button key={k} className={`${styles.navItem} ${tab === k ? styles.navActive : ""}`} aria-current={tab === k} onClick={() => setTab(k)}>{l}</button>
          ))}
          <button className={styles.logoutBtn} onClick={() => { logout(); navigate("/"); }}>Sign Out</button>
        </aside>

        <div className={styles.content}>
          {tab === "bookings" && (
            <>
              <h2 className={styles.contentTitle}>My Trips</h2>
              {loading && !data && <div className={styles.spinnerWrap}><div className={styles.spinner} /></div>}
              {error && <p role="alert" style={{ color: "#c0392b" }}>{error}</p>}
              {!loading && !error && bookings.length === 0 && (
                <div className={styles.empty}>
                  <span>✈️</span>
                  <p>You haven't requested any trips yet.</p>
                  <button className={styles.exploreBtn} onClick={() => navigate("/packages")}>Explore Packages</button>
                </div>
              )}
              <div className={styles.bookingsList}>
                {bookings.map((b) => (
                  <div key={b.id}>
                    <div className={styles.bookingCard}>
                      <div className={styles.bookingEmoji}>{b.emoji}</div>
                      <div className={styles.bookingInfo}>
                        <p className={styles.bookingPkg}>{b.package_name}</p>
                        <p className={styles.bookingDest}>{b.destination} · {b.duration_days} days</p>
                        <p className={styles.bookingDate}>
                          Departure: <strong>{new Date(b.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong>
                        </p>
                        <p className={styles.bookingRef}>Ref: {b.ref_code}</p>
                      </div>
                      <div className={styles.bookingRight}>
                        <span className={`${styles.badge} ${STATUS_CLASS[b.status] ?? ""}`}>{b.status}</span>
                        <p className={styles.bookingPrice}>${parseFloat(b.total_price).toLocaleString()}</p>
                        <p className={styles.bookingTravelers}>{b.travelers} {b.travelers === 1 ? "person" : "people"}</p>
                        {b.status === "pending" && (
                          <button className={styles.cancelBtn} onClick={() => void handleCancel(b.id)}>Cancel</button>
                        )}
                        {b.status === "completed" && !b.reviewed && (
                          <button className={styles.cancelBtn} onClick={() => setReviewing(reviewing === b.id ? null : b.id)}>
                            {reviewing === b.id ? "Close" : "Leave a review"}
                          </button>
                        )}
                        {b.status === "completed" && b.reviewed && <p className={styles.bookingTravelers}>Reviewed ✓</p>}
                      </div>
                    </div>
                    {reviewing === b.id && (
                      <ReviewForm booking={b} showToast={showToast}
                        onDone={async () => { setReviewing(null); await reload(); }} />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "profile" && <ProfileTab user={user} showToast={showToast} />}
          {tab === "security" && <SecurityTab showToast={showToast} />}
        </div>
      </div>
      <Toast toast={toast} />
    </div>
  );
}

function ReviewForm({ booking, showToast, onDone }: { booking: Booking; showToast: ShowToast; onDone: () => Promise<void> }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.createReview({ package_id: booking.package_id, rating, review_text: text.trim() || undefined });
      showToast("Thanks for your review!", "success");
      await onDone();
    } catch (err) {
      showToast(errorMessage(err), "error");
      setBusy(false);
    }
  };

  return (
    <form className={styles.formCard} onSubmit={submit} style={{ marginTop: 8 }}>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor={`rating-${booking.id}`}>Rating</label>
        <select id={`rating-${booking.id}`} className={styles.input} value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)} ({n})</option>)}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor={`review-${booking.id}`}>Your review (optional)</label>
        <textarea id={`review-${booking.id}`} className={styles.input} rows={3} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <button className={styles.saveBtn} type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit review"}</button>
    </form>
  );
}

function ProfileTab({ user, showToast }: { user: User; showToast: ShowToast }) {
  const { refreshUser } = useAuth();
  const [fields, setFields] = useState({ name: user.name, phone: user.phone ?? "" });
  const [busy, setBusy] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateMe({ name: fields.name.trim(), phone: fields.phone.trim() });
      await refreshUser();
      showToast("Profile updated!", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h2 className={styles.contentTitle}>Profile</h2>
      <form className={styles.formCard} onSubmit={handleSave}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="pf-name">Full Name</label>
          <input id="pf-name" className={styles.input} value={fields.name} onChange={(e) => setFields((p) => ({ ...p, name: e.target.value }))} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="pf-email">Email</label>
          <input id="pf-email" className={styles.input} value={user.email} disabled style={{ opacity: 0.5, cursor: "not-allowed" }} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="pf-phone">Phone</label>
          <input id="pf-phone" className={styles.input} type="tel" value={fields.phone} onChange={(e) => setFields((p) => ({ ...p, phone: e.target.value }))} />
        </div>
        <button className={styles.saveBtn} type="submit" disabled={busy}>{busy ? "Saving…" : "Save Changes"}</button>
      </form>
    </>
  );
}

function SecurityTab({ showToast }: { showToast: ShowToast }) {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) { showToast("Passwords don't match", "error"); return; }
    setBusy(true);
    try {
      await api.changePassword({ currentPassword: pw.current, newPassword: pw.next });
      showToast("Password updated!", "success");
      setPw({ current: "", next: "", confirm: "" });
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const fields: [keyof typeof pw, string, string][] = [
    ["current", "Current Password", "current-password"],
    ["next", "New Password", "new-password"],
    ["confirm", "Confirm New Password", "new-password"],
  ];

  return (
    <>
      <h2 className={styles.contentTitle}>Change Password</h2>
      <form className={styles.formCard} onSubmit={handleSubmit}>
        {fields.map(([k, label, auto]) => (
          <div key={k} className={styles.field}>
            <label className={styles.fieldLabel} htmlFor={`pw-${k}`}>{label}</label>
            <input id={`pw-${k}`} className={styles.input} type="password" autoComplete={auto} placeholder="••••••••"
              value={pw[k]} onChange={(e) => setPw((p) => ({ ...p, [k]: e.target.value }))} />
          </div>
        ))}
        <p style={{ fontSize: ".78rem", opacity: 0.7, margin: "0 0 12px" }}>8+ characters, with an uppercase letter and a number.</p>
        <button className={styles.saveBtn} type="submit" disabled={busy}>{busy ? "Updating…" : "Update Password"}</button>
      </form>
    </>
  );
}
