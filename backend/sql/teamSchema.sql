-- ─── ENUMS ───────────────────────────────────────────────────────────────────
CREATE TYPE team_status   AS ENUM ('pending', 'confirmed', 'disqualified');
CREATE TYPE member_status AS ENUM ('leader', 'pending', 'accepted', 'declined');

-- ─── Teams table ──────────────────────────────────────────────────────────────
CREATE TABLE teams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name    TEXT NOT NULL,
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  leader_id    UUID NOT NULL REFERENCES users(id),
  status       team_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique team name per event
  UNIQUE(team_name, event_id)
);

-- ─── Team members table ───────────────────────────────────────────────────────
CREATE TABLE team_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id),
  status     member_status NOT NULL DEFAULT 'pending',
  joined_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One student per team per event (enforced via team_id → event_id)
  UNIQUE(team_id, user_id)
);

-- ─── Notifications table (inbox) ─────────────────────────────────────────────
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'general',  -- 'team_invite' | 'team_confirmed' | 'shortlisted' | 'general'
  data       JSONB DEFAULT '{}',               -- extra payload e.g. { teamId, eventId }
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);