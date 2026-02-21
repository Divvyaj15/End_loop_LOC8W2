-- ─── Entry QR table ───────────────────────────────────────────────────────────
CREATE TABLE entry_qrs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qr_token     TEXT NOT NULL UNIQUE,   -- unique token encoded in QR
  qr_image_url TEXT,                   -- stored QR image URL
  is_used      BOOLEAN DEFAULT FALSE,  -- prevent duplicate scan
  scanned_at   TIMESTAMPTZ,
  scanned_by   UUID REFERENCES users(id),  -- admin who scanned
  created_at   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(event_id, user_id)  -- one QR per member per event
);

-- ─── Team attendance table ────────────────────────────────────────────────────
CREATE TABLE team_attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  members_scanned INT DEFAULT 0,
  total_members   INT DEFAULT 0,
  is_reported     BOOLEAN DEFAULT FALSE,  -- true when all members scanned
  reported_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(event_id, team_id)
);