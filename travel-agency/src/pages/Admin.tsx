import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import { useApi } from "../hooks/useApi";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/useAuth";
import Toast from "../components/Toast";
import { BOOKING_STATUSES, NEXT_STATUSES, REGIONS, type Booking, type BookingStatus, type Region, type TravelPackage } from "../types";
import styles from "./Admin.module.css";

type Tab = "dashboard" | "bookings" | "packages" | "users";
type ShowToast = ReturnType<typeof useToast>["showToast"];

const TABS: [Tab, string][] = [["dashboard", "Dashboard"], ["bookings", "Bookings"], ["packages", "Packages"], ["users", "Users"]];

const ACTION_LABEL: Record<BookingStatus, string> = {
  pending: "Reopen", confirmed: "Confirm", rejected: "Reject", cancelled: "Cancel", completed: "Complete",
};

export default function Admin() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const { toast, showToast } = useToast();

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className={styles.page}>
      <p className={styles.label}>Internal Portal</p>
      <h1 className={styles.title}>Admin Dashboard</h1>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          {TABS.map(([k, l]) => (
            <button key={k} className={`${styles.navItem} ${tab === k ? styles.navActive : ""}`} aria-current={tab === k} onClick={() => setTab(k)}>{l}</button>
          ))}
        </aside>
        <div className={styles.content}>
          {tab === "dashboard" && <StatsTab />}
          {tab === "bookings" && <BookingsTab showToast={showToast} />}
          {tab === "packages" && <PackagesTab showToast={showToast} />}
          {tab === "users" && <UsersTab showToast={showToast} />}
        </div>
      </div>
      <Toast toast={toast} />
    </div>
  );
}

/* ── Dashboard ─────────────────────────────────────────────── */
function StatsTab() {
  const stats = useApi(() => api.getStats(), []);
  const recent = useApi(() => api.getAllBookings({ limit: 8 }), []);
  if (stats.loading && !stats.data) return <Spinner />;
  if (stats.error) return <ErrorNote message={stats.error} />;
  const s = stats.data;

  const cards: [string, string, string][] = s ? [
    ["Revenue", `$${s.totalRevenue.toLocaleString()}`, "Confirmed + completed"],
    ["Active Bookings", String(s.activeBookings), "Confirmed + pending"],
    ["Customers", String(s.totalCustomers), "Registered users"],
    ["Avg Rating", s.reviewCount ? `${s.avgRating}★` : "—", `${s.reviewCount} ${s.reviewCount === 1 ? "review" : "reviews"}`],
  ] : [];

  return (
    <>
      <div className={styles.statsRow}>
        {cards.map(([lbl, val, delta]) => (
          <div key={lbl} className={styles.statCard}>
            <div className={styles.statLabel}>{lbl}</div>
            <div className={styles.statValue}>{val}</div>
            <div className={styles.statDelta}>{delta}</div>
          </div>
        ))}
      </div>
      <h2 className={styles.tableTitle}>Recent Bookings</h2>
      <BookingsTable rows={recent.data?.bookings ?? []} />
    </>
  );
}

/* ── Bookings ──────────────────────────────────────────────── */
function BookingsTab({ showToast }: { showToast: ShowToast }) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(
    () => api.getAllBookings({ status: status || undefined, page, limit: 15 }), [status, page],
  );

  const handleStatus = async (b: Booking, next: BookingStatus) => {
    const risky = next === "cancelled" || next === "rejected";
    if (risky && !window.confirm(`${ACTION_LABEL[next]} booking ${b.ref_code}? This can't be undone.`)) return;
    try {
      await api.updateStatus(b.id, next);
      showToast(`Booking ${b.ref_code} is now ${next}`, "success");
      await reload();
    } catch (err) {
      showToast(errorMessage(err), "error");
      await reload(); // another admin may have changed it
    }
  };

  return (
    <>
      <div className={styles.toolbar}>
        <h2 className={styles.tableTitle}>All Bookings{data ? ` (${data.total})` : ""}</h2>
        <select className={styles.select} aria-label="Filter by status" value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {loading && !data ? <Spinner /> : error ? <ErrorNote message={error} /> : (
        <>
          <BookingsTable rows={data?.bookings ?? []} onStatus={handleStatus} />
          <Pager page={page} totalPages={data?.totalPages ?? 1} onPage={setPage} />
        </>
      )}
    </>
  );
}

function BookingsTable({ rows, onStatus }: { rows: Booking[]; onStatus?: (b: Booking, next: BookingStatus) => void }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr>{["Ref", "Customer", "Package", "Start", "Amount", "Status", ...(onStatus ? ["Actions"] : [])].map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td className={styles.tdMono}>{b.ref_code}</td>
              <td className={styles.tdBold}>{b.customer_name ?? "—"}</td>
              <td>{b.package_name}</td>
              <td>{new Date(b.start_date).toLocaleDateString("en-IN")}</td>
              <td className={styles.tdGold}>${parseFloat(b.total_price).toLocaleString()}</td>
              <td><span className={`${styles.badge} ${styles[b.status] ?? ""}`}>{b.status}</span></td>
              {onStatus && (
                <td>
                  {NEXT_STATUSES[b.status].map((next) => (
                    <button key={next} className={`${styles.actionBtn} ${next === "rejected" || next === "cancelled" ? styles.dangerBtn : ""}`}
                      onClick={() => onStatus(b, next)}>{ACTION_LABEL[next]}</button>
                  ))}
                  {NEXT_STATUSES[b.status].length === 0 && <span className={styles.muted}>—</span>}
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={onStatus ? 7 : 6} style={{ textAlign: "center", padding: "32px" }} className={styles.muted}>No bookings found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

/* ── Packages ──────────────────────────────────────────────── */
interface PkgForm {
  name: string; destination: string; region: Region; badge: string; price: string;
  duration_days: string; group_min: string; group_max: string; emoji: string; description: string; highlights: string;
}
const EMPTY_FORM: PkgForm = {
  name: "", destination: "", region: "europe", badge: "", price: "", duration_days: "7",
  group_min: "2", group_max: "12", emoji: "🌍", description: "", highlights: "",
};
const DEFAULT_GRADIENT = "linear-gradient(135deg,#1a2332,#2d4a3e)";

const toForm = (p: TravelPackage): PkgForm => ({
  name: p.name, destination: p.destination, region: p.region, badge: p.badge ?? "", price: p.price,
  duration_days: String(p.duration_days), group_min: String(p.group_min), group_max: String(p.group_max),
  emoji: p.emoji ?? "", description: p.description ?? "", highlights: (p.highlights ?? []).join("\n"),
});

function PackagesTab({ showToast }: { showToast: ShowToast }) {
  const { data, loading, error, reload } = useApi(() => api.getPackages({ include_inactive: true, limit: 50, sort: "newest" }), []);
  const [editing, setEditing] = useState<{ id: string | null; form: PkgForm } | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = async (p: TravelPackage) => {
    try {
      await api.updatePackage(p.id, { is_active: !p.is_active });
      showToast(p.is_active ? "Package deactivated" : "Package reactivated", "success");
      await reload();
    } catch (err) { showToast(errorMessage(err), "error"); }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const f = editing.form;
    const body = {
      name: f.name.trim(), destination: f.destination.trim(), region: f.region,
      badge: f.badge.trim() || undefined, price: Number(f.price), duration_days: Number(f.duration_days),
      group_min: Number(f.group_min), group_max: Number(f.group_max), emoji: f.emoji.trim() || undefined,
      description: f.description.trim() || undefined,
      highlights: f.highlights.split("\n").map((h) => h.trim()).filter(Boolean),
    };
    setBusy(true);
    try {
      if (editing.id) await api.updatePackage(editing.id, body);
      else await api.createPackage({ ...body, bg_gradient: DEFAULT_GRADIENT });
      showToast(editing.id ? "Package updated" : "Package created", "success");
      setEditing(null);
      await reload();
    } catch (err) { showToast(errorMessage(err), "error"); }
    finally { setBusy(false); }
  };

  const set = (k: keyof PkgForm, v: string) => setEditing((cur) => cur && { ...cur, form: { ...cur.form, [k]: v } });

  return (
    <>
      <div className={styles.toolbar}>
        <h2 className={styles.tableTitle}>All Packages{data ? ` (${data.total})` : ""}</h2>
        {!editing && <button className={styles.primaryBtn} onClick={() => setEditing({ id: null, form: EMPTY_FORM })}>+ New package</button>}
      </div>

      {editing && (
        <form className={styles.formPanel} onSubmit={save}>
          <div className={styles.formGrid}>
            <Field label="Name"><input className={styles.fInput} required minLength={2} value={editing.form.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Destination"><input className={styles.fInput} required value={editing.form.destination} onChange={(e) => set("destination", e.target.value)} /></Field>
            <Field label="Region">
              <select className={styles.fInput} value={editing.form.region} onChange={(e) => set("region", e.target.value)}>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Badge"><input className={styles.fInput} maxLength={50} value={editing.form.badge} onChange={(e) => set("badge", e.target.value)} /></Field>
            <Field label="Price per person (USD)"><input className={styles.fInput} type="number" required min={0} step="0.01" value={editing.form.price} onChange={(e) => set("price", e.target.value)} /></Field>
            <Field label="Duration (days)"><input className={styles.fInput} type="number" required min={1} value={editing.form.duration_days} onChange={(e) => set("duration_days", e.target.value)} /></Field>
            <Field label="Group min"><input className={styles.fInput} type="number" required min={1} value={editing.form.group_min} onChange={(e) => set("group_min", e.target.value)} /></Field>
            <Field label="Group max"><input className={styles.fInput} type="number" required min={1} value={editing.form.group_max} onChange={(e) => set("group_max", e.target.value)} /></Field>
            <Field label="Emoji"><input className={styles.fInput} maxLength={10} value={editing.form.emoji} onChange={(e) => set("emoji", e.target.value)} /></Field>
            <Field label="Description" full><textarea className={styles.fInput} rows={3} value={editing.form.description} onChange={(e) => set("description", e.target.value)} /></Field>
            <Field label="Highlights (one per line)" full><textarea className={styles.fInput} rows={4} value={editing.form.highlights} onChange={(e) => set("highlights", e.target.value)} /></Field>
          </div>
          <div className={styles.formActions}>
            <button className={styles.primaryBtn} type="submit" disabled={busy}>{busy ? "Saving…" : editing.id ? "Save changes" : "Create package"}</button>
            <button className={styles.actionBtn} type="button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      {loading && !data ? <Spinner /> : error ? <ErrorNote message={error} /> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>{["Package", "Destination", "Duration", "Price", "Status", "Actions"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {(data?.packages ?? []).map((p) => (
                <tr key={p.id} className={p.is_active ? "" : styles.inactiveRow}>
                  <td className={styles.tdBold}>{p.emoji} {p.name}</td>
                  <td>{p.destination}</td>
                  <td>{p.duration_days}d</td>
                  <td className={styles.tdGold}>${parseFloat(p.price).toLocaleString()}</td>
                  <td><span className={`${styles.badge} ${p.is_active ? styles.confirmed : styles.cancelled}`}>{p.is_active ? "active" : "inactive"}</span></td>
                  <td>
                    <button className={styles.actionBtn} onClick={() => setEditing({ id: p.id, form: toForm(p) })}>Edit</button>
                    <button className={styles.actionBtn} onClick={() => void toggle(p)}>{p.is_active ? "Deactivate" : "Reactivate"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`${styles.fField} ${full ? styles.full : ""}`}>
      <span className={styles.fLabel}>{label}</span>
      {children}
    </label>
  );
}

/* ── Users ─────────────────────────────────────────────────── */
function UsersTab({ showToast }: { showToast: ShowToast }) {
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(() => api.getAdminUsers({ page, limit: 20 }), [page]);

  const changeRole = async (id: string, role: "user" | "admin") => {
    if (!window.confirm(`Make this user ${role === "admin" ? "an admin" : "a regular user"}?`)) return;
    try {
      await api.updateUserRole(id, role);
      showToast("Role updated", "success");
      await reload();
    } catch (err) { showToast(errorMessage(err), "error"); }
  };

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorNote message={error} />;
  return (
    <>
      <h2 className={styles.tableTitle}>All Users{data ? ` (${data.total})` : ""}</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr>{["Name", "Email", "Role", "Joined", "Actions"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {(data?.users ?? []).map((u) => (
              <tr key={u.id}>
                <td className={styles.tdBold}>{u.name}</td>
                <td>{u.email}</td>
                <td><span className={`${styles.badge} ${u.role === "admin" ? styles.confirmed : styles.pending}`}>{u.role}</span></td>
                <td>{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
                <td>
                  {u.id === me?.id ? <span className={styles.muted}>You</span> : (
                    <button className={styles.actionBtn} onClick={() => void changeRole(u.id, u.role === "admin" ? "user" : "admin")}>
                      {u.role === "admin" ? "Make user" : "Make admin"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} totalPages={data?.totalPages ?? 1} onPage={setPage} />
    </>
  );
}

/* ── Shared bits ───────────────────────────────────────────── */
function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className={styles.pager}>
      <button className={styles.actionBtn} disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
      <span>Page {page} of {totalPages}</span>
      <button className={styles.actionBtn} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next →</button>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return <p role="alert" style={{ color: "#f87171", padding: "24px 0" }}>{message}</p>;
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "48px" }} role="status" aria-label="Loading">
      <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,.1)", borderTopColor: "#c4622d", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
    </div>
  );
}
