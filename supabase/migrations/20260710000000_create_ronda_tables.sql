-- Migration: Create Ronda tables for Facilities inspection rounds

-- ============================================================
-- 1. ronda_collaborators — reference data for all collaborators
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ronda_collaborators (
    nome TEXT PRIMARY KEY,
    gestor TEXT NOT NULL,
    filial TEXT NOT NULL,
    funcao TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ronda_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all ronda_collaborators" ON public.ronda_collaborators;
CREATE POLICY "Allow public all ronda_collaborators" ON public.ronda_collaborators
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 2. rondas — main round (inspection visit) record
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rondas (
    id TEXT PRIMARY KEY,                          -- RD-{FILIAL_SHORT}-{AAAAMMDD}-{seq}
    date TIMESTAMPTZ NOT NULL,
    filial TEXT NOT NULL,
    user_name TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.rondas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all rondas" ON public.rondas;
CREATE POLICY "Allow public all rondas" ON public.rondas
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 3. ronda_salas — rooms inspected within a round (1:N → rondas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ronda_salas (
    id TEXT PRIMARY KEY,
    ronda_id TEXT NOT NULL REFERENCES public.rondas(id) ON DELETE CASCADE,
    sala TEXT NOT NULL,
    gestor_sala TEXT NOT NULL,
    gerente_carteira TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ronda_salas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all ronda_salas" ON public.ronda_salas;
CREATE POLICY "Allow public all ronda_salas" ON public.ronda_salas
    FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ronda_salas_ronda_id ON public.ronda_salas(ronda_id);

-- ============================================================
-- 4. ronda_occurrences — issues found per room (1:N → ronda_salas)
--    images column stores Storage file-paths (no longer base64)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ronda_occurrences (
    id TEXT PRIMARY KEY,
    sala_id TEXT NOT NULL REFERENCES public.ronda_salas(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('autuacao', 'limpeza', 'manutencao')),
    description TEXT NOT NULL DEFAULT '',
    images TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ronda_occurrences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all ronda_occurrences" ON public.ronda_occurrences;
CREATE POLICY "Allow public all ronda_occurrences" ON public.ronda_occurrences
    FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ronda_occurrences_sala_id ON public.ronda_occurrences(sala_id);

-- ============================================================
-- 5. ronda_chamados — maintenance tickets linked to occurrences
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ronda_chamados (
    id TEXT PRIMARY KEY,                          -- CH-{sequential}
    ronda_id TEXT NOT NULL REFERENCES public.rondas(id) ON DELETE CASCADE,
    sala_id TEXT NOT NULL REFERENCES public.ronda_salas(id) ON DELETE CASCADE,
    occurrence_id TEXT NOT NULL REFERENCES public.ronda_occurrences(id) ON DELETE CASCADE,
    description TEXT NOT NULL DEFAULT '',
    responsible TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Aberto' CHECK (status IN ('Aberto', 'Em andamento', 'Concluido')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ronda_chamados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all ronda_chamados" ON public.ronda_chamados;
CREATE POLICY "Allow public all ronda_chamados" ON public.ronda_chamados
    FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ronda_chamados_ronda_id ON public.ronda_chamados(ronda_id);
CREATE INDEX IF NOT EXISTS idx_ronda_chamados_occurrence_id ON public.ronda_chamados(occurrence_id);

-- ============================================================
-- Helper: Insert collaborator seed data (safe upsert)
-- ============================================================
INSERT INTO public.ronda_collaborators (nome, gestor, filial, funcao, email) VALUES
('Alyson de Moura Souza','Ane Caroline de Souza Bonete','Fortaleza/Planalto','Coordenador Administrativo','admfortaleza@bellinatiperez.com.br'),
('Ane Caroline de Souza Bonete','Rogerio Belinati Garcia Polimeni','Maringá','Gerente Administrativo','ane.bonete@bellinatiperez.com.br'),
('Cleverson Luis Maciel','Mateus Daniel Rodrigues Damasceno','Curitiba/CEBP','Assistente Administrativo','cleverson.maciel@bellinatiperez.com.br'),
('David Vidal do Carmo','Ricardo de Paula Zinke','Curitiba/Marechal','Coordenador Administrativo','david.carmo@bellinatiperez.com.br'),
('Dayani Aparecida Sinval Siqueira','Joao Henrique da Rocha','Curitiba/Toronto','Assistente Administrativo','dayani.siqueira@bellinatiperez.com.br'),
('Diego Machado do Nascimento','Alyson de Moura Souza','Fortaleza/Planalto','Assistente Administrativo','diego.nascimento@bellinatiperez.com.br'),
('Erick de Lima Nunes','David Vidal do Carmo','Curitiba/Marechal','Assistente Administrativo','erick.nunes@bellinatiperez.com.br'),
('Joao Henrique da Rocha','Ricardo de Paula Zinke','Curitiba/Toronto','Coordenador Administrativo','joao.rocha@bellinatiperez.com.br'),
('Kelly Jaqueline Huzar','Ricardo de Paula Zinke','Curitiba Park & Business','Coordenador Administrativo','kelly.huzar@bellinatiperez.com.br'),
('Mateus Daniel Rodrigues Damasceno','Ricardo de Paula Zinke','Curitiba/CEBP','Coordenador Administrativo','mateus.damasceno@bellinatiperez.com.br'),
('Matheus Amaral de Almeida Pereira','Joao Henrique da Rocha','Curitiba/Toronto','Assistente Administrativo','matheus.pereira@bellinatiperez.com.br'),
('Ricardo de Paula Zinke','Rogerio Belinati Garcia Polimeni','Curitiba/Marechal','Gerente Executivo Administrativo','ricardo.zinke@bellinatiperez.com.br'),
('Sarah Elaysa Candeo','Ane Caroline de Souza Bonete','Maringá','Assistente Administrativo','sarah.candeo@bellinatiperez.com.br'),
('Saudio Weslley Paula da Silva','Mateus Daniel Rodrigues Damasceno','Curitiba/CEBP','Assistente Administrativo','saudio.silva@bellinatiperez.com.br')
ON CONFLICT (nome) DO UPDATE SET
    gestor = EXCLUDED.gestor,
    filial = EXCLUDED.filial,
    funcao = EXCLUDED.funcao,
    email = EXCLUDED.email;
