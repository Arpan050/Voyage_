import type { RequestHandler } from "express";
import { query } from "../db/index.js";
import { cacheDel, cacheDelPrefix, cacheGet, cacheSet } from "../db/cache.js";
import { AppError } from "../utils/AppError.js";
import { parsePagination } from "../utils/pagination.js";
import type { PackageRow } from "../types/models.js";

const SORTS: Record<string, string> = {
  price_asc: "p.price ASC",
  price_desc: "p.price DESC",
  duration: "p.duration_days ASC",
  rating: "avg_rating DESC, review_count DESC",
  newest: "p.created_at DESC",
};

const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export const getAllPackages: RequestHandler = async (req, res) => {
  const { region, search, sort } = req.query as Record<string, string | undefined>;
  const includeInactive = req.query.include_inactive === "true";
  if (includeInactive && req.user?.role !== "admin") throw AppError.forbidden("Only admins can list inactive packages");

  const { page, limit, offset } = parsePagination(req.query, 12, 50);
  const cacheKey = `packages:${region ?? ""}:${search ?? ""}:${sort ?? ""}:${page}:${limit}`;
  if (!includeInactive) {
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) { res.json(cached); return; }
  }

  const where: string[] = [];
  const params: unknown[] = [];
  if (!includeInactive) where.push("p.is_active = TRUE");
  if (region) { params.push(region); where.push(`p.region = $${params.length}`); }
  if (search) {
    params.push(`%${likeEscape(search.trim())}%`);
    where.push(`(p.name ILIKE $${params.length} OR p.destination ILIKE $${params.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderSql = SORTS[sort ?? ""] ?? "p.created_at DESC"; // whitelist — never interpolate user input

  const [{ rows }, count] = await Promise.all([
    query(
      `SELECT p.*, COALESCE(ROUND(AVG(r.rating),1),0)::float AS avg_rating, COUNT(r.id)::int AS review_count
       FROM packages p LEFT JOIN reviews r ON r.package_id = p.id
       ${whereSql} GROUP BY p.id ORDER BY ${orderSql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM packages p ${whereSql}`, params),
  ]);

  const total = count.rows[0]!.total;
  const payload = { packages: rows, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  if (!includeInactive) await cacheSet(cacheKey, payload, 300);
  res.json(payload);
};

export const getPackageById: RequestHandler = async (req, res) => {
  const id = req.params.id as string;
  const cacheKey = `package:${id}`;
  const cached = await cacheGet<unknown>(cacheKey);
  if (cached) { res.json(cached); return; }

  const { rows } = await query(
    `SELECT p.*, COALESCE(ROUND(AVG(r.rating),1),0)::float AS avg_rating, COUNT(r.id)::int AS review_count
     FROM packages p LEFT JOIN reviews r ON r.package_id = p.id
     WHERE p.id = $1 AND p.is_active = TRUE GROUP BY p.id`,
    [id],
  );
  if (!rows[0]) throw AppError.notFound("Package not found");

  const reviews = await query(
    `SELECT r.id, r.rating, r.review_text, r.created_at, u.name AS author_name
     FROM reviews r LEFT JOIN users u ON u.id = r.user_id
     WHERE r.package_id = $1 ORDER BY r.created_at DESC LIMIT 20`,
    [id],
  );
  const payload = { package: rows[0], reviews: reviews.rows };
  await cacheSet(cacheKey, payload, 300);
  res.json(payload);
};

type PackageInput = Partial<Pick<PackageRow,
  "name" | "destination" | "region" | "badge" | "duration_days" | "group_min" | "group_max" |
  "description" | "highlights" | "emoji" | "bg_gradient" | "is_active">> & { price?: number };

export const createPackage: RequestHandler = async (req, res) => {
  const b = req.body as PackageInput;
  const { rows } = await query<PackageRow>(
    `INSERT INTO packages (name, destination, region, badge, duration_days, group_min, group_max, price, description, highlights, emoji, bg_gradient)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [b.name, b.destination, b.region, b.badge ?? null, b.duration_days, b.group_min ?? 1, b.group_max ?? 20,
     b.price, b.description ?? null, b.highlights ?? [], b.emoji ?? null, b.bg_gradient ?? null],
  );
  await cacheDelPrefix("packages:");
  res.status(201).json({ package: rows[0] });
};

export const updatePackage: RequestHandler = async (req, res) => {
  const id = req.params.id as string;
  const b = req.body as PackageInput;
  const { rows } = await query<PackageRow>(
    `UPDATE packages SET
       name = COALESCE($1,name), destination = COALESCE($2,destination), region = COALESCE($3,region),
       badge = COALESCE($4,badge), duration_days = COALESCE($5,duration_days),
       group_min = COALESCE($6,group_min), group_max = COALESCE($7,group_max),
       price = COALESCE($8,price), description = COALESCE($9,description),
       highlights = COALESCE($10,highlights), emoji = COALESCE($11,emoji),
       bg_gradient = COALESCE($12,bg_gradient), is_active = COALESCE($13,is_active)
     WHERE id = $14 RETURNING *`,
    [b.name ?? null, b.destination ?? null, b.region ?? null, b.badge ?? null, b.duration_days ?? null,
     b.group_min ?? null, b.group_max ?? null, b.price ?? null, b.description ?? null,
     b.highlights ?? null, b.emoji ?? null, b.bg_gradient ?? null, b.is_active ?? null, id],
  );
  if (!rows[0]) throw AppError.notFound("Package not found");
  await Promise.all([cacheDelPrefix("packages:"), cacheDel(`package:${id}`)]);
  res.json({ package: rows[0] });
};

/** Soft delete: bookings keep pointing at the package. */
export const deletePackage: RequestHandler = async (req, res) => {
  const id = req.params.id as string;
  const { rowCount } = await query("UPDATE packages SET is_active = FALSE WHERE id = $1", [id]);
  if (!rowCount) throw AppError.notFound("Package not found");
  await Promise.all([cacheDelPrefix("packages:"), cacheDel(`package:${id}`)]);
  res.json({ message: "Package deactivated" });
};
