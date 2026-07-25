-- ============================================================
-- 013_coding_profiles.sql
-- Adds columns to user_preferences to store coding profile handles
-- ============================================================

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS leetcode_username TEXT,
ADD COLUMN IF NOT EXISTS codeforces_username TEXT,
ADD COLUMN IF NOT EXISTS codechef_username TEXT,
ADD COLUMN IF NOT EXISTS hackerrank_username TEXT;
