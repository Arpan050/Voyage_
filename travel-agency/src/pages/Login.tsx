import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { errorMessage } from "../api/client";
import { useAuth } from "../context/useAuth";
import styles from "./Auth.module.css";

// Shown only when the deployment opts in (VITE_DEMO_MODE=true) — never on a real site.
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [fields, setFields] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: "email" | "password") => (e: ChangeEvent<HTMLInputElement>) =>
    setFields((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fields.email || !fields.password) { setError("Please fill in all fields."); return; }
    setBusy(true);
    setError("");
    try {
      const user = await login(fields.email.trim(), fields.password);
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgLeft} />
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <Link to="/" className={styles.logoRow} style={{ textDecoration: "none" }}>
          <span className={styles.logo}>Voyage<span>.</span></span>
        </Link>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.sub}>Sign in to your account</p>

        {error && <div className={styles.errorBox} role="alert">{error}</div>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-email">Email</label>
          <input id="login-email" className={styles.input} type="email" autoComplete="email" placeholder="you@example.com"
            value={fields.email} onChange={set("email")} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-password">Password</label>
          <input id="login-password" className={styles.input} type="password" autoComplete="current-password" placeholder="••••••••"
            value={fields.password} onChange={set("password")} />
        </div>

        <button className={styles.submit} type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign In →"}
        </button>

        <p className={styles.switchText}>
          Don't have an account? <Link to="/register" className={styles.switchLink}>Create one</Link>
        </p>

        {DEMO_MODE && (
          <div className={styles.demoBox}>
            <p className={styles.demoLabel}>Demo credentials (portfolio build)</p>
            <p className={styles.demoItem}>Admin: <code>admin@voyage.com</code> / <code>Admin@1234</code></p>
          </div>
        )}
      </form>
    </div>
  );
}
