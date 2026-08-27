import { getGroqClient, GROQ_MODEL_NAME } from "./ai-gateway.server";

export interface ParsedTable {
  name: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

export function fileExtension(filename: string): string {
  if (!filename) return "";
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
}

export async function parseFileWithGroq(textChunk: string) {
  const groq = getGroqClient();

  // Trunca o texto para evitar estourar a janela de tokens
  const truncatedText = (textChunk || "").slice(0, 12000);

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL_NAME,
    messages: [
      {
        role: "system",
        content:
          'Analise o trecho do documento e retorne um objeto JSON com o resumo. Responda APENAS o JSON puro no formato {"summary": "..."}. Não utilize marcadores markdown.',
      },
      { role: "user", content: truncatedText },
    ],
    temperature: 0.1,
    max_tokens: 1500,
  });

  // Garante que rawContent seja sempre uma string, mesmo se choices[0]?.message?.content for undefined
  const rawContent = response?.choices?.[0]?.message?.content ?? "";
const cleanJson = String(rawContent)
  .replace(/```json/gi, "")
  .replace(/```/g, "")
  .trim();

  

  if (!cleanJson) {
    return { summary: "Nenhum conteúdo foi retornado do modelo." };
  }

  try {
    return JSON.parse(cleanJson);
  } catch {
    return { summary: rawContent };
  }
}

export async function parseFile(file: File) {
  const text = await file.text();
  return parseFileWithGroq(text);
}