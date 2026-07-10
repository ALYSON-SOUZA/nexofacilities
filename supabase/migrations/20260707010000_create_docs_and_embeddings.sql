-- Create pgvector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table to store intelligent document references
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  user_responsible TEXT NOT NULL,
  theme_tag TEXT,
  original_file_path TEXT NOT NULL,
  summary_txt_path TEXT NOT NULL,
  extracted_text TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create document_chunks table to store document section embeddings
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768), -- Gemini embedding models default to 768 dimensions
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Create permissive public policies for convenience (mirroring standard app tables pattern)
CREATE POLICY "Allow public select" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.documents FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.documents FOR DELETE USING (true);

CREATE POLICY "Allow public select chunks" ON public.document_chunks FOR SELECT USING (true);
CREATE POLICY "Allow public insert chunks" ON public.document_chunks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update chunks" ON public.document_chunks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete chunks" ON public.document_chunks FOR DELETE USING (true);

-- Create vector similarity search function matching embeddings
CREATE OR REPLACE FUNCTION public.match_document_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
