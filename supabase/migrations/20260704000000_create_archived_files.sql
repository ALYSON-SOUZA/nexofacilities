-- Migration: Create archived_files table to store shared files synced to Supabase
CREATE TABLE IF NOT EXISTS archived_files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  data_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE archived_files ENABLE ROW LEVEL SECURITY;

-- Permissive policies for this shared internal tool
DROP POLICY IF EXISTS "Allow read for all users" ON archived_files;
CREATE POLICY "Allow read for all users" ON archived_files FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for all users" ON archived_files;
CREATE POLICY "Allow insert for all users" ON archived_files FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for all users" ON archived_files;
CREATE POLICY "Allow update for all users" ON archived_files FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete for all users" ON archived_files;
CREATE POLICY "Allow delete for all users" ON archived_files FOR DELETE USING (true);
