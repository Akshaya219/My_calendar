-- ============================================================
-- 015_nav_order.sql
-- Add nav_order column to user_preferences for custom drag & drop menu
-- ============================================================

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS nav_order TEXT[];
