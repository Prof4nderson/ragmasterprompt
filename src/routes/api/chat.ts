import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText } from "ai";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages } = await request.json();
          const { createGroqProvider, getGroqApiKey, GROQ_MODEL } = await import(
            "@/lib/ai-gateway.server"
          );
          const { embedTexts, toVectorLiteral } = await import("@/lib/rag.server");
          const { getServerSupabase } = await import("@/lib/supabase.server");

          const modelMessages = await convertToModelMessages(messages);

          let query = "";
          for (let i = modelMessages.length - 1; i >= 0; i--) {
            const m = modelMessages[i];
            if (m && m.role === "user") {
              query =
                typeof m.content === "string"
                  ? m.content
                  : m.content
                      .filter((p): p is { type: "text"; text: string } => p.type === "text")
                      .map((p) => p.text)
                      .join("\n");
              break;
            }
          }

          let contextBlock = "Nenhum dado indexado disponível no momento.";
          if (query.trim()) {
            try {
              const [embedding] = await embedTexts([query]);
              if (!embedding) throw new Error("Embedding vazio retornado pelo gateway.");
              const supabase = getServerSupabase();
              const { data: matches } = await supabase.rpc("match_chunks", {
                query_embedding: toVectorLiteral(embedding),
                match_count: 10,
              });
              if (matches?.length) {
                contextBlock = matches
                  .map(
                    (m: { kind: string; similarity: number; content: string }, i: number) =>
                      `[Trecho ${i + 1} — natureza: ${m.kind}, relevância: ${(m.similarity * 100).toFixed(0)}%]\n${m.content}`,
                  )
                  .join("\n\n---\n\n");
              } else {
                contextBlock = "Nenhum trecho relevante encontrado na base indexada.";
              }
            } catch (retrievalError) {
              console.error("Falha na recuperação RAG:", retrievalError);
              contextBlock = "Recuperação de contexto indisponível neste momento.";
            }
          }

          const gateway = createGroqProvider(getGroqApiKey());
          const result = streamText({
            model: gateway(GROQ_MODEL),
            system: `Você é o assistente de IA do RAGMasterPrompt. Você responde em português, sempre com base no CONTEXTO RECUPERADO abaixo, extraído dos documentos indexados pelo usuário (PDF, DOC, XLS, CSV, JSON, YAML).

Você também executa TRANSFORMAÇÕES nos dados quando pedido: converter tabelas em JSON, reestruturar informações, identificar entidades/chaves/relações, resumir, reformatar e explicar.

Regras:
- Baseie as respostas no contexto; se algo não estiver no contexto, diga isso claramente.
- Ao transformar dados, entregue o resultado em blocos de código formatados (json, csv, markdown).
- Cite a natureza do dado usado (texto, tabela) quando relevante.

CONTEXTO RECUPERADO:
${contextBlock}`,
            messages: modelMessages,
          });
          return result.toUIMessageStreamResponse();
        } catch (e) {
          console.error("Erro no chat:", e);
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno no chat." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
