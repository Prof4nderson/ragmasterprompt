import { getGroqClient, GROQ_MODEL_NAME } from "./ai-gateway.server";
import { safeTrim } from "./utils";
export async function generateMasterPrompt(data: { documentIds: string[]; objective: string }) {
  const groq = getGroqClient();

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL_NAME,
    messages: [
      {
        role: "system",
        content:
          'Você é um engenheiro de prompts especialista. Responda APENAS em JSON válido no formato {"title": "...", "content": "..."}. Não utilize blocos de código markdown como ```json.',
      },
      {
        role: "user",
        content: `Crie um prompt mestre detalhado com base neste objetivo: ${data.objective}`,
      },
    ],
    temperature: 0.3,
  });
const rawContent = response?.choices?.[0]?.message?.content || "";

const cleanedJsonString = safeTrim(rawContent)
  .replace(/^```json\s*/i, "")
  .replace(/^```\s*/i, "")
  .replace(/\s*```$/i, "")
  .trim();
  const rawText = response.choices[0]?.message?.content || "";
  const cleanedText = String(rawContent)
  .replace(/```json/gi, "")
  .replace(/```/g, "")
  .trim();

  try {
    return JSON.parse(cleanedText);
  } catch {
    return {
      title: "Prompt Gerado",
      content: rawText || "Não foi possível gerar o conteúdo do prompt.",
    };
  }
}