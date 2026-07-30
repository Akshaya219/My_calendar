-- ============================================================
-- 012_placement_prep.sql
-- Placement tracker tables and checklists
-- ============================================================

CREATE TABLE IF NOT EXISTS placement_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  role TEXT NOT NULL,
  deadline DATE,
  status TEXT DEFAULT 'interested' CHECK (status IN ('interested', 'applied', 'interviewing', 'offer', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure deadline column exists if table was created previously without it
ALTER TABLE placement_companies ADD COLUMN IF NOT EXISTS deadline DATE;

-- Ensure the check constraint matches the current lowercase values
ALTER TABLE placement_companies DROP CONSTRAINT IF EXISTS placement_companies_status_check;
ALTER TABLE placement_companies ADD CONSTRAINT placement_companies_status_check CHECK (status IN ('interested', 'applied', 'interviewing', 'offer', 'rejected'));

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS placement_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_key)
);

ALTER TABLE placement_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own companies" ON placement_companies;
CREATE POLICY "Users manage own companies" ON placement_companies
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own checklist" ON placement_checklist;
CREATE POLICY "Users manage own checklist" ON placement_checklist
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
