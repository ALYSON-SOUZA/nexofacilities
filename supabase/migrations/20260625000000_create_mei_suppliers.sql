-- Migration to set up mei_suppliers table for MEI/Autônomo contractors in Supabase

-- Create mei_suppliers table
CREATE TABLE IF NOT EXISTS public.mei_suppliers (
    nome_completo TEXT PRIMARY KEY,
    endereco TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cep TEXT,
    cidade TEXT,
    uf TEXT,
    data_nascimento TEXT,
    naturalidade TEXT,
    naturalidade_uf TEXT,
    sexo TEXT,
    grau_instrucao TEXT,
    estado_civil TEXT,
    data_casamento TEXT,
    nome_conjuge TEXT,
    raca_cor TEXT,
    funcao_atividade TEXT,
    cpf TEXT,
    pis TEXT,
    pix TEXT,
    banco TEXT,
    cnpj TEXT,
    agencia TEXT,
    conta TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable row level security (RLS) on mei_suppliers table
ALTER TABLE public.mei_suppliers ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policies for anonymous access
DROP POLICY IF EXISTS "Allow public select of mei_suppliers" ON public.mei_suppliers;
DROP POLICY IF EXISTS "Allow public insert of mei_suppliers" ON public.mei_suppliers;
DROP POLICY IF EXISTS "Allow public update of mei_suppliers" ON public.mei_suppliers;
DROP POLICY IF EXISTS "Allow public delete of mei_suppliers" ON public.mei_suppliers;

CREATE POLICY "Allow public select of mei_suppliers" ON public.mei_suppliers FOR SELECT USING (true);
CREATE POLICY "Allow public insert of mei_suppliers" ON public.mei_suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update of mei_suppliers" ON public.mei_suppliers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete of mei_suppliers" ON public.mei_suppliers FOR DELETE USING (true);
