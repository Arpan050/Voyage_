-- ============================================================
-- Voyage Travel Agency — PostgreSQL Schema
-- Run this file once to set up the full database
-- psql -U postgres -d voyage_travel -f schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          VARCHAR(20)   NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  phone         VARCHAR(30),
  avatar_url    VARCHAR(500),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── PACKAGES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS packages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200)  NOT NULL,
  destination   VARCHAR(200)  NOT NULL,
  region        VARCHAR(50)   NOT NULL CHECK (region IN ('europe','asia','americas','africa','oceania')),
  badge         VARCHAR(50),
  duration_days INTEGER       NOT NULL,
  group_min     INTEGER       NOT NULL DEFAULT 1,
  group_max     INTEGER       NOT NULL DEFAULT 20,
  price         NUMERIC(10,2) NOT NULL,
  description   TEXT,
  highlights    TEXT[],
  emoji         VARCHAR(10),
  bg_gradient   VARCHAR(200),
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── BOOKINGS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ref_code      VARCHAR(20)   NOT NULL UNIQUE,
  user_id       UUID          REFERENCES users(id) ON DELETE SET NULL,
  package_id    UUID          NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
  -- guest info (for non-logged-in bookings)
  guest_name    VARCHAR(120),
  guest_email   VARCHAR(255),
  guest_phone   VARCHAR(30),
  travelers     INTEGER       NOT NULL DEFAULT 1 CHECK (travelers > 0),
  start_date    DATE          NOT NULL,
  total_price   NUMERIC(10,2) NOT NULL,
  status        VARCHAR(20)   NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','cancelled','completed')),
  special_notes TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── REVIEWS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID          REFERENCES users(id) ON DELETE SET NULL,
  package_id    UUID          NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  booking_id    UUID          REFERENCES bookings(id) ON DELETE SET NULL,
  rating        INTEGER       NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text   TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_user      ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_package   ON bookings(package_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status    ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created   ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_packages_region    ON packages(region);
CREATE INDEX IF NOT EXISTS idx_packages_active    ON packages(is_active);
CREATE INDEX IF NOT EXISTS idx_reviews_package    ON reviews(package_id);
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);

-- ── AUTO-UPDATE updated_at ─────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER users_updated_at    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER packages_updated_at BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── SEED DATA ──────────────────────────────────────────────
INSERT INTO packages (name, destination, region, badge, duration_days, group_min, group_max, price, description, highlights, emoji, bg_gradient) VALUES
('Santorini Escape',   'Greece',          'europe',   'Bestseller', 8,  2, 12, 2890, 'Whitewashed villages, volcanic caldera sunsets, and Aegean sea treasures await.',          ARRAY['Caldera View Hotel','Wine Tasting','Akrotiri Ruins','Sunset Sailing'],              '🏛️', 'linear-gradient(135deg,#1a3050,#2d4a6e)'),
('Rajasthan Royal',    'India',           'asia',     'Heritage',   10, 4, 16, 1650, 'Majestic forts, desert camel treks, and royal palaces across the land of kings.',          ARRAY['Jaipur Palace Tour','Desert Camp','Udaipur Lake Cruise','Jodhpur Blue City'],      '🕌', 'linear-gradient(135deg,#3d1e2a,#6e2d4a)'),
('Kyoto in Bloom',     'Japan',           'asia',     'Seasonal',   7,  2, 10, 3200, 'Cherry blossom season through ancient temples, zen gardens, and traditional ryokans.',     ARRAY['Arashiyama Bamboo','Tea Ceremony','Fushimi Inari','Gion Night Walk'],              '🌸', 'linear-gradient(135deg,#2d1e3d,#5a2d6e)'),
('Patagonia Trek',     'Argentina&Chile', 'americas', 'Adventure',  12, 6, 14, 4100, 'Raw wilderness, glacier fields, and the iconic towers of Torres del Paine.',              ARRAY['W Circuit Trek','Grey Glacier','El Chalten Hike','Perito Moreno'],                 '🏔️', 'linear-gradient(135deg,#1e3d2a,#2d6e4a)'),
('Amalfi Coast Drive', 'Italy',           'europe',   'Luxury',     9,  2,  8, 3750, 'Cliff-side villages, turquoise coves, and limoncello evenings along Italy''s most dramatic coast.', ARRAY['Positano Beaches','Pompeii Day','Capri Ferry','Private Villa Stay'],  '🍋', 'linear-gradient(135deg,#3d2a1e,#6e4a2d)'),
('Serengeti Safari',   'Tanzania',        'africa',   'Wildlife',   11, 4, 12, 5200, 'Witness the Great Migration and big five game drives across endless golden savanna.',     ARRAY['Ngorongoro Crater','Hot Air Balloon','Maasai Village','Zanzibar Extension'],      '🦁', 'linear-gradient(135deg,#2a1e3d,#4a2d6e)')
ON CONFLICT DO NOTHING;

-- Default admin user (password: Admin@1234 — CHANGE IN PRODUCTION)
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin User', 'admin@voyage.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdYqJwVw3YHXxX8/y', 'admin')
ON CONFLICT DO NOTHING;
