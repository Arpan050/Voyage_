import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useApi, useToast } from "../hooks/useApi";
import { useAuth } from "../context/useAuth";
import Toast from "../components/Toast";
import styles from "./Admin.module.css";

const TABS = [["dashboard","Dashboard"],["bookings","Bookings"],["packages","Packages"],["users","Users"]];

export default function Admin() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("dashboard");
  const { toast, showToast } = useToast();

  if (!isAdmin) { navigate("/"); return null; }

  return (
    <div className={styles.page}>
      <p className={styles.label}>Internal Portal</p>
      <h1 className={styles.title}>Admin Dashboard</h1>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          {TABS.map(([k,l]) => (
            <button key={k} className={`${styles.navItem} ${tab===k?styles.navActive:""}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </aside>
        <div className={styles.content}>
          {tab === "dashboard" && <StatsTab showToast={showToast} />}
          {tab === "bookings"  && <BookingsTab showToast={showToast} />}
          {tab === "packages"  && <PackagesTab showToast={showToast} />}
          {tab === "users"     && <UsersTab showToast={showToast} />}
        </div>
      </div>
      <Toast toast={toast} />
    </div>
  );
}

function StatsTab() {
  const { data, loading } = useApi(() => api.getStats(), []);
  const { data: bData }   = useApi(() => api.getAllBookings({ limit: 8 }), []);
  if (loading) return <Spinner />;
  const s = data || {};
  return (
    <>
      <div className={styles.statsRow}>
        {[
          ["Total Revenue", `$${(s.totalRevenue||0).toLocaleString()}`, "Live from DB"],
          ["Active Bookings", s.activeBookings ?? "—", "Confirmed + Pending"],
          ["Customers", s.totalCustomers ?? "—", "Registered users"],
          ["Avg Rating", `${s.avgRating ?? "—"}★`, `${s.reviewCount||0} reviews`],
        ].map(([lbl,val,delta]) => (
          <div key={lbl} className={styles.statCard}>
            <div className={styles.statLabel}>{lbl}</div>
            <div className={styles.statValue}>{val}</div>
            <div className={styles.statDelta}>{delta}</div>
          </div>
        ))}
      </div>
      <h2 className={styles.tableTitle}>Recent Bookings</h2>
      <BookingsTable rows={bData?.bookings || []} />
    </>
  );
}

function BookingsTab({ showToast }) {
  const { data, loading, execute: reload } = useApi(() => api.getAllBookings(), []);
  const handleStatus = async (id, status) => {
    try { await api.updateStatus(id, status); reload(); showToast("Status updated", "success"); }
    catch (err) { showToast(err.message, "error"); }
  };
  if (loading) return <Spinner />;
  return (
    <>
      <h2 className={styles.tableTitle}>All Bookings</h2>
      <BookingsTable rows={data?.bookings || []} onStatus={handleStatus} />
    </>
  );
}

function BookingsTable({ rows, onStatus }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr>{["Ref","Customer","Package","Date","Amount","Status","Action"].map(h=><th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td className={styles.tdMono}>{b.ref_code}</td>
              <td className={styles.tdBold}>{b.customer_name || b.guest_name}</td>
              <td>{b.package_name}</td>
              <td>{b.start_date ? new Date(b.start_date).toLocaleDateString("en-IN") : b.date}</td>
              <td className={styles.tdGold}>${parseFloat(b.total_price||0).toLocaleString()}</td>
              <td><span className={`${styles.badge} ${styles[b.status]}`}>{b.status}</span></td>
              <td>
                {onStatus && b.status === "pending" && (
                  <button className={styles.actionBtn} onClick={() => onStatus(b.id, "confirmed")}>Confirm</button>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} style={{textAlign:"center",padding:"32px",color:"rgba(245,240,232,.3)"}}>No bookings found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function PackagesTab({ showToast }) {
  const { data, loading, execute: reload } = useApi(() => api.getPackages(), []);
  const handleToggle = async (pkg) => {
    try { await api.updatePackage(pkg.id, { is_active: !pkg.is_active }); reload(); showToast("Package updated", "success"); }
    catch (err) { showToast(err.message, "error"); }
  };
  if (loading) return <Spinner />;
  return (
    <>
      <h2 className={styles.tableTitle}>All Packages</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr>{["Package","Destination","Duration","Price","Active"].map(h=><th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {(data?.packages || []).map((p) => (
              <tr key={p.id}>
                <td className={styles.tdBold}>{p.name}</td>
                <td>{p.destination}</td>
                <td>{p.duration_days}d</td>
                <td className={styles.tdGold}>${parseFloat(p.price).toLocaleString()}</td>
                <td>
                  <button className={`${styles.actionBtn} ${p.is_active ? styles.activeBtn : ""}`}
                    onClick={() => handleToggle(p)}>{p.is_active ? "Active" : "Inactive"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function UsersTab() {
  const { data, loading } = useApi(() => api.getAdminUsers(), []);
  if (loading) return <Spinner />;
  return (
    <>
      <h2 className={styles.tableTitle}>All Users</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr>{["Name","Email","Role","Joined"].map(h=><th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {(data?.users || []).map((u) => (
              <tr key={u.id}>
                <td className={styles.tdBold}>{u.name}</td>
                <td>{u.email}</td>
                <td><span className={`${styles.badge} ${u.role==="admin"?styles.confirmed:styles.pending}`}>{u.role}</span></td>
                <td>{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Spinner() {
  return <div style={{display:"flex",justifyContent:"center",padding:"48px"}}><div style={{width:32,height:32,border:"3px solid rgba(255,255,255,.1)",borderTopColor:"#c4622d",borderRadius:"50%",animation:"spin .8s linear infinite"}} /></div>;
}
