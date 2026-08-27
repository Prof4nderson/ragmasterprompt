import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Database,
  File as FileIcon,
  FileCode2,
  FileJson2,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  Trash2,
  XCircle,
} from "lucide-react";
import { documentsQueryOptions } from "../lib/queries";
import { deleteDocumentFn } from "../lib/documents.functions";
import { UploadZone } from "../components/UploadZone";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(documentsQueryOptions),
  head: () => ({
    meta: [
      { title: "RAGMasterPrompt — Fontes de Dados" },
      {
        name: "description",
        content:
          "Ingira PDF, DOC, XLS, CSV, JSON e YAML em um RAG vetorial com pgvector e prepare seus dados para IA.",
      },
    ],
  }),
  component: HomePage,
});

const TYPE_BADGE: Record<string, string> = {
  pdf: "kind-badge kind-relation",
  doc: "kind-badge kind-text",
  docx: "kind-badge kind-text",
  xls: "kind-badge kind-table",
  xlsx: "kind-badge kind-table",
  csv: "kind-badge kind-table",
  json: "kind-badge kind-key",
  yml: "kind-badge kind-entity",
  yaml: "kind-badge kind-entity",
};

function typeIcon(type: string) {
  switch (type) {
    case "pdf":
    case "doc":
    case "docx":
      return FileText;
    case "xls":
    case "xlsx":
    case "csv":
      return FileSpreadsheet;
    case "json":
      return FileJson2;
    case "yml":
    case "yaml":
      return FileCode2;
    default:
      return FileIcon;
  }
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function HomePage() {
  const { data: rawData } = useSuspenseQuery(documentsQueryOptions);
  
  // Tratamento rigoroso de fallback para evitar erro de null no SSR/Hydrate
  const documents = Array.isArray(rawData) ? rawData : [];

  const queryClient = useQueryClient();
  const deleteDoc = useServerFn(deleteDocumentFn);

  const totalChunks = documents.reduce((acc, d) => acc + (d?.chunk_count ?? 0), 0);
  const indexedCount = documents.filter((d) => d?.status === "indexed").length;

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Excluir "${name}" e todos os seus chunks indexados?`)) return;
    await deleteDoc({ data: { id } });
    await queryClient.invalidateQueries({ queryKey: ["documents"] });
  }

  return (
    <div className="space-y-10">
      <section className="text-center">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
          rag · pgvector · ai gateway
        </p>
        <h1 className="mt-3 font-display text-3xl font-black tracking-wide sm:text-5xl">
          <span className="text-primary glow-cyan">RAGMASTER</span>
          <span className="text-accent glow-magenta">PROMPT</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Ingira dados de fontes distintas, indexe em vetores, transforme com chat de IA e gere
          prompts mestres prontos para geradores de agentes.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <span className="glass-chip flex items-center gap-2 px-4 py-1.5 font-mono text-xs text-neon-cyan">
            <Database className="h-3.5 w-3.5" /> {documents.length} fontes
          </span>
          <span className="glass-chip flex items-center gap-2 px-4 py-1.5 font-mono text-xs text-neon-lime">
            <Layers className="h-3.5 w-3.5" /> {totalChunks} chunks vetorizados
          </span>
          <span className="glass-chip flex items-center gap-2 px-4 py-1.5 font-mono text-xs text-neon-amber">
            <CheckCircle2 className="h-3.5 w-3.5" /> {indexedCount} indexadas
          </span>
        </div>
      </section>

      <UploadZone
        onIngested={() => void queryClient.invalidateQueries({ queryKey: ["documents"] })}
      />

      <section>
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.25em] text-foreground">
          Fontes indexadas
        </h2>
        {documents.length === 0 ? (
          <div className="glass-panel mt-4 p-10 text-center">
            <p className="font-mono text-sm text-muted-foreground">
              Nenhuma fonte ingerida ainda. Envie um arquivo acima para começar.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => {
              const Icon = typeIcon(doc.file_type);
              return (
                <article key={doc.id} className="glass-panel group flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary">
                      <Icon className="h-5 w-5 text-primary" />
                    </span>
                    <span className={TYPE_BADGE[doc.file_type] ?? "kind-badge kind-text"}>
                      {doc.file_type}
                    </span>
                  </div>
                  <div>
                    <h3 className="break-all font-mono text-sm font-semibold text-foreground">
                      {doc.name}
                    </h3>
                    <p className="mt-1 font-mono text-[0.65rem] text-muted-foreground">
                      {formatBytes(doc.size_bytes)} · {doc.chunk_count ?? 0} chunks ·{" "}
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString("pt-BR") : "-"}
                    </p>
                  </div>
                  {doc.summary && (
                    <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                      {doc.summary}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wider">
                      {doc.status === "indexed" && (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-neon-lime" />
                          <span className="text-neon-lime">indexado</span>
                        </>
                      )}
                      {doc.status === "processing" && (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-neon-amber" />
                          <span className="text-neon-amber">processando</span>
                        </>
                      )}
                      {doc.status === "error" && (
                        <>
                          <XCircle className="h-3.5 w-3.5 text-neon-rose" />
                          <span className="text-neon-rose">erro</span>
                        </>
                      )}
                    </span>
                    <button
                      onClick={() => void handleDelete(doc.id, doc.name)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-neon-rose"
                      aria-label={`Excluir ${doc.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}