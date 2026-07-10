-- Migrations to set up schema for the Comparador de Cotações with Supabase

-- 1. Create quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
    id TEXT PRIMARY KEY,
    quote_date TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_cpf TEXT NOT NULL,
    saved_at TEXT NOT NULL,
    suppliers JSONB NOT NULL,
    items JSONB NOT NULL,
    capacity_rows JSONB NOT NULL,
    summary JSONB NOT NULL,
    category_id TEXT,
    category_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    items JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create known_suppliers table (for cached suppliers)
CREATE TABLE IF NOT EXISTS public.known_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    phone TEXT,
    vendedor TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable row level security (RLS) on all tables
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.known_suppliers ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policies for anonymous access (useful for public publishable key integrations)
DROP POLICY IF EXISTS "Allow public select of quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow public insert of quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow public update of quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow public delete of quotes" ON public.quotes;

CREATE POLICY "Allow public select of quotes" ON public.quotes FOR SELECT USING (true);
CREATE POLICY "Allow public insert of quotes" ON public.quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update of quotes" ON public.quotes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete of quotes" ON public.quotes FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public select of categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public insert of categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public update of categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public delete of categories" ON public.categories;

CREATE POLICY "Allow public select of categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow public insert of categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update of categories" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Allow public delete of categories" ON public.categories FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public select of known_suppliers" ON public.known_suppliers;
DROP POLICY IF EXISTS "Allow public insert of known_suppliers" ON public.known_suppliers;
DROP POLICY IF EXISTS "Allow public update of known_suppliers" ON public.known_suppliers;
DROP POLICY IF EXISTS "Allow public delete of known_suppliers" ON public.known_suppliers;

CREATE POLICY "Allow public select of known_suppliers" ON public.known_suppliers FOR SELECT USING (true);
CREATE POLICY "Allow public insert of known_suppliers" ON public.known_suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update of known_suppliers" ON public.known_suppliers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete of known_suppliers" ON public.known_suppliers FOR DELETE USING (true);

-- 4. Helper function to clear all quotes (called via RPC in dbClearAllQuotes)
CREATE OR REPLACE FUNCTION public.clear_all_quotes_helper()
RETURNS void AS $$
BEGIN
    DELETE FROM public.quotes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

