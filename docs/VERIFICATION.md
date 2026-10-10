# Verification record

What has been run, on which commit, and what has **not** been verified. Update this file whenever you re-run a stage.

- **Code verified:** commit `a5084cf` (branch `verification-fixes`)
- **Environment:** Linux sandbox, Node 22.22, PostgreSQL 16.15, nginx 1.24, Redis 7.0 (real processes, **no Docker, no GitHub**)
- **Raw output:** [`evidence/stage3-local-checks.txt`](evidence/stage3-local-checks.txt), [`evidence/stage4-nginx-redis.txt`](evidence/stage4-nginx-redis.txt)

## Status by stage

| Stage | Status | Evidence / what remains |
|---|---|---|
| 1. Apply confirmed fixes | **Done** | `nginx.conf` removed from `travel-agency/.dockerignore`; `*.tsbuildinfo` untracked and ignored (build info now written under `node_modules/.tmp`); README live-demo line says "not deployed yet"; README CI wording matches `ci.yml` (pushes to `main` + pull requests) |
| 2. Secure repo and demo | **Done in code; your action needed before any public deploy** | See "Stage 2 details" below |
| 3. Local checks | **Passed** | See table below |
| 4. Docker Compose from clean checkout | **NOT run** (no Docker here). Components verified individually | See "Stage 4 details". You must still run `docker compose up --build` |
| 5. GitHub Actions | **NOT run** (no GitHub access) | Push the branch or open a PR and record the run URL |
| 6. Business workflows | **Passed via API/e2e and component tests; not clicked through in a real browser** | See table below |
| 7. Playwright browser tests | **Not done** | Browser binaries can't be downloaded in the sandbox |
| 8. k6 load test | **Not done. No performance claims are made anywhere** | |
| 9. Maintainability cleanup | **Deliberately deferred** per the plan (do after Docker and CI are green) | `emailService.ts` still in `controllers/`; `Admin.tsx` still one file |
| 10. Case study | **Partly**: README, architecture and limitations are honest; screenshots, demo video and CI badge are missing | |

## Stage 3: local checks (commit `a5084cf`)

| Check | Result |
|---|---|
| Backend `npm run typecheck` | pass |
| Backend `npm test` | 29 tests pass |
| Backend `npm run build` | pass |
| Backend `npm run test:e2e` (clean PostgreSQL from `schema.sql` + `seed_demo_admin.sql`) | **70 of 70** pass |
| Frontend `npm run typecheck` | pass |
| Frontend `npm run lint` | pass |
| Frontend `npm test` | 25 tests pass |
| Frontend `npm run build` | pass |

## Stage 4 details (Docker not available)

Run for real, outside Docker:

- The project's own `nginx.conf` on real nginx 1.24 with the production build (`VITE_API_URL=/api`): SPA root and client-route fallback return 200 HTML, `/api` and `/health` proxy to the API, hashed assets are served with `immutable` caching, missing assets 404.
- **Bug found and fixed:** Nginx drops inherited `add_header` lines in any location that defines its own, so HTML and assets were served with 0 of 3 security headers while proxied routes had duplicates. Now 3 of 3 everywhere.
- Full e2e (70/70) **through Nginx** with a real Redis cache enabled (`/health` reports `cache: up`). Cached list keys drop from 2 to 0 immediately after an admin edit, and the new value is served at once.
- A script check that every `COPY` source in both Dockerfiles exists and is not excluded by its `.dockerignore`.

**Not verified:** that the images actually build, the compose networking, the `db` init script on a clean volume, container health checks, and restart behaviour. Run, and record the result here:

```bash
cp .env.example .env            # set POSTGRES_PASSWORD and JWT_SECRET
docker compose up --build       # all four services healthy? browse http://localhost:8080
docker compose logs api db      # look for startup or schema errors
docker compose restart && docker compose logs --tail 50
docker compose down -v
```

## Stage 6: workflow evidence

| Plan item | Evidence |
|---|---|
| Package search, filter, sort, pagination, empty and error states | Frontend tests (`packages.test.tsx`); API checks in `e2e.mjs` |
| Booking is `pending` with a reference code | e2e: guest and member bookings return `VYG-XXXXXXXX`, total = price x travellers |
| Reject past date, nonexistent or inactive package, bad traveller counts, malformed ids | e2e (past date, `travelers` 0 / 1.5 / "abc" / above max, nonexistent id, inactive package, non-UUID) |
| Customers see and cancel only their own pending bookings | e2e: other user gets 404 on read and cancel; confirmed booking can't be customer-cancelled |
| Admin transitions follow the lifecycle | e2e + `booking.test.ts`: invalid transitions return 409, terminal states stay terminal |
| Review needs a completed booking; duplicates blocked | e2e: 403 before completion, 201 after, 409 on duplicate |
| Package create / edit / deactivate / reactivate; history intact | e2e: old booking still listed with its package name after deactivation, and still progressable |
| `/health` healthy and with the database down | Healthy: `status ok`. DB stopped: HTTP 503 `degraded`, API process stays up, data routes return 503 with `Retry-After`, recovers on its own when the DB returns |

## Stage 2 details

- **History scan** of every commit: no `.env` file was ever tracked (only `.env.example`), no API keys or tokens, no real connection strings. The only credential-like values ever committed are dev placeholders: `postgres123` (old docker-compose) and `your_jwt_secret_change_in_production` (old compose and `.env.example`). **If you reused either on any real deployment (Render, a cloud database, Gmail), rotate it.** The API refuses to start in production with the placeholder JWT secret.
- **Demo admin:** `schema.sql` now seeds **no users**. The documented demo admin lives in `db/seed_demo_admin.sql` and is loaded only by `docker-compose.demo.yml` or by CI for its throwaway database. The base compose always builds the frontend with `VITE_DEMO_MODE=false`. Create a real admin with `npm run create-admin` (credentials from environment variables, 12+ characters).
- **Existing databases** created from the old schema may still contain `admin@voyage.com` with the publicly documented password. Check and remove or re-password it:
  `psql "$DATABASE_URL" -c "DELETE FROM users WHERE email='admin@voyage.com'"` (after creating your own admin).
- Still your call before going public: CORS origins (`FRONTEND_URL`), database not exposed publicly, logs reviewed, no real customer data.

## Definition of done (first credible release)

| Item | State |
|---|---|
| Dockerfile / `.dockerignore` conflict fixed | yes |
| No public secrets or reusable demo-admin credentials | in the repo yes; check any already-deployed database |
| Frontend and backend checks pass on the current commit | yes (`a5084cf`) |
| Docker Compose builds and starts from a clean checkout | **not yet verified** |
| GitHub Actions has at least one green run | **not yet verified** |
| Customer-to-admin journey demonstrated | API level yes; browser demo and video still to do |
| README accurate about capabilities and limits | yes |
| Browser / load tests done or listed as not done | listed as not done |
