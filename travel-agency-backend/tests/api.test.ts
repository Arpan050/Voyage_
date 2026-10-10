import request from "supertest";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The database is mocked: these tests cover routing, auth, validation and error shaping — not SQL.
const query = vi.fn();
vi.mock("../src/db/index.js", () => ({ query, checkDb: vi.fn(async () => true), pool: { end: vi.fn() } }));

const { createApp } = await import("../src/app.js");
const app = createApp();

const SECRET = process.env.JWT_SECRET!;
const token = (userId = "11111111-1111-4111-8111-111111111111") => jwt.sign({ userId }, SECRET);
const asUser = (role: "user" | "admin") =>
  query.mockResolvedValueOnce({ rows: [{ id: "11111111-1111-4111-8111-111111111111", name: "T", email: "t@x.co", role, phone: null, avatar_url: null }], rowCount: 1 });

beforeEach(() => query.mockReset());

describe("health & routing", () => {
  it("GET /health reports db state", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", db: "up" });
  });
  it("unknown routes return 404 JSON", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
  });
  it("sets security headers and hides Express", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("authentication & authorization", () => {
  it("rejects missing, malformed and unsigned tokens with 401", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set("Authorization", "Bearer nope")).status).toBe(401);
    const forged = jwt.sign({ userId: "x" }, "another-secret");
    expect((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${forged}`)).status).toBe(401);
  });

  it("rejects expired tokens", async () => {
    const expired = jwt.sign({ userId: "x" }, SECRET, { expiresIn: -10 });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expired/i);
  });

  it("blocks customers from admin routes (403)", async () => {
    asUser("user");
    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${token()}`);
    expect(res.status).toBe(403);
  });

  it("blocks customers from creating packages", async () => {
    asUser("user");
    const res = await request(app).post("/api/packages").set("Authorization", `Bearer ${token()}`).send({});
    expect(res.status).toBe(403);
  });

  it("only admins may list inactive packages", async () => {
    const res = await request(app).get("/api/packages?include_inactive=true");
    expect(res.status).toBe(403);
  });
});

describe("validation", () => {
  it("register: weak password → 422 with field details", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "Al", email: "al@x.co", password: "weak" });
    expect(res.status).toBe(422);
    expect(res.body.errors[0]).toMatchObject({ field: "password" });
    expect(query).not.toHaveBeenCalled();
  });

  it("malformed UUID params never reach the database", async () => {
    const res = await request(app).get("/api/packages/not-a-uuid");
    expect(res.status).toBe(422);
    expect(query).not.toHaveBeenCalled();
  });

  it("booking: guest must give name and email", async () => {
    const res = await request(app).post("/api/bookings").send({
      package_id: "22222222-2222-4222-8222-222222222222", travelers: 2, start_date: "2999-01-01",
    });
    expect(res.status).toBe(422);
    const fields = res.body.errors.map((e: { field: string }) => e.field);
    expect(fields).toEqual(expect.arrayContaining(["guest_name", "guest_email"]));
  });

  it("booking: start date must be in the future", async () => {
    const res = await request(app).post("/api/bookings").send({
      package_id: "22222222-2222-4222-8222-222222222222", travelers: 2, start_date: "2001-01-01",
      guest_name: "Guest", guest_email: "g@x.co",
    });
    expect(res.status).toBe(422);
    expect(res.body.errors.some((e: { field: string }) => e.field === "start_date")).toBe(true);
  });

  it("package list: unknown sort is rejected, not interpolated into SQL", async () => {
    const res = await request(app).get("/api/packages?sort=price;DROP TABLE users");
    expect(res.status).toBe(422);
  });

  it("concierge: last message must come from the user", async () => {
    const res = await request(app).post("/api/concierge").send({ messages: [{ role: "assistant", content: "hi" }] });
    expect(res.status).toBe(422);
  });
});

describe("error handling", () => {
  it("never leaks internal error details on 500", async () => {
    query.mockRejectedValueOnce(new Error('password authentication failed for user "postgres"'));
    const res = await request(app).get("/api/public/stats");
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/postgres|password/i);
  });

  it("maps Postgres unique violations to 409", async () => {
    query.mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "23505" }));
    const res = await request(app).get("/api/public/stats");
    expect(res.status).toBe(409);
  });

  it("returns 503 with Retry-After when the database is unreachable", async () => {
    query.mockRejectedValueOnce(Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), { code: "ECONNREFUSED" }));
    const res = await request(app).get("/api/public/stats");
    expect(res.status).toBe(503);
    expect(res.headers["retry-after"]).toBe("5");
    expect(JSON.stringify(res.body)).not.toMatch(/127\.0\.0\.1|ECONNREFUSED/);
  });

  it("treats pool connection timeouts as 503 too", async () => {
    query.mockRejectedValueOnce(new Error("timeout exceeded when trying to connect"));
    expect((await request(app).get("/api/public/stats")).status).toBe(503);
  });

  it("returns 400 (not a stack trace) for malformed JSON", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad");
    expect(res.status).toBe(400);
    expect(res.text).not.toMatch(/at .*\.js/);
  });

  it("concierge returns 503 when no API key is configured", async () => {
    const res = await request(app).post("/api/concierge").send({ messages: [{ role: "user", content: "hello" }] });
    expect(res.status).toBe(503);
  });
});
