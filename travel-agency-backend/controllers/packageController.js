const db = require("../db");
const { cacheGet, cacheSet, cacheDel } = require("../db/cache");

const CACHE_TTL = 300;

// GET /api/packages
const getAllPackages = async (req, res, next) => {
  try {
    console.log("📦 getAllPackages called");
    const { region, search, sort = "created_at" } = req.query;

    const cacheKey = `packages:${region || "all"}:${search || ""}:${sort}`;
    const cached   = await cacheGet(cacheKey);
    if (cached) {
      res.set("X-Cache", "HIT");
      return res.json(cached);
    }

    let sql = `SELECT id, name, destination, region, badge, duration_days,
                      group_min, group_max, price, description, highlights,
                      emoji, bg_gradient, is_active, created_at
               FROM packages WHERE is_active = TRUE`;
    const params = [];

    if (region && region !== "all") {
      params.push(region);
      sql += ` AND region = $${params.length}`;
    }
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(destination) LIKE $${params.length})`;
    }

    const allowed = ["created_at", "price", "name", "duration_days"];
    const sortCol = allowed.includes(sort) ? sort : "created_at";
    sql += ` ORDER BY ${sortCol} ASC`;

    console.log("📦 Running DB query...");
    const { rows } = await db.query(sql, params);
    console.log(`📦 Found ${rows.length} packages`);

    const result = { packages: rows, count: rows.length };
    await cacheSet(cacheKey, result, CACHE_TTL);
    res.set("X-Cache", "MISS");
    res.json(result);
  } catch (err) {
    console.error("📦 getAllPackages error:", err.message);
    next(err);
  }
};

// GET /api/packages/:id
const getPackageById = async (req, res, next) => {
  try {
    const { id }   = req.params;
    const cacheKey = `package:${id}`;
    const cached   = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const { rows } = await db.query(
      `SELECT p.*,
              COALESCE(AVG(r.rating), 0)::NUMERIC(3,1) AS avg_rating,
              COUNT(r.id)::INTEGER AS review_count
       FROM packages p
       LEFT JOIN reviews r ON r.package_id = p.id
       WHERE p.id = $1
       GROUP BY p.id`, [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Package not found" });

    const reviewsRes = await db.query(
      `SELECT r.id, r.rating, r.review_text, r.created_at, u.name AS author_name
       FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.package_id = $1
       ORDER BY r.created_at DESC LIMIT 10`, [id]
    );

    const result = { package: rows[0], reviews: reviewsRes.rows };
    await cacheSet(cacheKey, result, CACHE_TTL);
    res.json(result);
  } catch (err) { next(err); }
};

// POST /api/packages — admin only
const createPackage = async (req, res, next) => {
  try {
    const { name, destination, region, badge, duration_days, group_min,
            group_max, price, description, highlights, emoji, bg_gradient } = req.body;

    const { rows } = await db.query(
      `INSERT INTO packages (name, destination, region, badge, duration_days, group_min, group_max,
                             price, description, highlights, emoji, bg_gradient)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, destination, region, badge, duration_days,
       group_min || 1, group_max || 20, price, description, highlights, emoji, bg_gradient]
    );
    await cacheDel("packages:all:::created_at");
    res.status(201).json({ package: rows[0] });
  } catch (err) { next(err); }
};

// PATCH /api/packages/:id — admin only
const updatePackage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields  = ["name","destination","region","badge","duration_days","group_min",
                     "group_max","price","description","highlights","emoji","bg_gradient","is_active"];
    const updates = [];
    const values  = [];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        values.push(req.body[f]);
        updates.push(`${f} = $${values.length}`);
      }
    });

    if (!updates.length) return res.status(400).json({ error: "No fields to update" });
    values.push(id);

    const { rows } = await db.query(
      `UPDATE packages SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!rows.length) return res.status(404).json({ error: "Package not found" });

    await cacheDel(`package:${id}`);
    res.json({ package: rows[0] });
  } catch (err) { next(err); }
};

// DELETE /api/packages/:id — soft delete
const deletePackage = async (req, res, next) => {
  try {
    await db.query("UPDATE packages SET is_active = FALSE WHERE id = $1", [req.params.id]);
    await cacheDel(`package:${req.params.id}`);
    res.json({ message: "Package deactivated" });
  } catch (err) { next(err); }
};

module.exports = { getAllPackages, getPackageById, createPackage, updatePackage, deletePackage };
