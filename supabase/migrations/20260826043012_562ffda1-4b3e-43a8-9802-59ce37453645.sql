CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;

CREATE OR REPLACE FUNCTION public.match_chunks(query_embedding extensions.vector, match_count integer DEFAULT 8)
RETURNS TABLE (id uuid, document_id uuid, content text, kind text, metadata jsonb, similarity double precision)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions
AS $$
  SELECT c.id, c.document_id, c.content, c.kind, c.metadata,
    1 - (c.embedding OPERATOR(extensions.<=>) query_embedding)::double precision AS similarity
  FROM public.chunks c
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding OPERATOR(extensions.<=>) query_embedding
  LIMIT match_count;
$$;
GRANT EXECUTE ON FUNCTION public.match_chunks(extensions.vector, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.match_chunks(extensions.vector, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_chunks(extensions.vector, integer) TO service_role;