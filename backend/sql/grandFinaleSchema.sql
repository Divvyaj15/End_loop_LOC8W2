-- Grand Finale teams: teams promoted from shortlist (admin clicks "Move to Grand Finale" next to Shortlisted Teams)
-- Run this in Supabase SQL editor once:
CREATE TABLE IF NOT EXISTS grand_finale_teams (
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  rank         INT NOT NULL DEFAULT 1,
  added_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, team_id)
);
