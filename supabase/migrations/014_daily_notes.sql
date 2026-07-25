-- ============================================================
-- 014_daily_notes.sql
-- Creates daily_notes table with RLS
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notes"
    ON daily_notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes"
    ON daily_notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
    ON daily_notes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
    ON daily_notes FOR DELETE
    USING (auth.uid() = user_id);

-- Create the function if it doesn't exist
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at trigger
CREATE TRIGGER handle_updated_at_daily_notes
    BEFORE UPDATE ON daily_notes
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
