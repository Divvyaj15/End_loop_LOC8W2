-- ─── Announcements table ──────────────────────────────────────────────────────
CREATE TABLE announcements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_by   UUID NOT NULL REFERENCES users(id),
  title        TEXT NOT NULL,
  message      TEXT NOT NULL,
  link         TEXT,                    -- optional link
  attachment_url TEXT,                  -- image or PDF
  attachment_type TEXT,                 -- 'image' | 'pdf'
  audience     TEXT NOT NULL DEFAULT 'all',  -- 'all' | 'shortlisted'
  created_at   TIMESTAMPTZ DEFAULT NOW()
);