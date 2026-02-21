-- ─── PPT Submissions table ────────────────────────────────────────────────────
CREATE TABLE submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  uploaded_by  UUID NOT NULL REFERENCES users(id),  -- must be team leader
  ppt_url      TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),

  -- One submission per team per event
  UNIQUE(event_id, team_id)
);