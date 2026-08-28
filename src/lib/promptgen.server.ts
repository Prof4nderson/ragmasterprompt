import { getGroqClient, GROQ_MODEL_NAME } from "./ai-gateway.server";

export async function generateMasterPrompt(data: { documentIds: string[]; objective: string }) {
  const groq = getGroqClient();

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL_NAME,
    messages: [
      {
        role: "system",
        content:
          'Você é um especialista em Prompt Engineering. Crie um prompt mestre em JSON com a estrutura {"title": "...", "content": "..."}.',
      },
      {
        role: "user",
        content: `Objetivo: ${data.objective}\nDocumentos selecionados: ${data.documentIds.join(", ")}`,
      },
    ],
    temperature: 0.3,
  });

  const rawText = response?.choices?.[0]?.message?.content ?? "";
  const cleanedText = String(rawText)
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleanedText);
  } catch {
    return {
      title: "Prompt Gerado",
      content: cleanedText || "Não foi possível gerar o conteúdo do prompt.",
    };
  }
}