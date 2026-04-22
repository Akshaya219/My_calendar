-- Finance entries: track income and expenses with categories
CREATE TABLE IF NOT EXISTS finance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('income', 'expense')),
  category TEXT,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance budget: monthly budget with per-category breakdowns
CREATE TABLE IF NOT EXISTS finance_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  total_budget NUMERIC(10,2),
  categories JSONB DEFAULT '{}'
);

ALTER TABLE finance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_budget ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own finance" ON finance_entries;
CREATE POLICY "Users see own finance" ON finance_entries
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own budget" ON finance_budget;
CREATE POLICY "Users see own budget" ON finance_budget
  FOR ALL USING (auth.uid() = user_id);
