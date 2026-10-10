import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useApi } from "../hooks/useApi";
import { REGIONS, type Region } from "../types";
import styles from "./Home.module.css";

const REGION_STYLE: Record<Region, { label: string; bg: string; emoji: string }> = {
  europe: { label: "Europe", bg: "#1a3050", emoji: "⛵" },
  asia: { label: "Asia", bg: "#2d4a3e", emoji: "🌴" },
  americas: { label: "Americas", bg: "#3d2a1e", emoji: "🌿" },
  africa: { label: "Africa", bg: "#2a1e3d", emoji: "🦓" },
  oceania: { label: "Oceania", bg: "#1e2d3d", emoji: "🐚" },
};

export default function Home() {
  const navigate = useNavigate();
  const [dest, setDest] = useState("");

  // Everything below comes from the database — no hardcoded claims.
  const stats = useApi(() => api.getPublicStats(), []);
  const catalogue = useApi(() => api.getPackages({ limit: 50 }), []);
  const reviews = useApi(() => api.getRecentReviews(), []);

  const regionCounts = REGIONS
    .map((r) => ({ region: r, count: (catalogue.data?.packages ?? []).filter((p) => p.region === r).length }))
    .filter((r) => r.count > 0);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(dest.trim() ? `/packages?q=${encodeURIComponent(dest.trim())}` : "/packages");
  };

  const s = stats.data;

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroGrid} />
        <div className={`${styles.heroContent} fade-up`}>
          <p className={styles.heroTag}>— A full-stack portfolio demo —</p>
          <h1 className={styles.heroTitle}>Travel beyond<br />the <em>ordinary</em></h1>
          <p className={styles.heroSub}>
            Browse sample tour packages, request a booking and watch it move through an admin review flow.
            Voyage is a demo of a modern travel-agency platform, not a real agency.
          </p>
          <div className={styles.heroActions}>
            <button className={styles.btnPrimary} onClick={() => navigate("/packages")}>Explore Packages</button>
            <button className={styles.btnOutline} onClick={() => navigate("/concierge")}>AI Concierge</button>
          </div>
        </div>
        {s && (
          <div className={styles.heroStats}>
            <div className={styles.heroStat}><div className={styles.heroStatNum}>{s.packages}</div><div className={styles.heroStatLabel}>Packages</div></div>
            <div className={styles.heroStat}><div className={styles.heroStatNum}>{s.destinations}</div><div className={styles.heroStatLabel}>Destinations</div></div>
            {s.avg_rating !== null && (
              <div className={styles.heroStat}><div className={styles.heroStatNum}>{s.avg_rating}★</div><div className={styles.heroStatLabel}>{s.reviews} {s.reviews === 1 ? "Review" : "Reviews"}</div></div>
            )}
          </div>
        )}
      </section>

      <section className={styles.searchSection}>
        <p className={styles.sectionLabel}>Find Your Journey</p>
        <h2 className={styles.sectionTitle}>Where to next?</h2>
        <form className={styles.searchBar} onSubmit={handleSearch} role="search">
          <div className={styles.searchField}>
            <label htmlFor="home-dest">Destination</label>
            <input id="home-dest" placeholder="Greece, Japan, Tanzania…" value={dest} onChange={(e) => setDest(e.target.value)} />
          </div>
          <button className={styles.searchBtn} type="submit">Search</button>
        </form>
      </section>

      {regionCounts.length > 0 && (
        <section className={styles.section}>
          <p className={styles.sectionLabel}>Top Regions</p>
          <h2 className={styles.sectionTitle}>Explore by Region</h2>
          <div className={styles.destGrid}>
            {regionCounts.map(({ region, count }, i) => {
              const st = REGION_STYLE[region];
              return (
                <Link key={region} to={`/packages?region=${region}`} style={{ background: st.bg, textDecoration: "none" }}
                  className={`${styles.destCard} ${i === 0 ? styles.destBig : ""}`}>
                  <span className={styles.destEmoji}>{st.emoji}</span>
                  <div className={styles.destOverlay} />
                  <div className={styles.destInfo}>
                    <div className={styles.destName}>{st.label}</div>
                    <div className={styles.destCount}>{count} {count === 1 ? "Package" : "Packages"}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {(reviews.data?.reviews.length ?? 0) > 0 && (
        <section className={styles.reviews}>
          <p className={styles.sectionLabel}>Traveller Stories</p>
          <h2 className={styles.sectionTitle}>Latest reviews</h2>
          <div className={styles.reviewsGrid}>
            {reviews.data!.reviews.map((r) => (
              <div key={r.id} className={styles.reviewCard}>
                <div className={styles.reviewStars} aria-label={`${r.rating} out of 5 stars`}>{"★".repeat(r.rating)}</div>
                <p className={styles.reviewText}>"{r.review_text}"</p>
                <div className={styles.reviewAuthor}>{r.author_name ?? "Former user"}</div>
                <div className={styles.reviewTrip}>{r.package_name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className={styles.footer}>
        <div className={styles.footerLogo}>Voyage<span>.</span></div>
        <div className={styles.footerCopy}>© {new Date().getFullYear()} Voyage · Portfolio demo project by Arpan Paul · Not a real agency; no trips are sold</div>
      </footer>
    </>
  );
}
