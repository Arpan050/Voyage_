import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import PackageCard from "../components/PackageCard";
import BookingModal from "../components/BookingModal";
import styles from "./Packages.module.css";

const FILTERS = [["all","All"],["europe","Europe"],["asia","Asia"],["americas","Americas"],["africa","Africa"]];

export default function Packages() {
  const [searchParams] = useSearchParams();
  const [filter,   setFilter]   = useState("all");
  const [search,   setSearch]   = useState(searchParams.get("q") || "");
  const [packages, setPackages] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filter !== "all") params.region = filter;
    if (search) params.search = search;
    api.getPackages(params)
      .then((d) => setPackages(d.packages || []))
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, [filter, search]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.label}>Our Collection</p>
        <h1 className={styles.title}>Curated Travel Packages</h1>
        <p className={styles.sub}>Every package is designed by destination specialists who've lived the experience firsthand.</p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {FILTERS.map(([v,l]) => (
            <button key={v} className={`${styles.filterBtn} ${filter===v?styles.active:""}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
        <input className={styles.searchInput} placeholder="Search packages…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{display:"flex",justifyContent:"center",padding:"80px"}}>
          <div style={{width:36,height:36,border:"3px solid var(--sand)",borderTopColor:"var(--terra)",borderRadius:"50%",animation:"spin .8s linear infinite"}} />
        </div>
      ) : (
        <div className={styles.grid}>
          {packages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} onBook={setSelected} />)}
          {packages.length === 0 && (
            <div className={styles.empty}><span>🔍</span><p>No packages match. Try a different filter or keyword.</p></div>
          )}
        </div>
      )}

      <BookingModal pkg={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
