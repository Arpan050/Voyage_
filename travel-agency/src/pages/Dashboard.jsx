import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { api } from "../api/client";
import { useApi, useToast } from "../hooks/useApi";
import Toast from "../components/Toast";
import styles from "./Dashboard.module.css";

const STATUS_COLORS = {
  confirmed: styles.confirmed,
  pending:   styles.pending,
  cancelled: styles.cancelled,
  completed: styles.completed,
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [tab, setTab] = useState("bookings");
  const [changePw, setChangePw] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);

  const { data, loading, execute: reload } = useApi(() => api.getMyBookings(), []);

  const handleCancel = async (id) => {
    if (!confirm("Cancel this booking?")) return;
    try {
      await api.cancelBooking(id);
      showToast("Booking cancelled.", "success");
      reload();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleChangePw = async () => {
    if (changePw.next !== changePw.confirm) { showToast("Passwords don't match", "error"); return; }
    setPwBusy(true);
    try {
      await api.changePassword({ currentPassword: changePw.current, newPassword: changePw.next });
      showToast("Password updated!", "success");
      setChangePw({ current: "", next: "", confirm: "" });
    } catch (err) {
      showToast(err.message, "error");
    } finally { setPwBusy(false); }
  };

  const bookings = data?.bookings || [];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.label}>Member Portal</p>
          <h1 className={styles.title}>My Dashboard</h1>
        </div>
        <div className={styles.userBadge}>
          <div className={styles.avatar}>{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <p className={styles.userName}>{user?.name}</p>
            <p className={styles.userEmail}>{user?.email}</p>
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          {[["bookings","My Bookings"],["profile","Profile"],["security","Security"]].map(([k,l]) => (
            <button key={k} className={`${styles.navItem} ${tab===k ? styles.navActive : ""}`} onClick={() => setTab(k)}>{l}</button>
          ))}
          <button className={styles.logoutBtn} onClick={() => { logout(); navigate("/"); }}>Sign Out</button>
        </aside>

        {/* Content */}
        <div className={styles.content}>

          {/* ── BOOKINGS ── */}
          {tab === "bookings" && (
            <>
              <h2 className={styles.contentTitle}>My Trips</h2>
              {loading && <div className={styles.spinnerWrap}><div className={styles.spinner}/></div>}
              {!loading && bookings.length === 0 && (
                <div className={styles.empty}>
                  <span>✈️</span>
                  <p>You haven't booked any trips yet.</p>
                  <button className={styles.exploreBtn} onClick={() => navigate("/packages")}>Explore Packages</button>
                </div>
              )}
              <div className={styles.bookingsList}>
                {bookings.map((b) => (
                  <div key={b.id} className={styles.bookingCard}>
                    <div className={styles.bookingEmoji}>{b.emoji}</div>
                    <div className={styles.bookingInfo}>
                      <p className={styles.bookingPkg}>{b.package_name}</p>
                      <p className={styles.bookingDest}>{b.destination} · {b.duration_days} days</p>
                      <p className={styles.bookingDate}>
                        Departure: <strong>{new Date(b.start_date).toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" })}</strong>
                      </p>
                      <p className={styles.bookingRef}>Ref: {b.ref_code}</p>
                    </div>
                    <div className={styles.bookingRight}>
                      <span className={`${styles.badge} ${STATUS_COLORS[b.status]}`}>{b.status}</span>
                      <p className={styles.bookingPrice}>${parseFloat(b.total_price).toLocaleString()}</p>
                      <p className={styles.bookingTravelers}>{b.travelers} {b.travelers === 1 ? "person" : "people"}</p>
                      {b.status === "pending" && (
                        <button className={styles.cancelBtn} onClick={() => handleCancel(b.id)}>Cancel</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── PROFILE ── */}
          {tab === "profile" && (
            <ProfileTab user={user} showToast={showToast} />
          )}

          {/* ── SECURITY ── */}
          {tab === "security" && (
            <>
              <h2 className={styles.contentTitle}>Change Password</h2>
              <div className={styles.formCard}>
                {[["current","Current Password"],["next","New Password"],["confirm","Confirm New Password"]].map(([k,l]) => (
                  <div key={k} className={styles.field}>
                    <label className={styles.fieldLabel}>{l}</label>
                    <input className={styles.input} type="password" placeholder="••••••••"
                      value={changePw[k]} onChange={(e) => setChangePw(p => ({...p,[k]:e.target.value}))} />
                  </div>
                ))}
                <button className={styles.saveBtn} onClick={handleChangePw} disabled={pwBusy}>
                  {pwBusy ? "Updating…" : "Update Password"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <Toast toast={toast} />
    </div>
  );
}

function ProfileTab({ user, showToast }) {
  const { refreshUser } = useAuth();
  const [fields, setFields] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      await api.updateMe(fields);
      await refreshUser();
      showToast("Profile updated!", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally { setBusy(false); }
  };

  return (
    <>
      <h2 style={{fontFamily:"var(--font-display)",fontSize:"1.4rem",marginBottom:24}}>Profile</h2>
      <div className={styles.formCard}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Full Name</label>
          <input className={styles.input} value={fields.name} onChange={e => setFields(p => ({...p,name:e.target.value}))} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Email</label>
          <input className={styles.input} value={user?.email} disabled style={{opacity:.5,cursor:"not-allowed"}} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Phone</label>
          <input className={styles.input} value={fields.phone} onChange={e => setFields(p => ({...p,phone:e.target.value}))} />
        </div>
        <button className={styles.saveBtn} onClick={handleSave} disabled={busy}>{busy ? "Saving…" : "Save Changes"}</button>
      </div>
    </>
  );
}
