import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { errorMessage } from "../api/client";
import { useAuth } from "../context/useAuth";
import styles from "./Auth.module.css";

type Key = "name" | "email" | "phone" | "password" | "confirm";
type Errors = Partial<Record<Key | "form", string>>;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fields, setFields] = useState<Record<Key, string>>({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const set = (k: Key) => (e: ChangeEvent<HTMLInputElement>) => {
    setFields((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (fields.name.trim().length < 2) e.name = "Name must be at least 2 characters";
    if (!/\S+@\S+\.\S+/.test(fields.email)) e.email = "Enter a valid email";
    if (fields.password.length < 8) e.password = "At least 8 characters";
    else if (!/[A-Z]/.test(fields.password)) e.password = "Must contain an uppercase letter";
    else if (!/[0-9]/.test(fields.password)) e.password = "Must contain a number";
    if (fields.password !== fields.confirm) e.confirm = "Passwords do not match";
    return e;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setBusy(true);
    try {
      await register(fields.name.trim(), fields.email.trim(), fields.password, fields.phone.trim());
      navigate("/dashboard");
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const cls = (k: Key) => `${styles.input} ${errors[k] ? styles.inputErr : ""}`;

  return (
    <div className={styles.page}>
      <div className={styles.bgLeft} />
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <Link to="/" className={styles.logoRow} style={{ textDecoration: "none" }}>
          <span className={styles.logo}>Voyage<span>.</span></span>
        </Link>
        <h1 className={styles.title}>Create account</h1>
        <p className={styles.sub}>Create a demo account to try bookings</p>

        {errors.form && <div className={styles.errorBox} role="alert">{errors.form}</div>}

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-name">Full Name *</label>
            <input id="reg-name" className={cls("name")} autoComplete="name" placeholder="Jane Doe" value={fields.name} onChange={set("name")} />
            {errors.name && <span className={styles.err}>{errors.name}</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-phone">Phone</label>
            <input id="reg-phone" className={styles.input} type="tel" autoComplete="tel" placeholder="+1 555 0100" value={fields.phone} onChange={set("phone")} />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="reg-email">Email *</label>
          <input id="reg-email" className={cls("email")} type="email" autoComplete="email" placeholder="you@example.com" value={fields.email} onChange={set("email")} />
          {errors.email && <span className={styles.err}>{errors.email}</span>}
        </div>

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-password">Password *</label>
            <input id="reg-password" className={cls("password")} type="password" autoComplete="new-password"
              placeholder="Min 8 chars, 1 uppercase, 1 number" value={fields.password} onChange={set("password")} />
            {errors.password && <span className={styles.err}>{errors.password}</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-confirm">Confirm Password *</label>
            <input id="reg-confirm" className={cls("confirm")} type="password" autoComplete="new-password" placeholder="••••••••"
              value={fields.confirm} onChange={set("confirm")} />
            {errors.confirm && <span className={styles.err}>{errors.confirm}</span>}
          </div>
        </div>

        <button className={styles.submit} type="submit" disabled={busy}>
          {busy ? "Creating account…" : "Create Account →"}
        </button>

        <p className={styles.switchText}>
          Already have an account? <Link to="/login" className={styles.switchLink}>Sign in</Link>
        </p>
      </form>
    </div>
  );
}
