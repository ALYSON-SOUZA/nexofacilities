-- Migration to set up measurements table for stock control with Supabase

-- Create measurements table
CREATE TABLE IF NOT EXISTS public.measurements (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    balances JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable row level security (RLS) on measurements table
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policies for anonymous access
DROP POLICY IF EXISTS "Allow public select of measurements" ON public.measurements;
DROP POLICY IF EXISTS "Allow public insert of measurements" ON public.measurements;
DROP POLICY IF EXISTS "Allow public update of measurements" ON public.measurements;
DROP POLICY IF EXISTS "Allow public delete of measurements" ON public.measurements;

CREATE POLICY "Allow public select of measurements" ON public.measurements FOR SELECT USING (true);
CREATE POLICY "Allow public insert of measurements" ON public.measurements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update of measurements" ON public.measurements FOR UPDATE USING (true);
CREATE POLICY "Allow public delete of measurements" ON public.measurements FOR DELETE USING (true);
