import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./Auth.module.css";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fields, setFields] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [busy,   setBusy]   = useState(false);

  const set = (k) => (e) => {
    setFields((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!fields.name.trim())    e.name    = "Name is required";
    if (!fields.email.trim())   e.email   = "Email is required";
    if (fields.password.length < 8) e.password = "At least 8 characters";
    else if (!/[A-Z]/.test(fields.password)) e.password = "Must contain an uppercase letter";
    else if (!/[0-9]/.test(fields.password)) e.password = "Must contain a number";
    if (fields.password !== fields.confirm) e.confirm = "Passwords do not match";
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setBusy(true);
    try {
      await register(fields.name, fields.email, fields.password, fields.phone);
      navigate("/dashboard");
    } catch (err) {
      setErrors({ form: err.message || "Registration failed" });
    } finally { setBusy(false); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgLeft} />
      <div className={styles.card}>
        <div className={styles.logoRow} onClick={() => navigate("/")}>
          <span className={styles.logo}>Voyage<span>.</span></span>
        </div>
        <h1 className={styles.title}>Create account</h1>
        <p className={styles.sub}>Start your journey with us</p>

        {errors.form && <div className={styles.errorBox}>{errors.form}</div>}

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Full Name *</label>
            <input className={`${styles.input} ${errors.name ? styles.inputErr : ""}`}
              placeholder="Arpan Paul" value={fields.name} onChange={set("name")} />
            {errors.name && <span className={styles.err}>{errors.name}</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Phone</label>
            <input className={styles.input} type="tel"
              placeholder="+91 98832 04577" value={fields.phone} onChange={set("phone")} />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Email *</label>
          <input className={`${styles.input} ${errors.email ? styles.inputErr : ""}`}
            type="email" placeholder="hello@voyage.com" value={fields.email} onChange={set("email")} />
          {errors.email && <span className={styles.err}>{errors.email}</span>}
        </div>

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Password *</label>
            <input className={`${styles.input} ${errors.password ? styles.inputErr : ""}`}
              type="password" placeholder="Min 8 chars, 1 uppercase, 1 number"
              value={fields.password} onChange={set("password")} />
            {errors.password && <span className={styles.err}>{errors.password}</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Confirm Password *</label>
            <input className={`${styles.input} ${errors.confirm ? styles.inputErr : ""}`}
              type="password" placeholder="••••••••"
              value={fields.confirm} onChange={set("confirm")}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
            {errors.confirm && <span className={styles.err}>{errors.confirm}</span>}
          </div>
        </div>

        <button className={styles.submit} onClick={handleSubmit} disabled={busy}>
          {busy ? "Creating account…" : "Create Account →"}
        </button>

        <p className={styles.switchText}>
          Already have an account? <Link to="/login" className={styles.switchLink}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
