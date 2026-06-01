import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/useAuth";
import styles from "./BookingModal.module.css";

const EMPTY = { name:"", email:"", phone:"", travelers:"2", date:"", notes:"" };

export default function BookingModal({ pkg, onClose }) {
  const { user } = useAuth();
  const [fields, setFields] = useState(EMPTY);
  const [step, setStep]     = useState(1);
  const [busy, setBusy]     = useState(false);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);

  if (!pkg) return null;

  const set = (k) => (e) => {
    setFields((prev) => ({ ...prev, [k]: e.target.value }));
    setErrors((prev) => ({ ...prev, [k]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!user) {
      if (!fields.name.trim())  errs.name  = "Name is required";
      if (!fields.email.trim()) errs.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(fields.email)) errs.email = "Invalid email";
    }
    if (!fields.date) errs.date = "Please pick a start date";
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setBusy(true);
    try {
      const payload = {
        package_id:    pkg.id,
        travelers:     parseInt(fields.travelers),
        start_date:    fields.date,
        special_notes: fields.notes || undefined,
        ...(!user && { guest_name: fields.name, guest_email: fields.email, guest_phone: fields.phone }),
      };
      const data = await api.createBooking(payload);
      setResult(data);
      setStep(2);
    } catch (err) {
      setErrors({ form: err.message || "Booking failed. Please try again." });
    } finally { setBusy(false); }
  };

  const handleClose = () => { setFields(EMPTY); setStep(1); setErrors({}); setResult(null); onClose(); };

  const total   = (parseFloat(pkg.price) * (parseInt(fields.travelers) || 2)).toLocaleString();
  const today   = new Date().toISOString().split("T")[0];

  return (
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <div>
            <p className={styles.headerTag}>{pkg.destination}</p>
            <h2 className={styles.headerTitle}>{pkg.name}</h2>
            <p className={styles.headerMeta}>{pkg.duration_days || pkg.duration} · ${parseFloat(pkg.price).toLocaleString()}/person</p>
          </div>
          <button className={styles.close} onClick={handleClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.body}>
          {step === 1 ? (
            <>
              <div className={styles.highlights}>
                <p className={styles.hlLabel}>Package highlights</p>
                <div className={styles.hlChips}>
                  {(pkg.highlights || []).map((h) => <span key={h} className={styles.chip}>{h}</span>)}
                </div>
              </div>

              {errors.form && (
                <div style={{background:"rgba(226,75,74,.08)",border:"1px solid rgba(226,75,74,.3)",color:"#c0392b",borderRadius:3,padding:"10px 14px",fontSize:".84rem",marginBottom:16}}>
                  {errors.form}
                </div>
              )}

              {/* Guest fields only if not logged in */}
              {!user && (
                <div className={styles.grid}>
                  <div className={styles.field}>
                    <label className={styles.label}>Full Name *</label>
                    <input className={`${styles.input} ${errors.name ? styles.inputErr : ""}`}
                      type="text" placeholder="Arpan Paul" value={fields.name} onChange={set("name")} />
                    {errors.name && <span className={styles.err}>{errors.name}</span>}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Email *</label>
                    <input className={`${styles.input} ${errors.email ? styles.inputErr : ""}`}
                      type="email" placeholder="hello@voyage.com" value={fields.email} onChange={set("email")} />
                    {errors.email && <span className={styles.err}>{errors.email}</span>}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Phone</label>
                    <input className={styles.input} type="tel" placeholder="+91 98832 04577" value={fields.phone} onChange={set("phone")} />
                  </div>
                </div>
              )}

              {user && (
                <div className={styles.loggedInBox}>
                  Booking as <strong>{user.name}</strong> ({user.email})
                </div>
              )}

              <div className={styles.grid}>
                <div className={styles.field}>
                  <label className={styles.label}>Travellers</label>
                  <select className={styles.input} value={fields.travelers} onChange={set("travelers")}>
                    {[1,2,3,4,5,6,7,8].map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? "person" : "people"}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Preferred Start Date *</label>
                  <input className={`${styles.input} ${errors.date ? styles.inputErr : ""}`}
                    type="date" value={fields.date} min={today} onChange={set("date")} />
                  {errors.date && <span className={styles.err}>{errors.date}</span>}
                </div>
                <div className={`${styles.field} ${styles.full}`}>
                  <label className={styles.label}>Special Requests</label>
                  <textarea className={styles.input} rows={3}
                    placeholder="Dietary needs, accessibility, anniversary surprises…"
                    value={fields.notes} onChange={set("notes")} style={{ resize:"vertical" }} />
                </div>
              </div>

              <div className={styles.pricebar}>
                <div>
                  <p className={styles.priceLabel}>Total estimate</p>
                  <p className={styles.priceValue}>${total}</p>
                </div>
                <p className={styles.priceNote}>Final price confirmed after review. No payment today.</p>
              </div>

              <button className={styles.submit} onClick={handleSubmit} disabled={busy}>
                {busy ? "Submitting…" : "Request Booking →"}
              </button>
            </>
          ) : (
            <div className={styles.success}>
              <div className={styles.successIcon}>✈️</div>
              <h3 className={styles.successTitle}>Booking Confirmed!</h3>
              <p className={styles.successText}>Your request for</p>
              <p className={styles.successPkg}>{pkg.name}</p>
              <p className={styles.successText}>has been received. Our travel specialist will reach out within 24 hours with your personalised itinerary.</p>
              <p className={styles.refCode}>{result?.refCode || "TRP-CONFIRMED"}</p>
              <button className={styles.submit} onClick={handleClose}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
