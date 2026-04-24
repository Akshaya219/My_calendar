-- ============================================================
-- 009_daily_targets.sql
-- Table to store user-specific daily goals/targets
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_targets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  dsa_goal    INTEGER DEFAULT 2,
  gate_goal   INTEGER DEFAULT 2,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Private per user
ALTER TABLE daily_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own targets"
  ON daily_targets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update modified column
CREATE TRIGGER update_daily_targets_modtime
  BEFORE UPDATE ON daily_targets
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();
