-- Migration to retroactively add missing columns to mei_suppliers if they don't already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mei_suppliers' AND column_name='cnpj') THEN
        ALTER TABLE public.mei_suppliers ADD COLUMN cnpj TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mei_suppliers' AND column_name='agencia') THEN
        ALTER TABLE public.mei_suppliers ADD COLUMN agencia TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mei_suppliers' AND column_name='conta') THEN
        ALTER TABLE public.mei_suppliers ADD COLUMN conta TEXT;
    END IF;
END $$;
