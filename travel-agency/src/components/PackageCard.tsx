import { Link } from "react-router-dom";
import type { TravelPackage } from "../types";
import styles from "./PackageCard.module.css";

interface Props {
  pkg: TravelPackage;
  onBook: (pkg: TravelPackage) => void;
}

export default function PackageCard({ pkg, onBook }: Props) {
  const to = `/packages/${pkg.id}`;
  return (
    <article className={styles.card}>
      <Link to={to} className={styles.img} style={{ background: pkg.bg_gradient ?? undefined, textDecoration: "none" }} aria-label={`View ${pkg.name}`}>
        <span className={styles.emoji}>{pkg.emoji}</span>
        {pkg.badge && <span className={styles.badge}>{pkg.badge}</span>}
      </Link>
      <div className={styles.body}>
        <p className={styles.dest}>{pkg.destination}</p>
        <h3 className={styles.name}><Link to={to} style={{ color: "inherit", textDecoration: "none" }}>{pkg.name}</Link></h3>
        <p className={styles.desc}>{pkg.description}</p>
        <div className={styles.meta}>
          <div className={styles.metaItem}><strong>{pkg.duration_days} Days</strong>Duration</div>
          <div className={styles.metaItem}><strong>{pkg.group_min}–{pkg.group_max}</strong>Group Size</div>
        </div>
        <div className={styles.footer}>
          <div className={styles.price}>
            ${parseFloat(pkg.price).toLocaleString()} <span>/ person</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link to={to} className={styles.detailBtn} style={{ textDecoration: "none" }}>Details</Link>
            <button className={styles.bookBtn} onClick={() => onBook(pkg)}>Book</button>
          </div>
        </div>
      </div>
    </article>
  );
}
