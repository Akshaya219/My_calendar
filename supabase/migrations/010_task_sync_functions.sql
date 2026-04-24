-- ============================================================
-- 010_task_sync_functions.sql
-- Functions to sync task completion with syllabus and DSA progress
-- ============================================================

-- Function to handle task completion sync
CREATE OR REPLACE FUNCTION handle_task_completion_sync()
RETURNS TRIGGER AS $$
DECLARE
  v_subtopic_id UUID;
  v_type TEXT;
BEGIN
  -- We only care about syllabus tasks (titles starting with "Target: " or "Revise: ")
  -- or daily study tasks (LeetCode/CodeChef)
  
  -- 1. Sync Syllabus Completion
  IF NEW.is_completed AND NOT OLD.is_completed THEN
    -- Check if it's a syllabus target
    IF NEW.title LIKE 'Target: %' THEN
      -- This is a bit tricky because the title might be the only link if we don't have metadata
      -- Ideally tasks should have a metadata column for subtopic_id
      -- For now, we'll assume the user is marking it in the UI which will trigger a different flow
      -- BUT if the user wants "task update -> dsa/gate update", we need a link.
      NULL;
    END IF;

    -- 2. Sync Daily Study Progress (LeetCode/CodeChef)
    IF NEW.is_completed AND NEW.is_daily_checklist THEN
      IF NEW.title LIKE '%LeetCode%' THEN
        UPDATE dsa_daily_targets 
        SET leetcode_solved = leetcode_solved + 3,
            target_met = (leetcode_solved + 3 + codechef_solved) >= (SELECT dsa_goal FROM daily_targets WHERE user_id = NEW.user_id)
        WHERE user_id = NEW.user_id AND date = NEW.date;
      ELSIF NEW.title LIKE '%CodeChef%' THEN
        UPDATE dsa_daily_targets 
        SET codechef_solved = codechef_solved + 3,
            target_met = (leetcode_solved + codechef_solved + 3) >= (SELECT dsa_goal FROM daily_targets WHERE user_id = NEW.user_id)
        WHERE user_id = NEW.user_id AND date = NEW.date;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for task completion
-- DROP TRIGGER IF EXISTS on_task_completed ON tasks;
-- CREATE TRIGGER on_task_completed
--   AFTER UPDATE OF is_completed ON tasks
--   FOR EACH ROW
--   EXECUTE FUNCTION handle_task_completion_sync();
