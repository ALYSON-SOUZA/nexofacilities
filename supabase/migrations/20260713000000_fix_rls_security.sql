-- Migration: Fix RLS policies for security
-- Replaces fully permissive (USING true) policies with authenticated-user policies
-- Run this AFTER applying all previous migrations

-- ============================================================
-- 1. Drop ALL existing permissive policies
-- ============================================================

-- quotes
DROP POLICY IF EXISTS "Allow public select of quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow public insert of quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow public update of quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow public delete of quotes" ON public.quotes;

-- categories
DROP POLICY IF EXISTS "Allow public select of categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public insert of categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public update of categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public delete of categories" ON public.categories;

-- known_suppliers
DROP POLICY IF EXISTS "Allow public select of known_suppliers" ON public.known_suppliers;
DROP POLICY IF EXISTS "Allow public insert of known_suppliers" ON public.known_suppliers;
DROP POLICY IF EXISTS "Allow public update of known_suppliers" ON public.known_suppliers;
DROP POLICY IF EXISTS "Allow public delete of known_suppliers" ON public.known_suppliers;

-- measurements
DROP POLICY IF EXISTS "Enable read access for all users" ON public.measurements;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.measurements;
DROP POLICY IF EXISTS "Enable update for all users" ON public.measurements;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.measurements;

-- mei_suppliers
DROP POLICY IF EXISTS "Enable read access for all users" ON public.mei_suppliers;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.mei_suppliers;
DROP POLICY IF EXISTS "Enable update for all users" ON public.mei_suppliers;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.mei_suppliers;

-- archived_files
DROP POLICY IF EXISTS "Enable read access for all users" ON public.archived_files;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.archived_files;
DROP POLICY IF EXISTS "Enable update for all users" ON public.archived_files;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.archived_files;

-- ronda_collaborators
DROP POLICY IF EXISTS "Allow public read ronda_collaborators" ON public.ronda_collaborators;
DROP POLICY IF EXISTS "Allow public insert ronda_collaborators" ON public.ronda_collaborators;
DROP POLICY IF EXISTS "Allow public update ronda_collaborators" ON public.ronda_collaborators;
DROP POLICY IF EXISTS "Allow public delete ronda_collaborators" ON public.ronda_collaborators;

-- rondas
DROP POLICY IF EXISTS "Allow public read rondas" ON public.rondas;
DROP POLICY IF EXISTS "Allow public insert rondas" ON public.rondas;
DROP POLICY IF EXISTS "Allow public update rondas" ON public.rondas;
DROP POLICY IF EXISTS "Allow public delete rondas" ON public.rondas;

-- ronda_salas
DROP POLICY IF EXISTS "Allow public read ronda_salas" ON public.ronda_salas;
DROP POLICY IF EXISTS "Allow public insert ronda_salas" ON public.ronda_salas;
DROP POLICY IF EXISTS "Allow public update ronda_salas" ON public.ronda_salas;
DROP POLICY IF EXISTS "Allow public delete ronda_salas" ON public.ronda_salas;

-- ronda_occurrences
DROP POLICY IF EXISTS "Allow public read ronda_occurrences" ON public.ronda_occurrences;
DROP POLICY IF EXISTS "Allow public insert ronda_occurrences" ON public.ronda_occurrences;
DROP POLICY IF EXISTS "Allow public update ronda_occurrences" ON public.ronda_occurrences;
DROP POLICY IF EXISTS "Allow public delete ronda_occurrences" ON public.ronda_occurrences;

-- ronda_chamados
DROP POLICY IF EXISTS "Allow public read ronda_chamados" ON public.ronda_chamados;
DROP POLICY IF EXISTS "Allow public insert ronda_chamados" ON public.ronda_chamados;
DROP POLICY IF EXISTS "Allow public update ronda_chamados" ON public.ronda_chamados;
DROP POLICY IF EXISTS "Allow public delete ronda_chamados" ON public.ronda_chamados;

-- documents
DROP POLICY IF EXISTS "Enable read access for all users" ON public.documents;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.documents;
DROP POLICY IF EXISTS "Enable update for all users" ON public.documents;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.documents;

-- document_chunks
DROP POLICY IF EXISTS "Enable read access for all users" ON public.document_chunks;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.document_chunks;
DROP POLICY IF EXISTS "Enable update for all users" ON public.document_chunks;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.document_chunks;

-- ============================================================
-- 2. Create authenticated-only policies
-- All operations require auth.uid() IS NOT NULL
-- ============================================================

-- quotes: authenticated users can CRUD all rows (shared workspace)
CREATE POLICY "Authenticated read quotes" ON public.quotes
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert quotes" ON public.quotes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update quotes" ON public.quotes
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete quotes" ON public.quotes
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- categories: authenticated users can read all, manage all
CREATE POLICY "Authenticated read categories" ON public.categories
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update categories" ON public.categories
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete categories" ON public.categories
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- known_suppliers: authenticated users
CREATE POLICY "Authenticated read known_suppliers" ON public.known_suppliers
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert known_suppliers" ON public.known_suppliers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update known_suppliers" ON public.known_suppliers
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete known_suppliers" ON public.known_suppliers
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- measurements: authenticated users
CREATE POLICY "Authenticated read measurements" ON public.measurements
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert measurements" ON public.measurements
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update measurements" ON public.measurements
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete measurements" ON public.measurements
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- mei_suppliers: authenticated users
CREATE POLICY "Authenticated read mei_suppliers" ON public.mei_suppliers
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert mei_suppliers" ON public.mei_suppliers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update mei_suppliers" ON public.mei_suppliers
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete mei_suppliers" ON public.mei_suppliers
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- archived_files: authenticated users
CREATE POLICY "Authenticated read archived_files" ON public.archived_files
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert archived_files" ON public.archived_files
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update archived_files" ON public.archived_files
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete archived_files" ON public.archived_files
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ronda_collaborators: authenticated users (read-only for most, seeded data)
CREATE POLICY "Authenticated read ronda_collaborators" ON public.ronda_collaborators
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert ronda_collaborators" ON public.ronda_collaborators
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- rondas: authenticated users
CREATE POLICY "Authenticated read rondas" ON public.rondas
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert rondas" ON public.rondas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update rondas" ON public.rondas
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete rondas" ON public.rondas
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ronda_salas: authenticated users
CREATE POLICY "Authenticated read ronda_salas" ON public.ronda_salas
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert ronda_salas" ON public.ronda_salas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update ronda_salas" ON public.ronda_salas
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete ronda_salas" ON public.ronda_salas
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ronda_occurrences: authenticated users
CREATE POLICY "Authenticated read ronda_occurrences" ON public.ronda_occurrences
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert ronda_occurrences" ON public.ronda_occurrences
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update ronda_occurrences" ON public.ronda_occurrences
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete ronda_occurrences" ON public.ronda_occurrences
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ronda_chamados: authenticated users
CREATE POLICY "Authenticated read ronda_chamados" ON public.ronda_chamados
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert ronda_chamados" ON public.ronda_chamados
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update ronda_chamados" ON public.ronda_chamados
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete ronda_chamados" ON public.ronda_chamados
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- documents: authenticated users
CREATE POLICY "Authenticated read documents" ON public.documents
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated delete documents" ON public.documents
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- document_chunks: authenticated users
CREATE POLICY "Authenticated read document_chunks" ON public.document_chunks
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated insert document_chunks" ON public.document_chunks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 3. Fix storage bucket: make documents private
-- ============================================================
UPDATE storage.buckets SET public = false WHERE name = 'documents';

-- Storage policies for documents bucket (authenticated only)
DROP POLICY IF EXISTS "Authenticated upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete documents" ON storage.objects;

CREATE POLICY "Authenticated upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND auth.uid() IS NOT NULL
  );
CREATE POLICY "Authenticated read documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND auth.uid() IS NOT NULL
  );
CREATE POLICY "Authenticated delete documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND auth.uid() IS NOT NULL
  );

-- Storage policies for ronda-photos bucket (authenticated only)
DROP POLICY IF EXISTS "Authenticated upload ronda-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read ronda-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete ronda-photos" ON storage.objects;

CREATE POLICY "Authenticated upload ronda-photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ronda-photos' AND auth.uid() IS NOT NULL
  );
CREATE POLICY "Authenticated read ronda-photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'ronda-photos' AND auth.uid() IS NOT NULL
  );
CREATE POLICY "Authenticated delete ronda-photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'ronda-photos' AND auth.uid() IS NOT NULL
  );

-- ============================================================
-- 4. Add missing indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_user_cpf ON public.quotes(user_cpf);
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);
CREATE INDEX IF NOT EXISTS idx_archived_files_category ON public.archived_files(category);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON public.documents(uploaded_at);
