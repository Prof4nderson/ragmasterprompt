import { queryOptions } from "@tanstack/react-query";
import { listDocumentsFn } from "./documents.functions";
import { listPromptsFn } from "./prompt.functions";

export const documentsQueryOptions = queryOptions({
  queryKey: ["documents"],
  queryFn: async () => {
    const res = await listDocumentsFn();
    // Extrai o array caso res venha envelopado como objeto ou null
    if (Array.isArray(res)) return res;
    if (res && typeof res === "object" && "data" in res) return (res as any).data ?? [];
    if (res && typeof res === "object" && "documents" in res) return (res as any).documents ?? [];
    return [];
  },
});

export const promptsQueryOptions = queryOptions({
  queryKey: ["prompts"],
  queryFn: async () => {
    const res = await listPromptsFn();
    // Extrai o array caso res venha envelopado como objeto ou null
    if (Array.isArray(res)) return res;
    if (res && typeof res === "object" && "data" in res) return (res as any).data ?? [];
    if (res && typeof res === "object" && "prompts" in res) return (res as any).prompts ?? [];
    return [];
  },
});