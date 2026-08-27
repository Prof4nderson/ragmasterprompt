import Groq from "groq-sdk";

export function getGroqApiKey(): string {
  const metaEnv = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
  const processEnv = typeof process !== "undefined" && process.env ? process.env : {};

  const apiKey =
    processEnv["GROQ_API_KEY"] ||
    processEnv["VITE_GROQ_API_KEY"] ||
    metaEnv["VITE_GROQ_API_KEY"] ||
    metaEnv["GROQ_API_KEY"];

  if (!apiKey) {
    throw new Error("GROQ_API_KEY não configurada no ambiente (.env).");
  }

  return apiKey;
}

export function getGroqModel(): string {
  const metaEnv = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
  const processEnv = typeof process !== "undefined" && process.env ? process.env : {};

  return (
    processEnv["GROQ_MODEL"] ||
    processEnv["VITE_GROQ_MODEL"] ||
    metaEnv["VITE_GROQ_MODEL"] ||
    metaEnv["GROQ_MODEL"] ||
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