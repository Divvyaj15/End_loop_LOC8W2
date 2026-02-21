-- ─── ENUMS ───────────────────────────────────────────────────────────────────
CREATE TYPE event_category AS ENUM ('web_dev', 'ai_ml', 'app_dev', 'blockchain', 'other');
CREATE TYPE event_mode     AS ENUM ('online', 'offline');
CREATE TYPE event_status   AS ENUM ('draft', 'registration_open', 'registration_closed', 'ppt_submission', 'shortlisting', 'hackathon_active', 'judging', 'completed');

-- ─── Events table ─────────────────────────────────────────────────────────────
CREATE TABLE events (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                    TEXT NOT NULL,
  description              TEXT NOT NULL,
  category                 event_category NOT NULL,
  committee_name           TEXT NOT NULL,
  created_by               UUID NOT NULL REFERENCES users(id),

  -- Dates
  start_date               DATE NOT NULL,
  end_date                 DATE NOT NULL,
  registration_deadline    DATE NOT NULL,
  event_start_time         TIME NOT NULL,
  event_end_time           TIME NOT NULL,

  -- Team settings
  min_team_size            INT NOT NULL DEFAULT 1,
  max_team_size            INT NOT NULL DEFAULT 4,
  allow_individual         BOOLEAN NOT NULL DEFAULT TRUE,

  -- Mode
  mode                     event_mode NOT NULL DEFAULT 'offline',
  venue                    TEXT,

  -- Prizes
  first_prize              NUMERIC(10,2) DEFAULT 0,
  second_prize             NUMERIC(10,2) DEFAULT 0,
  third_prize              NUMERIC(10,2) DEFAULT 0,

  -- Entry fee
  entry_fee                NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_free                  BOOLEAN NOT NULL DEFAULT TRUE,

  -- Rules (stored as JSON array of strings)
  rules                    JSONB DEFAULT '[]',

  -- Media
  banner_url               TEXT,
  problem_statement_url    TEXT,    -- uploaded later by admin

  -- Status
  status                   event_status NOT NULL DEFAULT 'draft',

  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);