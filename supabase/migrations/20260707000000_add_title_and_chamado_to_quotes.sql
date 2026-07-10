-- Migration to add title and chamado_number columns to public.quotes table if they do not already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='title') THEN
        ALTER TABLE public.quotes ADD COLUMN title TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='chamado_number') THEN
        ALTER TABLE public.quotes ADD COLUMN chamado_number TEXT;
    END IF;
END $$;
