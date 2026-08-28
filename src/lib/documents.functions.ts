import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listDocuments, deleteDocument } from "./documents.server";
import { getServerSupabase } from "./supabase.server";
import { embedTexts, toVectorLiteral } from "./rag.server";
import { parseFileServer, fileExtension } from "./parse-files.server";

function sanitizeText(text: unknown): string {
  if (!text) return "";
  return String(text)
    .replace(/\0/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .trim();
}

export const listDocumentsFn = createServerFn({ method: "GET" }).handler(async () => {
  return await listDocuments();
});

export const deleteDocumentFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ id: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    return await deleteDocument(data.id);
  });

export const uploadAndCreateDocumentFn = createServerFn({ method: "POST" })
  .validator((data: any) => data)
  .handler(async ({ data }) => {
    // data conterá { fileName, fileType, fileBase64 } ou similar enviado do client
    // Alternativamente, se preferir receber o ArrayBuffer serializado:
    const { fileName, fileType, arrayBufferArray } = data;
    const buffer = new Uint8Array(arrayBufferArray).buffer;

    const parsed = await parseFileServer(buffer, fileName, fileType);

    if (!parsed.content) {
      throw new Error(`O arquivo ${fileName} está vazio ou não pôde ser lido.`);
    }

    const supabase = getServerSupabase();
    const sanitizedTitle = sanitizeText(fileName);
    const sanitizedSummary = sanitizeText(parsed.summary);
    const safeContent = sanitizeText(parsed.content);
    const kind = fileExtension(fileName) || "txt";

    // 1. Insere o documento principal
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        name: sanitizedTitle,
        title: sanitizedTitle,
        file_type: kind,
        kind: kind,
        summary: sanitizedSummary,
      })
      .select()
      .single();

    if (docError || !doc) {
      throw new Error(`Erro ao salvar documento: ${docError?.message}`);
    }

    // 2. Divide em chunks e gera embeddings (768 dimensões)
    const chunkSize = 2000;
    const chunks: string[] = [];
    for (let i = 0; i < safeContent.length; i += chunkSize) {
      chunks.push(sanitizeText(safeContent.slice(i, i + chunkSize)));
    }

    const embeddings = await embedTexts(chunks);

    const chunkInserts = chunks.map((chunkText, index) => ({
      document_id: doc.id,
      chunk_index: index,
      content: chunkText,
      embedding: embeddings[index] ? toVectorLiteral(embeddings[index]) : null,
    }));

    const { error: chunkError } = await supabase
      .from("document_chunks")
      .insert(chunkInserts);

    if (chunkError) {
      console.error("Erro ao salvar chunks do documento:", chunkError);
    }

    return doc;
  });
  export const getDocumentFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ id: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const supabase = getServerSupabase();
    const { data: doc, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", data.id)
      .single();

    if (error) {
      throw new Error(`Erro ao buscar documento: ${error.message}`);
    }

    return doc;
  });

  export const updateChunkFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({
      id: z.string(),
      content: z.string(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const supabase = getServerSupabase();
    const { error } = await supabase
      .from("document_chunks")
      .update({ content: data.content })
      .eq("id", data.id);

    if (error) {
      throw new Error(`Erro ao atualizar chunk: ${error.message}`);
    }

    return { success: true };
  });