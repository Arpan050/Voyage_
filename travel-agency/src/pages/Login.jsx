import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./Auth.module.css";

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [fields, setFields] = useState({ email: "", password: "" });
  const [error,  setError]  = useState("");
  const [busy,   setBusy]   = useState(false);

  const set = (k) => (e) => setFields((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!fields.email || !fields.password) { setError("Please fill in all fields."); return; }
    setBusy(true); setError("");
    try {
      const user = await login(fields.email, fields.password);
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally { setBusy(false); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgLeft} />
      <div className={styles.card}>
        <div className={styles.logoRow} onClick={() => navigate("/")}>
          <span className={styles.logo}>Voyage<span>.</span></span>
        </div>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.sub}>Sign in to your account</p>

        {error && <div className={styles.errorBox}>{error}</div>}

        <div className={styles.field}>
          <label className={styles.label}>Email</label>
          <input className={styles.input} type="email" placeholder="hello@voyage.com"
            value={fields.email} onChange={set("email")}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Password</label>
          <input className={styles.input} type="password" placeholder="••••••••"
            value={fields.password} onChange={set("password")}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        </div>

        <button className={styles.submit} onClick={handleSubmit} disabled={busy}>
          {busy ? "Signing in…" : "Sign In →"}
        </button>

        <p className={styles.switchText}>
          Don't have an account? <Link to="/register" className={styles.switchLink}>Create one</Link>
        </p>

        <div className={styles.demoBox}>
          <p className={styles.demoLabel}>Demo credentials</p>
          <p className={styles.demoItem}>Admin: <code>admin@voyage.com</code> / <code>Admin@1234</code></p>
        </div>
      </div>
    </div>
  );
}
