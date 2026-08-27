import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Download, FileText, History, Sparkles, Trash2 } from "lucide-react";
import { documentsQueryOptions, promptsQueryOptions } from "../lib/queries";
import { generatePromptFn, deletePromptFn } from "../lib/prompt.functions";
import { downloadPdf, downloadTxt } from "../lib/export";

export const Route = createFileRoute("/prompt")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(documentsQueryOptions),
      context.queryClient.ensureQueryData(promptsQueryOptions),
    ]),
  head: () => ({
    meta: [
      { title: "RAGMasterPrompt — Gerar Prompt Mestre" },
      {
        name: "description",
        content:
          "Gere prompts mestres estruturados e documentados, prontos para LLMs e geradores de agentes de IA, com exportação em PDF ou TXT.",
      },
      { property: "og:title", content: "RAGMasterPrompt — Gerar Prompt Mestre" },
      {
        property: "og:description",
        content:
          "Gere prompts mestres estruturados e documentados, prontos para LLMs e geradores de agentes de IA, com exportação em PDF ou TXT.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PromptPage,
});

function PromptPage() {
  const { data: documents } = useSuspenseQuery(documentsQueryOptions);
  const { data: prompts } = useSuspenseQuery(promptsQueryOptions);
  const queryClient = useQueryClient();
  const generate = useServerFn(generatePromptFn);
  const deletePrompt = useServerFn(deletePromptFn);

  const indexed = documents.filter((d) => d.status === "indexed");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [objective, setObjective] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [result, setResult] = useState<{ title: string; content: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function toggleId(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const out = await generate({ data: { documentIds: selectedIds, objective } });
      setResult(out);
      await queryClient.invalidateQueries({ queryKey: ["prompts"] });
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Falha ao gerar o prompt.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const safeName = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "prompt-mestre";

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <aside className="space-y-5">
        <div>
          <h1 className="font-display text-lg font-bold tracking-[0.25em] text-foreground">
            GERAR <span className="text-neon-amber glow-amber">PROMPT</span>
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Selecione as fontes e descreva o objetivo do agente. O resultado é um texto estruturado,
            documentado com comentários, pronto para LLMs e geradores de agentes de IA.
          </p>
        </div>

        <section className="glass-panel p-4">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            Fontes (vazio = todas)
          </h2>
          <div className="mt-3 space-y-2">
            {indexed.length === 0 && (
              <p className="font-mono text-xs text-muted-foreground">
                Nenhuma fonte indexada disponível.
              </p>
            )}
            {indexed.map((doc) => {
              const active = selectedIds.includes(doc.id);
              return (
                <button
                  key={doc.id}
                  onClick={() => toggleId(doc.id)}
                  className={`glass-panel w-full px-3 py-2 text-left font-mono text-xs transition-shadow ${
                    active
                      ? "border-primary/60 text-primary shadow-[0_0_18px_color-mix(in_oklab,var(--neon-cyan)_25%,transparent)]"
                      : "text-muted-foreground"
                  }`}
                >
                  {doc.name}
                </button>
              );
            })}
          </div>
        </section>

        <section className="glass-panel p-4">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            Objetivo do agente
          </h2>
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            rows={4}
            placeholder="Ex.: agente de suporte que responde sobre produtos e pedidos usando as tabelas indexadas…"
            className="input-neon mt-3 resize-y"
          />
          <button
            onClick={() => void handleGenerate()}
            disabled={generating || indexed.length === 0}
            className="btn-fire mt-4 w-full"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? "Gerando…" : "Gerar Prompt"}
          </button>
          {genError && <p className="mt-3 font-mono text-xs text-neon-rose">{genError}</p>}
        </section>

        {prompts.length > 0 && (
          <section className="glass-panel p-4">
            <h2 className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
              <History className="h-3.5 w-3.5" /> Histórico
            </h2>
            <ul className="mt-3 space-y-1.5">
              {prompts.map((p) => (
                <li key={p.id} className="flex items-center gap-1">
                  <button
                    onClick={() => setResult({ title: p.title, content: p.content })}
                    className="flex-1 truncate rounded-md px-2 py-1.5 text-left font-mono text-[0.68rem] text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                  >
                    {p.title}
                  </button>
                  <button
                    onClick={() =>
                      void deletePrompt({ data: { id: p.id } }).then(() =>
                        queryClient.invalidateQueries({ queryKey: ["prompts"] }),
                      )
                    }
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:text-neon-rose"
                    aria-label={`Excluir ${p.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>

      <section className="glass-panel neon-frame flex min-h-[60vh] flex-col p-6">
        {result ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <h2 className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-foreground">
                <FileText className="h-4 w-4 text-neon-amber" />
                {result.title}
              </h2>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => void handleCopy()} className="btn-ghost">
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copiado!" : "Copiar"}
                </button>
                <button
                  onClick={() => downloadTxt(`${safeName(result.title)}.txt`, result.content)}
                  className="btn-ghost"
                >
                  <Download className="h-3.5 w-3.5" />
                  TXT
                </button>
                <button
                  onClick={() =>
                    void downloadPdf(`${safeName(result.title)}.pdf`, result.title, result.content)
                  }
                  className="btn-ghost"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </button>
              </div>
            </div>
            <pre className="mt-4 flex-1 overflow-auto whitespace-pre-wrap break-words font-mono text-[0.75rem] leading-relaxed text-foreground">
              {result.content}
            </pre>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <Sparkles className="h-10 w-10 text-neon-amber glow-amber" />
            <p className="max-w-sm text-sm text-muted-foreground">
              O prompt mestre gerado aparecerá aqui — estruturado em seções, com dados em linguagem
              natural, tabelas em JSON e comentários explicativos.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
