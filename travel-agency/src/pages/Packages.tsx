import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import PackageCard from "../components/PackageCard";
import BookingModal from "../components/BookingModal";
import { useApi } from "../hooks/useApi";
import { useDebounce } from "../hooks/useDebounce";
import { REGIONS, type TravelPackage } from "../types";
import styles from "./Packages.module.css";

const FILTERS: [string, string][] = [["all", "All"], ...REGIONS.map((r): [string, string] => [r, r[0]!.toUpperCase() + r.slice(1)])];
const SORTS: [string, string][] = [
  ["newest", "Newest"], ["price_asc", "Price: low to high"], ["price_desc", "Price: high to low"],
  ["duration", "Shortest trip"], ["rating", "Top rated"],
];
const PAGE_SIZE = 9;

export default function Packages() {
  const [searchParams] = useSearchParams();
  const initialRegion = searchParams.get("region");
  const [filter, setFilter] = useState<string>(REGIONS.some((r) => r === initialRegion) ? initialRegion! : "all");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TravelPackage | null>(null);

  const debouncedSearch = useDebounce(search.trim());
  const { data, loading, error, reload } = useApi(
    () => api.getPackages({
      region: filter === "all" ? undefined : filter,
      search: debouncedSearch || undefined,
      sort, page, limit: PAGE_SIZE,
    }),
    [filter, debouncedSearch, sort, page],
  );

  const packages = data?.packages ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.label}>Our Collection</p>
        <h1 className={styles.title}>Travel Packages</h1>
        <p className={styles.sub}>Browse the sample packages, filter by region and request a booking. This is a portfolio demo, so no real trips are sold.</p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="Filter by region">
          {FILTERS.map(([v, l]) => (
            <button key={v} className={`${styles.filterBtn} ${filter === v ? styles.active : ""}`}
              aria-pressed={filter === v} onClick={() => { setFilter(v); setPage(1); }}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select className={styles.searchInput} aria-label="Sort packages" value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}>
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input className={styles.searchInput} type="search" aria-label="Search packages" placeholder="Search packages…"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      {loading && !data ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "80px" }} role="status" aria-label="Loading packages">
          <div style={{ width: 36, height: 36, border: "3px solid var(--sand)", borderTopColor: "var(--terra)", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
        </div>
      ) : error ? (
        <div className={styles.empty} role="alert">
          <span>⚠️</span>
          <p>{error}</p>
          <button className={styles.filterBtn} onClick={() => void reload()}>Try again</button>
        </div>
      ) : (
        <>
          <div className={styles.grid} style={{ opacity: loading ? 0.6 : 1, transition: "opacity .2s" }}>
            {packages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} onBook={setSelected} />)}
            {packages.length === 0 && (
              <div className={styles.empty}><span>🔍</span><p>No packages match. Try a different filter or keyword.</p></div>
            )}
          </div>
          {totalPages > 1 && (
            <nav aria-label="Pagination" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, padding: "32px 0 8px" }}>
              <button className={styles.filterBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Previous</button>
              <span style={{ fontSize: ".85rem" }}>Page {page} of {totalPages}</span>
              <button className={styles.filterBtn} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </nav>
          )}
        </>
      )}

      <BookingModal pkg={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
