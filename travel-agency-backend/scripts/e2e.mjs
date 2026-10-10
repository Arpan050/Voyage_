// End-to-end API check. Needs a running API + a FRESH database loaded from db/schema.sql and
// db/seed_demo_admin.sql (or set ADMIN_EMAIL / ADMIN_PASSWORD to an existing admin).
//   API_URL=http://localhost:5000 npm run test:e2e
const B = process.env.API_URL ?? "http://localhost:5000";
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  → " + extra}`); };
const call = async (method, path, body, token) => {
  const r = await fetch(B + path, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { s: r.status, j };
};
const future = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

const admin = (await call("POST", "/api/auth/login", { email: process.env.ADMIN_EMAIL ?? "admin@voyage.com", password: process.env.ADMIN_PASSWORD ?? "Admin@1234" })).j.token;
const email = `t${Date.now()}@example.com`;
const reg = await call("POST", "/api/auth/register", { name: "Test User", email, password: "Passw0rd1", phone: "" });
ok("register returns 201 + token", reg.s === 201 && reg.j.token);
ok("register ignores role injection", (await call("POST", "/api/auth/register", { name: "Evil", email: `e${Date.now()}@example.com`, password: "Passw0rd1", role: "admin" })).j.user.role === "user");
ok("weak password → 422", (await call("POST", "/api/auth/register", { name: "X Y", email: "a@b.co", password: "short" })).s === 422);
const user = reg.j.token;

// packages
const list = await call("GET", "/api/packages?limit=2");
ok("package list paginated", list.j.packages.length === 2 && list.j.total === 6 && list.j.totalPages === 3, JSON.stringify(list.j).slice(0, 100));
ok("limit capped at 50", (await call("GET", "/api/packages?limit=999999")).j.limit === 50);
ok("bad sort → 422", (await call("GET", "/api/packages?sort=price;DROP")).s === 422);
ok("search works", (await call("GET", "/api/packages?search=kyoto")).j.packages.length === 1);
ok("search with % is escaped", (await call("GET", "/api/packages?search=%25")).j.packages.length === 0);
ok("invalid UUID → 422 (not a 500)", (await call("GET", "/api/packages/not-a-uuid")).s === 422);
ok("unknown UUID → 404", (await call("GET", "/api/packages/00000000-0000-0000-0000-000000000000")).s === 404);
ok("include_inactive blocked for anon", (await call("GET", "/api/packages?include_inactive=true")).s === 403);
const pkg = list.j.packages.find((p) => p.name === "Santorini Escape") ?? list.j.packages[0];

// admin package CRUD + reactivation (old bug #2)
const bad = await call("POST", "/api/packages", { name: "X", destination: "Y", region: "mars", price: -5, duration_days: 0 }, admin);
ok("create package validation → 422", bad.s === 422);
const np = await call("POST", "/api/packages", { name: `Test Pkg ${Date.now()}`, destination: "Nowhere", region: "asia", price: 999.5, duration_days: 5, group_min: 2, group_max: 6, highlights: ["A", "B"] }, admin);
ok("admin creates package", np.s === 201, JSON.stringify(np.j));
ok("non-admin cannot create", (await call("POST", "/api/packages", {}, user)).s === 403);
ok("group_max < group_min rejected", (await call("PATCH", `/api/packages/${np.j.package.id}`, { group_min: 5, group_max: 2 }, admin)).s === 422);
await call("DELETE", `/api/packages/${np.j.package.id}`, null, admin);
const inactive = await call("GET", "/api/packages?include_inactive=true&limit=50", null, admin);
const found = inactive.j.packages.find((p) => p.id === np.j.package.id);
ok("deactivated package visible to admin", found && found.is_active === false);
ok("…and hidden from public", !(await call("GET", "/api/packages?limit=50")).j.packages.some((p) => p.id === np.j.package.id));
await call("PATCH", `/api/packages/${np.j.package.id}`, { is_active: true }, admin);
ok("admin can re-activate", (await call("GET", `/api/packages/${np.j.package.id}`)).s === 200);

// bookings
const base = { package_id: pkg.id, travelers: 2, start_date: future(30) };
ok("guest without name/email → 422", (await call("POST", "/api/bookings", base)).s === 422);
ok("past date → 422", (await call("POST", "/api/bookings", { ...base, start_date: "2020-01-01" }, user)).s === 422);
ok("bad package uuid → 422", (await call("POST", "/api/bookings", { ...base, package_id: "x" }, user)).s === 422);
ok("travellers > group_max → 400", (await call("POST", "/api/bookings", { ...base, travelers: 40 }, user)).s === 400);
const guest = await call("POST", "/api/bookings", { ...base, guest_name: "Guest G", guest_email: "g@example.com" });
ok("guest booking → 201 with VYG- ref", guest.s === 201 && /^VYG-[A-Z2-9]{8}$/.test(guest.j.refCode), JSON.stringify(guest.j).slice(0, 120));
ok("total = price × travellers", Number(guest.j.booking.total_price) === Number(pkg.price) * 2);
const b1 = (await call("POST", "/api/bookings", base, user)).j.booking;
ok("user booking is pending", b1.status === "pending");

ok("customer cannot confirm", (await call("PATCH", `/api/bookings/${b1.id}/status`, { status: "confirmed" }, user)).s === 403);
ok("invalid status → 422", (await call("PATCH", `/api/bookings/${b1.id}/status`, { status: "banana" }, admin)).s === 422);
ok("pending → completed blocked (409)", (await call("PATCH", `/api/bookings/${b1.id}/status`, { status: "completed" }, admin)).s === 409);
ok("pending → confirmed", (await call("PATCH", `/api/bookings/${b1.id}/status`, { status: "confirmed" }, admin)).j.booking.status === "confirmed");
ok("customer can't cancel a confirmed booking", (await call("DELETE", `/api/bookings/${b1.id}`, null, user)).s === 409);
ok("review before completion → 403", (await call("POST", "/api/reviews", { package_id: pkg.id, rating: 5, review_text: "great" }, user)).s === 403);
ok("confirmed → completed", (await call("PATCH", `/api/bookings/${b1.id}/status`, { status: "completed" }, admin)).j.booking.status === "completed");
ok("completed is terminal", (await call("PATCH", `/api/bookings/${b1.id}/status`, { status: "cancelled" }, admin)).s === 409);

const b2 = (await call("POST", "/api/bookings", base, user)).j.booking;
ok("pending → rejected", (await call("PATCH", `/api/bookings/${b2.id}/status`, { status: "rejected" }, admin)).j.booking.status === "rejected");
const b3 = (await call("POST", "/api/bookings", base, user)).j.booking;
ok("customer cancels own pending", (await call("DELETE", `/api/bookings/${b3.id}`, null, user)).s === 200);

// ownership
const other = (await call("POST", "/api/auth/register", { name: "Other P", email: `o${Date.now()}@example.com`, password: "Passw0rd1" })).j.token;
ok("other user can't read booking (404)", (await call("GET", `/api/bookings/${b1.id}`, null, other)).s === 404);
ok("other user can't cancel it (404)", (await call("DELETE", `/api/bookings/${b1.id}`, null, other)).s === 404);
ok("owner can read", (await call("GET", `/api/bookings/${b1.id}`, null, user)).s === 200);
ok("admin list paginated + filtered", (await call("GET", "/api/bookings?status=rejected&limit=5", null, admin)).j.bookings.every((b) => b.status === "rejected"));
ok("admin list bad status → 422", (await call("GET", "/api/bookings?status=zzz", null, admin)).s === 422);

// invalid requests & history integrity (Stage 6)
ok("nonexistent package → 404", (await call("POST", "/api/bookings", { ...base, package_id: "00000000-0000-4000-8000-000000000000" }, user)).s === 404);
ok("travellers = 0 → 422", (await call("POST", "/api/bookings", { ...base, travelers: 0 }, user)).s === 422);
ok("travellers = 1.5 → 422", (await call("POST", "/api/bookings", { ...base, travelers: 1.5 }, user)).s === 422);
ok("travellers = 'abc' → 422", (await call("POST", "/api/bookings", { ...base, travelers: "abc" }, user)).s === 422);
const hp = (await call("POST", "/api/packages", { name: `History Pkg ${Date.now()}`, destination: "Somewhere", region: "africa", price: 500, duration_days: 3 }, admin)).j.package;
const hb = (await call("POST", "/api/bookings", { package_id: hp.id, travelers: 1, start_date: future(40) }, user)).j.booking;
ok("booking on a new package works", hb && hb.status === "pending");
await call("DELETE", `/api/packages/${hp.id}`, null, admin);
ok("booking an INACTIVE package → 404", (await call("POST", "/api/bookings", { package_id: hp.id, travelers: 1, start_date: future(40) }, user)).s === 404);
const mine = (await call("GET", "/api/bookings/me", null, user)).j.bookings.find((b) => b.id === hb.id);
ok("old booking survives package deactivation, with package name", mine && mine.package_name === hp.name, JSON.stringify(mine));
ok("admin can still progress that booking", (await call("PATCH", `/api/bookings/${hb.id}/status`, { status: "confirmed" }, admin)).s === 200);

// reviews
const rv = await call("POST", "/api/reviews", { package_id: pkg.id, rating: 5, review_text: "Wonderful trip" }, user);
ok("review after completion → 201", rv.s === 201, JSON.stringify(rv.j));
ok("duplicate review → 409", (await call("POST", "/api/reviews", { package_id: pkg.id, rating: 4 }, user)).s === 409);
ok("reviewed flag set on my bookings", (await call("GET", "/api/bookings/me", null, user)).j.bookings.some((b) => b.reviewed));
const stats = (await call("GET", "/api/public/stats")).j;
ok("public stats real", stats.packages >= 6 && stats.reviews >= 1 && stats.avg_rating === 5, JSON.stringify(stats));
ok("public reviews", (await call("GET", "/api/public/reviews")).j.reviews[0]?.review_text === "Wonderful trip");

// admin
const me = (await call("GET", "/api/auth/me", null, admin)).j.user;
ok("admin can't change own role", (await call("PATCH", `/api/admin/users/${me.id}/role`, { role: "user" }, admin)).s === 400);
const st = (await call("GET", "/api/admin/stats", null, admin)).j;
ok("admin stats", st.totalBookings >= 4 && st.bookingsByStatus.completed >= 1 && typeof st.totalRevenue === "number" && st.reviewCount === 1, JSON.stringify(st));
ok("admin booking list has customer_name", (await call("GET", "/api/bookings?limit=50", null, admin)).j.bookings.every((b) => b.customer_name));
ok("users capped/paginated", (await call("GET", "/api/admin/users?limit=100000", null, admin)).j.limit === 100);
ok("non-admin blocked from stats", (await call("GET", "/api/admin/stats", null, user)).s === 403);

// profile & password
ok("update profile + clear phone", (await call("PATCH", "/api/auth/me", { name: "Renamed User", phone: "" }, user)).j.user.phone === null);
ok("weak new password → 422", (await call("POST", "/api/auth/change-password", { currentPassword: "Passw0rd1", newPassword: "weak" }, user)).s === 422);
ok("change password", (await call("POST", "/api/auth/change-password", { currentPassword: "Passw0rd1", newPassword: "Newpass99" }, user)).s === 200);
ok("login with new password", (await call("POST", "/api/auth/login", { email, password: "Newpass99" })).s === 200);

ok("package reviews endpoint", (await call("GET", `/api/reviews/package/${pkg.id}`)).j.reviews.length === 1);
ok("admin revenue endpoint", Array.isArray((await call("GET", "/api/admin/revenue", null, admin)).j.revenue));

// misc
ok("bad token → 401", (await call("GET", "/api/auth/me", null, "garbage")).s === 401);
ok("unknown route → 404", (await call("GET", "/api/nope")).s === 404);
ok("malformed JSON → 400, no stack", await fetch(B + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: "{bad" }).then(async (r) => r.status === 400 && !(await r.text()).includes("at ")));
ok("concierge unconfigured → 503", (await call("POST", "/api/concierge", { messages: [{ role: "user", content: "hi" }] })).s === 503);
ok("concierge validation → 422", (await call("POST", "/api/concierge", { messages: [] })).s === 422);
const h = await fetch(B + "/health"); ok("helmet headers present", h.headers.has("x-content-type-options") && !h.headers.has("x-powered-by"));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
