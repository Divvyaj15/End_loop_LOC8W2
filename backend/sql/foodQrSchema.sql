-- ─── Food QR table ────────────────────────────────────────────────────────────
CREATE TABLE food_qrs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  meal_type    TEXT NOT NULL,          -- e.g. "breakfast", "lunch", "dinner"
  qr_token     TEXT NOT NULL UNIQUE,
  qr_image_url TEXT,
  is_used      BOOLEAN DEFAULT FALSE,
  scanned_at   TIMESTAMPTZ,
  scanned_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),

  -- One food QR per user per meal per event
  UNIQUE(event_id, user_id, meal_type)
);