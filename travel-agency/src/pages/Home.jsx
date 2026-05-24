import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DESTINATIONS, REVIEWS } from "../data/data";
import BookingModal from "../components/BookingModal";
import styles from "./Home.module.css";

export default function Home() {
  const navigate  = useNavigate();
  const [dest, setDest]   = useState("");
  const [modal, setModal] = useState(null);

  const handleSearch = () => navigate(`/packages?q=${encodeURIComponent(dest)}`);

  return (
    <>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroGrid} />
        <div className={`${styles.heroContent} fade-up`}>
          <p className={styles.heroTag}>— Curated Expeditions Since 2018 —</p>
          <h1 className={styles.heroTitle}>Travel beyond<br/>the <em>ordinary</em></h1>
          <p className={styles.heroSub}>
            Handcrafted itineraries for the discerning traveller. From Aegean sunsets
            to Himalayan horizons — we turn journeys into stories.
          </p>
          <div className={styles.heroActions}>
            <button className={styles.btnPrimary} onClick={() => navigate("/packages")}>Explore Packages</button>
            <button className={styles.btnOutline} onClick={() => navigate("/concierge")}>AI Concierge</button>
          </div>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}><div className={styles.heroStatNum}>2,400+</div><div className={styles.heroStatLabel}>Journeys Crafted</div></div>
          <div className={styles.heroStat}><div className={styles.heroStatNum}>68</div><div className={styles.heroStatLabel}>Destinations</div></div>
          <div className={styles.heroStat}><div className={styles.heroStatNum}>4.9★</div><div className={styles.heroStatLabel}>Avg. Rating</div></div>
        </div>
      </section>

      {/* Search */}
      <section className={styles.searchSection}>
        <p className={styles.sectionLabel}>Find Your Journey</p>
        <h2 className={styles.sectionTitle}>Where to next?</h2>
        <div className={styles.searchBar}>
          <div className={styles.searchField}>
            <label>Destination</label>
            <input
              placeholder="Paris, Bali, Tokyo…"
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className={styles.searchField}>
            <label>Travel Month</label>
            <input type="month" />
          </div>
          <div className={styles.searchField}>
            <label>Travellers</label>
            <select defaultValue="2">
              <option>1</option><option>2</option><option>3–5</option><option>6+</option>
            </select>
          </div>
          <button className={styles.searchBtn} onClick={handleSearch}>Search</button>
        </div>
      </section>

      {/* Destinations */}
      <section className={styles.section}>
        <p className={styles.sectionLabel}>Top Regions</p>
        <h2 className={styles.sectionTitle}>Explore by Destination</h2>
        <div className={styles.destGrid}>
          {DESTINATIONS.map((d, i) => (
            <div key={i} className={`${styles.destCard} ${i === 0 ? styles.destBig : ""}`}
              style={{ background: d.bg }} onClick={() => navigate("/packages")}>
              <span className={styles.destEmoji}>{d.emoji}</span>
              <div className={styles.destOverlay} />
              <div className={styles.destInfo}>
                <div className={styles.destName}>{d.name}</div>
                <div className={styles.destCount}>{d.count}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className={styles.reviews}>
        <p className={styles.sectionLabel}>Traveller Stories</p>
        <h2 className={styles.sectionTitle}>What our guests say</h2>
        <div className={styles.reviewsGrid}>
          {REVIEWS.map((r, i) => (
            <div key={i} className={styles.reviewCard}>
              <div className={styles.reviewStars}>{"★".repeat(r.stars)}</div>
              <p className={styles.reviewText}>"{r.text}"</p>
              <div className={styles.reviewAuthor}>{r.author}</div>
              <div className={styles.reviewTrip}>{r.trip}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>Voyage<span>.</span></div>
        <div className={styles.footerCopy}>© 2025 Voyage Travel · Built by Arpan Paul</div>
      </footer>

      <BookingModal pkg={modal} onClose={() => setModal(null)} />
    </>
  );
}
