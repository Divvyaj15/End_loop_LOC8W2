-- ─── ENUM for roles ──────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('student', 'admin', 'judge');

-- ─── Users table ─────────────────────────────────────────────────────────────
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  first_name       TEXT,
  last_name        TEXT,
  dob              TEXT,
  phone            TEXT,
  college          TEXT,
  aadhaar_number   TEXT,
  college_id_url   TEXT,
  aadhaar_url      TEXT,
  selfie_url       TEXT,
  role             user_role NOT NULL DEFAULT 'student',
  otp_verified     BOOLEAN DEFAULT FALSE,
  face_verified    BOOLEAN DEFAULT FALSE,
  is_verified      BOOLEAN DEFAULT FALSE,
  team_id          UUID,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── OTP table (temporary storage) ───────────────────────────────────────────
CREATE TABLE otps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  otp        TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Pre-seed Admin user ──────────────────────────────────────────────────────
-- Password: Admin@1234 (bcrypt hash)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified, otp_verified, face_verified)
VALUES (
  'admin@hackathon.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Super',
  'Admin',
  'admin',
  TRUE,
  TRUE,
  TRUE
);