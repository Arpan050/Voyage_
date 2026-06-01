import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <nav className={styles.nav}>
      <div className={styles.logo} onClick={() => navigate("/")}>Voyage<span>.</span></div>
      <div className={styles.links}>
        <NavLink to="/"           className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link} end>Home</NavLink>
        <NavLink to="/packages"   className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>Packages</NavLink>
        <NavLink to="/concierge"  className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>AI Concierge</NavLink>
        {user ? (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>My Trips</NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>Admin</NavLink>
            )}
            <div className={styles.userMenu}>
              <div className={styles.avatar}>{user.name?.[0]?.toUpperCase()}</div>
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
            <button className={styles.navBtn}  onClick={() => navigate("/register")}>Get Started</button>
          </>
        )}
      </div>
    </nav>
  );
}
