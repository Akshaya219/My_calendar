-- ============================================================
-- 016_roadmap_module.sql
-- Table to store life roadmap milestones and updates
-- ============================================================

CREATE TABLE IF NOT EXISTS roadmap_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_date  DATE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT DEFAULT 'general',
  icon        TEXT DEFAULT 'star',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Private per user
ALTER TABLE roadmap_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own roadmap events" ON roadmap_events;
CREATE POLICY "Users can manage their own roadmap events"
  ON roadmap_events
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Optional: Create an index for quick ordering by date
CREATE INDEX IF NOT EXISTS roadmap_events_date_idx ON roadmap_events(event_date DESC);
