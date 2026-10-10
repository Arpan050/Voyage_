import { useEffect, useId, useState, type ChangeEvent } from "react";
import { api, errorMessage } from "../api/client";
import { useAuth } from "../context/useAuth";
import type { TravelPackage } from "../types";
import styles from "./BookingModal.module.css";

interface Fields { name: string; email: string; phone: string; travelers: string; date: string; notes: string }
type FieldErrors = Partial<Record<keyof Fields | "form", string>>;

const EMPTY: Fields = { name: "", email: "", phone: "", travelers: "2", date: "", notes: "" };

interface Props {
  pkg: TravelPackage | null;
  onClose: () => void;
}

/** Tomorrow, in the user's local timezone, as YYYY-MM-DD (the API requires a future date). */
function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function BookingModal({ pkg, onClose }: Props) {
  const { user } = useAuth();
  const uid = useId();
  const [fields, setFields] = useState<Fields>({ ...EMPTY, travelers: "2" });
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [refCode, setRefCode] = useState<string | null>(null);

  const close = () => { setFields(EMPTY); setStep(1); setErrors({}); setRefCode(null); onClose(); };

  useEffect(() => {
    if (!pkg) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg]);

  if (!pkg) return null;

  const set = (k: keyof Fields) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFields((prev) => ({ ...prev, [k]: e.target.value }));
    setErrors((prev) => ({ ...prev, [k]: "" }));
  };

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!user) {
      if (!fields.name.trim()) errs.name = "Name is required";
      if (!fields.email.trim()) errs.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(fields.email)) errs.email = "Invalid email";
    }
    if (!fields.date) errs.date = "Please pick a start date";
    else if (fields.date < tomorrow()) errs.date = "Start date must be in the future";
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setBusy(true);
    try {
      const data = await api.createBooking({
        package_id: pkg.id,
        travelers: parseInt(fields.travelers, 10),
        start_date: fields.date,
        special_notes: fields.notes || undefined,
        ...(!user && { guest_name: fields.name.trim(), guest_email: fields.email.trim(), guest_phone: fields.phone || undefined }),
      });
      setRefCode(data.refCode);
      setStep(2);
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const maxTravelers = Math.min(pkg.group_max, 12);
  const travelerCount = parseInt(fields.travelers, 10) || 1;
  const total = (parseFloat(pkg.price) * travelerCount).toLocaleString();
  const titleId = `${uid}-title`;
  const id = (k: string) => `${uid}-${k}`;

  return (
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className={styles.header}>
          <div>
            <p className={styles.headerTag}>{pkg.destination}</p>
            <h2 className={styles.headerTitle} id={titleId}>{pkg.name}</h2>
            <p className={styles.headerMeta}>{pkg.duration_days} days · ${parseFloat(pkg.price).toLocaleString()}/person</p>
          </div>
          <button className={styles.close} onClick={close} aria-label="Close">✕</button>
        </div>

        <div className={styles.body}>
          {step === 1 ? (
            <>
              {!!pkg.highlights?.length && (
                <div className={styles.highlights}>
                  <p className={styles.hlLabel}>Package highlights</p>
                  <div className={styles.hlChips}>
                    {pkg.highlights.map((h) => <span key={h} className={styles.chip}>{h}</span>)}
                  </div>
                </div>
              )}

              {errors.form && (
                <div role="alert" style={{ background: "rgba(226,75,74,.08)", border: "1px solid rgba(226,75,74,.3)", color: "#c0392b", borderRadius: 3, padding: "10px 14px", fontSize: ".84rem", marginBottom: 16 }}>
                  {errors.form}
                </div>
              )}

              {!user ? (
                <div className={styles.grid}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={id("name")}>Full Name *</label>
                    <input id={id("name")} className={`${styles.input} ${errors.name ? styles.inputErr : ""}`}
                      type="text" autoComplete="name" placeholder="Jane Doe" value={fields.name} onChange={set("name")} />
                    {errors.name && <span className={styles.err}>{errors.name}</span>}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={id("email")}>Email *</label>
                    <input id={id("email")} className={`${styles.input} ${errors.email ? styles.inputErr : ""}`}
                      type="email" autoComplete="email" placeholder="you@example.com" value={fields.email} onChange={set("email")} />
                    {errors.email && <span className={styles.err}>{errors.email}</span>}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={id("phone")}>Phone</label>
                    <input id={id("phone")} className={styles.input} type="tel" autoComplete="tel" placeholder="+1 555 0100" value={fields.phone} onChange={set("phone")} />
                  </div>
                </div>
              ) : (
                <div className={styles.loggedInBox}>
                  Booking as <strong>{user.name}</strong> ({user.email})
                </div>
              )}

              <div className={styles.grid}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={id("travelers")}>Travellers</label>
                  <select id={id("travelers")} className={styles.input} value={fields.travelers} onChange={set("travelers")}>
                    {Array.from({ length: maxTravelers }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? "person" : "people"}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={id("date")}>Preferred Start Date *</label>
                  <input id={id("date")} className={`${styles.input} ${errors.date ? styles.inputErr : ""}`}
                    type="date" value={fields.date} min={tomorrow()} onChange={set("date")} />
                  {errors.date && <span className={styles.err}>{errors.date}</span>}
                </div>
                <div className={`${styles.field} ${styles.full}`}>
                  <label className={styles.label} htmlFor={id("notes")}>Special Requests</label>
                  <textarea id={id("notes")} className={styles.input} rows={3} maxLength={1000}
                    placeholder="Dietary needs, accessibility, anniversary surprises…"
                    value={fields.notes} onChange={set("notes")} style={{ resize: "vertical" }} />
                </div>
              </div>

              <div className={styles.pricebar}>
                <div>
                  <p className={styles.priceLabel}>Total estimate</p>
                  <p className={styles.priceValue}>${total}</p>
                </div>
                <p className={styles.priceNote}>Demo project: no payment is taken.</p>
              </div>

              <button className={styles.submit} onClick={handleSubmit} disabled={busy}>
                {busy ? "Submitting…" : "Request Booking →"}
              </button>
            </>
          ) : (
            <div className={styles.success}>
              <div className={styles.successIcon}>✈️</div>
              <h3 className={styles.successTitle}>Request received</h3>
              <p className={styles.successText}>Your booking request for</p>
              <p className={styles.successPkg}>{pkg.name}</p>
              <p className={styles.successText}>
                is now <strong>pending</strong>. In this demo, an admin confirms or rejects it from the dashboard — no real trip is booked and nothing is charged.
              </p>
              {refCode && <p className={styles.refCode}>{refCode}</p>}
              <button className={styles.submit} onClick={close}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
