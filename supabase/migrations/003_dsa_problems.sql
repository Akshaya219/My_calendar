-- DSA problems table: track individual problem-solving across platforms
CREATE TABLE IF NOT EXISTS dsa_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT CHECK (platform IN ('leetcode', 'codechef')),
  problem_title TEXT NOT NULL,
  problem_url TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  topic TEXT NOT NULL,
  date_solved DATE DEFAULT CURRENT_DATE,
  is_solved BOOLEAN DEFAULT FALSE,
  notes TEXT,
  time_taken_mins INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DSA daily targets: track daily problem-solving goals per platform
CREATE TABLE IF NOT EXISTS dsa_daily_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  leetcode_solved INT DEFAULT 0,
  codechef_solved INT DEFAULT 0,
  target_met BOOLEAN DEFAULT FALSE
);

ALTER TABLE dsa_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsa_daily_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own dsa" ON dsa_problems;
CREATE POLICY "Users see own dsa" ON dsa_problems
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own targets" ON dsa_daily_targets;
CREATE POLICY "Users see own targets" ON dsa_daily_targets
  FOR ALL USING (auth.uid() = user_id);
