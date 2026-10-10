-- DEMO ONLY. Creates a publicly documented admin account (admin@voyage.com / Admin@1234).
-- Load this into a disposable local, CI or demo database. NEVER load it into a public deployment:
-- use `npm run create-admin` with your own strong password instead.
INSERT INTO users (name, email, password_hash, role) VALUES
('Demo Admin', 'admin@voyage.com', '$2b$12$FNPzN3HwI1WhmSSoE1ALUeMNYmEwucnUoVNDVXb40o7VlhdpW4qU6', 'admin')
ON CONFLICT (email) DO NOTHING;
