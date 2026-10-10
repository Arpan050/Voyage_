export interface Pagination { page: number; limit: number; offset: number }

function positiveInt(v: unknown, fallback: number): number {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Parses ?page= and ?limit= defensively and caps the page size. */
export function parsePagination(q: Record<string, unknown>, defaultLimit = 20, maxLimit = 50): Pagination {
  const page = positiveInt(q.page, 1);
  const limit = Math.min(positiveInt(q.limit, defaultLimit), maxLimit);
  return { page, limit, offset: (page - 1) * limit };
}
