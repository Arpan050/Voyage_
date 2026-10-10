-- Upgrade an EXISTING database created from the original schema.sql.
-- Fresh installs don't need this: schema.sql already includes everything.
--   psql "$DATABASE_URL" -f db/migrations/001_typescript_upgrade.sql
BEGIN;

-- 1. Booking lifecycle gains "rejected".
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending','confirmed','rejected','cancelled','completed'));

-- 2. Package sanity checks (NOT VALID = enforced for new rows, existing rows untouched).
ALTER TABLE packages ADD CONSTRAINT packages_price_check    CHECK (price >= 0)        NOT VALID;
ALTER TABLE packages ADD CONSTRAINT packages_duration_check CHECK (duration_days > 0) NOT VALID;
ALTER TABLE packages ADD CONSTRAINT packages_group_range    CHECK (group_min >= 1 AND group_max >= group_min) NOT VALID;

-- 3. One review per traveller per package; unique package names.
--    If these fail you have duplicate rows. Remove the duplicates and re-run.
CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_user_pkg ON reviews(user_id, package_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_packages_name    ON packages(name);

COMMIT;
