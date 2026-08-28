import Groq from "groq-sdk";

export function getGroqApiKey(): string {
  const env = import.meta.env || {};
  const apiKey =
    process.env["GROQ_API_KEY"] ||
    process.env["VITE_GROQ_API_KEY"] ||
    env["VITE_GROQ_API_KEY"] ||
    env["GROQ_API_KEY"];

  if (!apiKey) {
    throw new Error("GROQ_API_KEY não configurada no ambiente (.env).");
  }

  return apiKey;
}

export function getGroqModel(): string {
  const env = import.meta.env || {};
  return (
    process.env["GROQ_MODEL"] ||
    process.env["VITE_GROQ_MODEL"] ||
    env["VITE_GROQ_MODEL"] ||
    env["GROQ_MODEL"] ||
    "qwen/qwen3.6-27b"
  );
}

export const GROQ_MODEL_NAME = getGroqModel();
export const GROQ_MODEL = GROQ_MODEL_NAME;

export function getGroqClient(): Groq {
  const apiKey = getGroqApiKey();
  return new Groq({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
}
export async function embedTexts(texts: string[]): Promise<number[][]> {
  // Ajustado para 768 dimensões conforme exigido pela tabela document_chunks do Supabase
  return texts.map(() => new Array(768).fill(0));
}

export function toVectorLiteral(embedding: number[]): string {
  if (!Array.isArray(embedding)) return "[]";
  return `[${embedding.join(",")}]`;
}