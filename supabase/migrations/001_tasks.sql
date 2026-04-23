-- Tasks table: core task/to-do management with categories, priorities, and reminders
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT CHECK (category IN ('placement', 'gate', 'dsa', 'personal', 'finance', 'exam')),
  is_completed BOOLEAN DEFAULT FALSE,
  is_daily_checklist BOOLEAN DEFAULT FALSE,
  reminder_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own tasks" ON tasks;
CREATE POLICY "Users see own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id);
