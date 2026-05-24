import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useApi } from "../hooks/useApi";
import BookingModal from "../components/BookingModal";
import styles from "./PackageDetail.module.css";

export default function PackageDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [modal, setModal] = useState(false);

  const { data, loading, error } = useApi(() => api.getPackage(id), [id]);

  if (loading) return (
    <div className={styles.loading}>
      <div className={styles.spinner} />
      <p>Loading package details…</p>
    </div>
  );

  if (error || !data) return (
    <div className={styles.errorPage}>
      <p>Package not found.</p>
      <button onClick={() => navigate("/packages")}>← Back to Packages</button>
    </div>
  );

  const { package: pkg, reviews } = data;

  const dayByDay = [
    { day: 1,   title: "Arrival & Welcome",       desc: "Airport transfer, hotel check-in, welcome dinner and orientation briefing." },
    { day: 2,   title: pkg.highlights?.[0] || "Exploration Day 1", desc: "Full-day guided tour with your specialist. Breakfast included." },
    { day: 3,   title: pkg.highlights?.[1] || "Exploration Day 2", desc: "Deeper immersion into local culture, cuisine, and landmarks." },
    { day: 4,   title: "Free Exploration",         desc: "Your day to explore at your own pace with optional guided activities." },
    { day: 5,   title: pkg.highlights?.[2] || "Adventure Day",     desc: "Signature experience unique to this destination." },
    { day: pkg.duration_days, title: "Farewell & Departure", desc: "Leisurely breakfast, last-minute shopping, airport transfer." },
  ];

  return (
    <>
      {/* Hero */}
      <div className={styles.hero} style={{ background: pkg.bg_gradient }}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <button className={styles.backBtn} onClick={() => navigate("/packages")}>← All Packages</button>
          <div className={styles.heroBadge}>{pkg.badge}</div>
          <h1 className={styles.heroTitle}>{pkg.name}</h1>
          <p className={styles.heroDest}>{pkg.destination}</p>
          <div className={styles.heroMeta}>
            <span>{pkg.duration_days} days</span>
            <span>·</span>
            <span>{pkg.group_min}–{pkg.group_max} guests</span>
            <span>·</span>
            <span>★ {parseFloat(pkg.avg_rating).toFixed(1)} ({pkg.review_count} reviews)</span>
          </div>
        </div>
        <div className={styles.heroPriceBox}>
          <p className={styles.heroFrom}>From</p>
          <p className={styles.heroPrice}>${parseFloat(pkg.price).toLocaleString()}</p>
          <p className={styles.heroPer}>per person</p>
          <button className={styles.bookHeroBtn} onClick={() => setModal(true)}>Book Now</button>
        </div>
      </div>

      <div className={styles.body}>
        {/* Left column */}
        <div className={styles.main}>
          {/* About */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>About this journey</h2>
            <p className={styles.description}>{pkg.description}</p>
          </section>

          {/* Highlights */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>What's included</h2>
            <div className={styles.highlightGrid}>
              {(pkg.highlights || []).map((h, i) => (
                <div key={i} className={styles.highlightItem}>
                  <span className={styles.hlCheck}>✓</span>
                  <span>{h}</span>
                </div>
              ))}
              <div className={styles.highlightItem}><span className={styles.hlCheck}>✓</span><span>All accommodation</span></div>
              <div className={styles.highlightItem}><span className={styles.hlCheck}>✓</span><span>Airport transfers</span></div>
              <div className={styles.highlightItem}><span className={styles.hlCheck}>✓</span><span>Specialist guide</span></div>
              <div className={styles.highlightItem}><span className={styles.hlCheck}>✓</span><span>24/7 support</span></div>
            </div>
          </section>

          {/* Itinerary */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Day-by-day itinerary</h2>
            <div className={styles.timeline}>
              {dayByDay.map((d, i) => (
                <div key={i} className={styles.timelineItem}>
                  <div className={styles.timelineDot}>
                    <span>{d.day}</span>
                  </div>
                  <div className={styles.timelineContent}>
                    <h3 className={styles.timelineTitle}>{d.title}</h3>
                    <p className={styles.timelineDesc}>{d.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Reviews */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Traveller Reviews
              {pkg.review_count > 0 && <span className={styles.reviewCount}> ({pkg.review_count})</span>}
            </h2>
            {reviews.length === 0 ? (
              <p className={styles.noReviews}>No reviews yet — be the first to travel and share your story.</p>
            ) : (
              <div className={styles.reviewsList}>
                {reviews.map((r) => (
                  <div key={r.id} className={styles.reviewCard}>
                    <div className={styles.reviewHeader}>
                      <div className={styles.reviewAvatar}>{r.author_name?.[0] || "?"}</div>
                      <div>
                        <p className={styles.reviewAuthor}>{r.author_name || "Anonymous"}</p>
                        <p className={styles.reviewDate}>{new Date(r.created_at).toLocaleDateString("en-IN", { year:"numeric", month:"short" })}</p>
                      </div>
                      <div className={styles.reviewStars}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                    </div>
                    {r.review_text && <p className={styles.reviewText}>{r.review_text}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sticky sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sideCard}>
            <p className={styles.sideFrom}>From</p>
            <p className={styles.sidePrice}>${parseFloat(pkg.price).toLocaleString()}<span>/person</span></p>
            <div className={styles.sideMeta}>
              <div><strong>{pkg.duration_days}</strong><span>Days</span></div>
              <div><strong>{pkg.group_min}–{pkg.group_max}</strong><span>Guests</span></div>
              <div><strong>★{parseFloat(pkg.avg_rating).toFixed(1)}</strong><span>Rating</span></div>
            </div>
            <button className={styles.sideBookBtn} onClick={() => setModal(true)}>Request Booking</button>
            <p className={styles.sideNote}>No payment today. Our specialist confirms within 24 hours.</p>
          </div>

          <div className={styles.sideCard}>
            <p className={styles.sideLabel}>Region</p>
            <p className={styles.sideValue}>{pkg.region?.charAt(0).toUpperCase() + pkg.region?.slice(1)}</p>
            <p className={styles.sideLabel} style={{marginTop:12}}>Destination</p>
            <p className={styles.sideValue}>{pkg.destination}</p>
            <p className={styles.sideLabel} style={{marginTop:12}}>Group size</p>
            <p className={styles.sideValue}>{pkg.group_min} – {pkg.group_max} people</p>
          </div>
        </aside>
      </div>

      <BookingModal pkg={modal ? pkg : null} onClose={() => setModal(false)} />
    </>
  );
}
