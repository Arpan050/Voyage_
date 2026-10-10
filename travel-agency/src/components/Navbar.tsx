import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import styles from "./Navbar.module.css";

const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? `${styles.link} ${styles.active}` : styles.link);

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <nav className={styles.nav} aria-label="Main">
      <Link to="/" className={styles.logo} style={{ textDecoration: "none" }}>Voyage<span>.</span></Link>
      <div className={styles.links}>
        <NavLink to="/" className={linkClass} end>Home</NavLink>
        <NavLink to="/packages" className={linkClass}>Packages</NavLink>
        <NavLink to="/concierge" className={linkClass}>AI Concierge</NavLink>
        {user ? (
          <>
            <NavLink to="/dashboard" className={linkClass}>My Trips</NavLink>
            {isAdmin && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
            <div className={styles.userMenu}>
              <div className={styles.avatar} aria-hidden="true">{user.name[0]?.toUpperCase()}</div>
              <div className={styles.dropdown}>
                <p className={styles.dropName}>{user.name}</p>
                <p className={styles.dropEmail}>{user.email}</p>
                <hr className={styles.dropDivider} />
                <button className={styles.dropItem} onClick={() => navigate("/dashboard")}>My Bookings</button>
                <button className={styles.dropItem} onClick={handleLogout}>Sign Out</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <button className={styles.linkBtn} onClick={() => navigate("/login")}>Sign In</button>
            <button className={styles.navBtn} onClick={() => navigate("/register")}>Get Started</button>
          </>
        )}
      </div>
    </nav>
  );
}
