import { getGroqClient, GROQ_MODEL_NAME } from "./ai-gateway.server";
import { PDFParse } from "pdf-parse";

export function fileExtension(filename: string): string {
  if (!filename) return "";
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
}

export async function parseFileServer(fileData: ArrayBuffer, fileName: string, fileType: string) {
  const uint8Array = new Uint8Array(fileData);
  let extractedText = "";

  if (fileType === "application/pdf" || fileExtension(fileName) === "pdf") {
    try {
      // Instancia a classe PDFParse conforme a API v2 da biblioteca
      const parser = new PDFParse({ data: uint8Array });
      const parsedPdf = await parser.getText();
      await parser.destroy();
      
      extractedText = parsedPdf.text;
    } catch (e: any) {
      console.error("Erro no parser do PDF:", e);
      throw new Error(`Falha ao processar o PDF no servidor: ${e.message}`);
    }
  } else {
    const decoder = new TextDecoder("utf-8");
    extractedText = decoder.decode(fileData);
  }

  const safeText = String(extractedText || "")
    .replace(/\0/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .trim();

  const groq = getGroqClient();
  const truncatedText = safeText.slice(0, 12000);

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL_NAME,
    messages: [
      {
        role: "system",
        content:
          'Analise o texto do documento e retorne um objeto JSON com o resumo. Responda APENAS o JSON puro no formato {"summary": "..."}. Não utilize marcadores markdown.',
      },
      { role: "user", content: truncatedText },
    ],
    temperature: 0.1,
    max_tokens: 1500,
  });

  const rawContent = response?.choices?.[0]?.message?.content ?? "";
  const cleanJson = String(rawContent)
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  let summary = "Nenhum conteúdo gerado pelo modelo.";
  try {
    const parsedJson = JSON.parse(cleanJson);
    summary = parsedJson.summary || rawContent;
  } catch {
    summary = rawContent;
  }

  return {
    content: safeText,
    summary,
  };
}