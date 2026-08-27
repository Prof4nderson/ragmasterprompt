CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing',
  summary TEXT,
  structured_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access documents" ON public.documents FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'text',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding vector,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chunks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chunks TO authenticated;
GRANT ALL ON public.chunks TO service_role;
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access chunks" ON public.chunks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX chunks_document_id_idx ON public.chunks(document_id);

CREATE TABLE public.generated_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_prompts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_prompts TO authenticated;
GRANT ALL ON public.generated_prompts TO service_role;
ALTER TABLE public.generated_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access generated_prompts" ON public.generated_prompts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.match_chunks(query_embedding vector, match_count integer DEFAULT 8)
RETURNS TABLE (id uuid, document_id uuid, content text, kind text, metadata jsonb, similarity double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.document_id, c.content, c.kind, c.metadata,
    1 - (c.embedding <=> query_embedding)::double precision AS similarity
  FROM public.chunks c
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
GRANT EXECUTE ON FUNCTION public.match_chunks(vector, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.match_chunks(vector, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_chunks(vector, integer) TO service_role;