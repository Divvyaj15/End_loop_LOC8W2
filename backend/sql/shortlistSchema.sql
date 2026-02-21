-- ─── PPT Evaluation scores table ─────────────────────────────────────────────
CREATE TABLE ppt_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_id             UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  submission_id       UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  scored_by           UUID NOT NULL REFERENCES users(id),  -- admin who scored

  -- Evaluation criteria (each out of 10)
  innovation          NUMERIC(4,1) DEFAULT 0,
  feasibility         NUMERIC(4,1) DEFAULT 0,
  technical_depth     NUMERIC(4,1) DEFAULT 0,
  presentation_clarity NUMERIC(4,1) DEFAULT 0,
  social_impact       NUMERIC(4,1) DEFAULT 0,

  -- Weights (must sum to 100)
  innovation_weight          INT DEFAULT 20,
  feasibility_weight         INT DEFAULT 20,
  technical_depth_weight     INT DEFAULT 20,
  presentation_clarity_weight INT DEFAULT 20,
  social_impact_weight       INT DEFAULT 20,

  -- Auto-calculated weighted total
  total_score         NUMERIC(6,2) DEFAULT 0,

  remarks             TEXT,
  scored_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  -- One score per team per event
  UNIQUE(event_id, team_id)
);

-- ─── Shortlisted teams table ──────────────────────────────────────────────────
CREATE TABLE shortlisted_teams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  rank         INT NOT NULL,
  shortlisted_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(event_id, team_id)
);