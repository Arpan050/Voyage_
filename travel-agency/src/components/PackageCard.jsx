import { useNavigate } from "react-router-dom";
import styles from "./PackageCard.module.css";

export default function PackageCard({ pkg, onBook }) {
  const navigate = useNavigate();
  return (
    <div className={styles.card}>
      <div className={styles.img} style={{ background: pkg.bg_gradient || pkg.bg }}
           onClick={() => navigate(`/packages/${pkg.id}`)}>
        <span className={styles.emoji}>{pkg.emoji}</span>
        <span className={styles.badge}>{pkg.badge}</span>
      </div>
      <div className={styles.body}>
        <p className={styles.dest}>{pkg.destination}</p>
        <h3 className={styles.name} onClick={() => navigate(`/packages/${pkg.id}`)} style={{cursor:"pointer"}}>{pkg.name}</h3>
        <p className={styles.desc}>{pkg.description || pkg.desc}</p>
        <div className={styles.meta}>
          <div className={styles.metaItem}><strong>{pkg.duration_days ? `${pkg.duration_days} Days` : pkg.duration}</strong>Duration</div>
          <div className={styles.metaItem}><strong>{pkg.group_min && pkg.group_max ? `${pkg.group_min}–${pkg.group_max}` : pkg.groupSize}</strong>Group Size</div>
        </div>
        <div className={styles.footer}>
          <div className={styles.price}>
            ${parseFloat(pkg.price).toLocaleString()} <span>/ person</span>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className={styles.detailBtn} onClick={() => navigate(`/packages/${pkg.id}`)}>Details</button>
            <button className={styles.bookBtn} onClick={() => onBook(pkg)}>Book</button>
          </div>
        </div>
      </div>
    </div>
  );
}
