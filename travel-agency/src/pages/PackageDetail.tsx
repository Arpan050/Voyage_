import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useApi } from "../hooks/useApi";
import BookingModal from "../components/BookingModal";
import styles from "./PackageDetail.module.css";

interface Step { day: number; title: string; desc: string }

/** Illustrative itinerary built from the package's real highlights; always fits the trip length. */
function sampleItinerary(highlights: string[], days: number): Step[] {
  const steps: Step[] = [{ day: 1, title: "Arrival", desc: "Arrive, settle in and meet the group." }];
  highlights.forEach((h, i) => {
    const day = i + 2;
    if (day < days) steps.push({ day, title: h, desc: "A signature experience on this trip." });
  });
  if (days > 1) steps.push({ day: days, title: "Departure", desc: "Wrap up and head home." });
  return steps;
}

export default function PackageDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  const itinerary = sampleItinerary(pkg.highlights ?? [], pkg.duration_days);
  const rating = pkg.review_count ? `★ ${(pkg.avg_rating ?? 0).toFixed(1)} (${pkg.review_count} ${pkg.review_count === 1 ? "review" : "reviews"})` : "No reviews yet";

  return (
    <>
      {/* Hero */}
      <div className={styles.hero} style={{ background: pkg.bg_gradient ?? undefined }}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <button className={styles.backBtn} onClick={() => navigate("/packages")}>← All Packages</button>
          {pkg.badge && <div className={styles.heroBadge}>{pkg.badge}</div>}
          <h1 className={styles.heroTitle}>{pkg.name}</h1>
          <p className={styles.heroDest}>{pkg.destination}</p>
          <div className={styles.heroMeta}>
            <span>{pkg.duration_days} days</span>
            <span>·</span>
            <span>{pkg.group_min}–{pkg.group_max} guests</span>
            <span>·</span>
            <span>{rating}</span>
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
            <h2 className={styles.sectionTitle}>Highlights</h2>
            <div className={styles.highlightGrid}>
              {(pkg.highlights ?? []).map((h) => (
                <div key={h} className={styles.highlightItem}>
                  <span className={styles.hlCheck}>✓</span>
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Itinerary */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Sample itinerary</h2>
            <p className={styles.noReviews}>Illustrative only. Real day-by-day plans would be added per package.</p>
            <div className={styles.timeline}>
              {itinerary.map((d) => (
                <div key={d.day} className={styles.timelineItem}>
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
              {(pkg.review_count ?? 0) > 0 && <span className={styles.reviewCount}> ({pkg.review_count})</span>}
            </h2>
            {reviews.length === 0 ? (
              <p className={styles.noReviews}>No reviews yet. Travellers can review a package once their trip is marked completed.</p>
            ) : (
              <div className={styles.reviewsList}>
                {reviews.map((r) => (
                  <div key={r.id} className={styles.reviewCard}>
                    <div className={styles.reviewHeader}>
                      <div className={styles.reviewAvatar}>{r.author_name?.[0] ?? "?"}</div>
                      <div>
                        <p className={styles.reviewAuthor}>{r.author_name ?? "Former user"}</p>
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
              <div><strong>{pkg.review_count ? `★${(pkg.avg_rating ?? 0).toFixed(1)}` : "–"}</strong><span>Rating</span></div>
            </div>
            <button className={styles.sideBookBtn} onClick={() => setModal(true)}>Request Booking</button>
            <p className={styles.sideNote}>Demo project: no payment is taken and no real trip is booked.</p>
          </div>

          <div className={styles.sideCard}>
            <p className={styles.sideLabel}>Region</p>
            <p className={styles.sideValue}>{pkg.region.charAt(0).toUpperCase() + pkg.region.slice(1)}</p>
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
