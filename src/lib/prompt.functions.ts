import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getGroqClient, GROQ_MODEL_NAME } from "./ai-gateway.server";
import { listPrompts } from "./documents.server";

export const generatePromptFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        documentIds: z.array(z.string()),
        objective: z.string(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const groq = getGroqClient();

    const res = await groq.chat.completions.create({
      model: GROQ_MODEL_NAME,
      messages: [
        {
          role: "system",
          content:
            'Gere um prompt mestre estruturado com base nos dados. Responda em formato JSON simples: {"title": "...", "content": "..."}. Não utilize marcadores markdown.',
        },
        {
          role: "user",
          content: `Objetivo: ${data.objective}\nDocumentos: ${data.documentIds.join(", ")}`,
        },
      ],
      temperature: 0.2,
    });

    // Casting explícito com String()
    const rawContent = res?.choices?.[0]?.message?.content ?? "";
    const cleaned = String(rawContent)
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      return {
        title: "Prompt Gerado",
        content: cleaned || "Não foi possível estruturar o conteúdo do prompt.",
      };
    }
  });

export const listPromptsFn = createServerFn({ method: "GET" }).handler(async () => {
  return await listPrompts();
});