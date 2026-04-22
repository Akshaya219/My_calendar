-- GATE topics table: track subject/topic completion with spaced repetition support
CREATE TABLE IF NOT EXISTS gate_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  next_revision_date DATE,
  revision_count INT DEFAULT 0,
  revision_dates JSONB DEFAULT '[]',
  confidence_level INT CHECK (confidence_level BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gate_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own gate topics" ON gate_topics;
CREATE POLICY "Users see own gate topics" ON gate_topics
  FOR ALL USING (auth.uid() = user_id);
