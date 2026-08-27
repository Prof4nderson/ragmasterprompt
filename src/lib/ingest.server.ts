import { generateText, Output } from "ai";
import { z } from "zod";
import { createGroqProvider, getGroqApiKey, GROQ_MODEL } from "./ai-gateway.server";
import { getServerSupabase } from "./supabase.server";
import { chunkText, embedTexts, toVectorLiteral } from "./rag.server";

const AnalysisSchema = z.object({
  summary: z.string(),
  entities: z.array(
    z.object({ name: z.string(), type: z.string(), description: z.string() }),
  ),
  keys: z.array(z.object({ name: z.string(), entity: z.string(), role: z.string() })),
  relations: z.array(
    z.object({ from: z.string(), to: z.string(), description: z.string() }),
  ),
});

interface TableInput {
  name: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface IngestInput {
  name: string;
  fileType: string;
  sizeBytes: number;
  text: string;
  tables: TableInput[];
}

export async function ingestDocument(input: IngestInput) {
  const supabase = getServerSupabase();
  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      name: input.name,
      file_type: input.fileType,
      size_bytes: input.sizeBytes,
      status: "processing",
    })
    .select("id")
    .single();
  if (error || !doc) throw new Error(error?.message ?? "Falha ao registrar documento.");

  try {
    const textChunks = chunkText(input.text).map((content, i) => ({
      content,
      kind: "text" as const,
      metadata: { part: i + 1 },
    }));

    const tableChunks: { content: string; kind: string; metadata: Record<string, unknown> }[] = [];
    const ROWS_PER_CHUNK = 40;
    for (const table of input.tables) {
      for (let i = 0; i < table.rows.length; i += ROWS_PER_CHUNK) {
        const rows = table.rows.slice(i, i + ROWS_PER_CHUNK);
        tableChunks.push({
          content: JSON.stringify(
            { tabela: table.name, colunas: table.columns, linhas: rows },
            null,
            2,
          ),
          kind: "table",
          metadata: {
            table: table.name,
            rowStart: i,
            rowEnd: i + rows.length - 1,
            totalRows: table.rows.length,
          },
        });
      }
    }

    const all = [...textChunks, ...tableChunks].slice(0, 200);

    if (all.length) {
      const embeddings = await embedTexts(all.map((c) => c.content.slice(0, 8000)));
      if (embeddings.length !== all.length) {
        throw new Error("Falha ao gerar embeddings para todos os chunks.");
      }
      const rows = all.map((c, i) => ({
        document_id: doc.id as string,
        chunk_index: i,
        content: c.content,
        kind: c.kind,
        metadata: c.metadata,
        embedding: toVectorLiteral(embeddings[i] as number[]),
      }));
      for (let i = 0; i < rows.length; i += 50) {
        const { error: insertError } = await supabase.from("chunks").insert(rows.slice(i, i + 50));
        if (insertError) throw new Error(insertError.message);
      }
    }

    const analysis = await analyzeContent(input);
    const structured = {
      entities: analysis.entities,
      keys: analysis.keys,
      relations: analysis.relations,
      tables: input.tables.map((t) => ({
        name: t.name,
        columns: t.columns,
        rowCount: t.rows.length,
        sample: t.rows.slice(0, 5),
      })),
    };

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        status: "indexed",
        chunk_count: all.length,
        summary: analysis.summary,
        structured_data: structured,
      })
      .eq("id", doc.id);
    if (updateError) throw new Error(updateError.message);

    return { id: doc.id as string, chunks: all.length };
  } catch (e) {
    await supabase.from("documents").update({ status: "error" }).eq("id", doc.id);
    throw e;
  }
}

async function analyzeContent(input: IngestInput) {
  const gateway = createGroqProvider(getGroqApiKey());
  const tableInfo = input.tables
    .map((t) => `Tabela "${t.name}" com colunas: ${t.columns.join(", ")} (${t.rows.length} linhas)`)
    .join("\n");

  const prompt = `Analise o conteúdo extraído do arquivo "${input.name}" (tipo ${input.fileType}).

${tableInfo ? `TABELAS DETECTADAS:\n${tableInfo}\n\n` : ""}CONTEÚDO (amostra):
${input.text.slice(0, 12000)}

Responda exclusivamente em JSON válido, seguindo o schema solicitado.

Identifique e retorne (em JSON):
1. summary: resumo executivo do documento em português (2 a 4 frases)
2. entities: entidades de negócio/dados presentes (name, type como "pessoa|organização|produto|conceito|tabela|campo|local|evento|documento", description curta)
3. keys: chaves identificadoras (name do campo, entity à qual pertence, role: "primária|estrangeira|candidata|natural")
4. relations: relações entre entidades (from, to, description da relação)`;

  const { output } = await generateText({
    model: gateway(GROQ_MODEL),
    output: Output.object({ schema: AnalysisSchema }),
    prompt,
  });
  return output;
}
