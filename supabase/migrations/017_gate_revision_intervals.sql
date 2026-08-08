-- ============================================================
-- 017_gate_revision_intervals.sql
-- Custom GATE spaced-repetition intervals per user
-- ============================================================

-- Add the custom intervals column (array of day offsets).
-- Defaults to the original [1, 4, 7, 30, 60] schedule so existing users
-- are unaffected until they change it.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS gate_revision_intervals INTEGER[]
    DEFAULT ARRAY[1,4,7,30,60];

-- Add a toggle so users can opt in/out of browser reminder notifications
-- for their GATE revision due-dates.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS gate_reminders_enabled BOOLEAN DEFAULT TRUE;
