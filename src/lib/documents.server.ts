import { getServerSupabase } from "./supabase.server";
import { embedTexts, toVectorLiteral } from "./rag.server";

export async function listDocuments() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao listar documentos:", error);
    return [];
  }

  return data ?? [];
}

export async function getDocument(id: string) {
  const supabase = getServerSupabase();

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (docError) {
    console.error("Erro ao buscar documento:", docError);
    return null;
  }

  const { data: chunks, error: chunksError } = await supabase
    .from("document_chunks")
    .select("*")
    .eq("document_id", id)
    .order("chunk_index", { ascending: true });

  if (chunksError) {
    console.error("Erro ao buscar chunks:", chunksError);
  }

  return {
    ...doc,
    chunks: chunks ?? [],
  };
}

export async function deleteDocument(id: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function updateChunk(id: string, content: string, kind?: string) {
  const supabase = getServerSupabase();
  const [embedding] = await embedTexts([content.slice(0, 8000)]);
  if (!embedding) throw new Error("Falha ao gerar embedding para o chunk.");

  const { error } = await supabase
    .from("document_chunks")
    .update({
      content,
      ...(kind ? { kind } : {}),
      embedding: toVectorLiteral(embedding),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listPrompts() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("generated_prompts")
    .select("id, title, content, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deletePrompt(id: string) {
  const supabase = getServerSupabase();
  const { error } = await supabase.from("generated_prompts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}