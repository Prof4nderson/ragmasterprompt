import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, Database, Pencil, X } from "lucide-react";
import { documentsQueryOptions } from "../lib/queries";
import { getDocumentFn, updateChunkFn } from "../lib/documents.functions";
import { KindBadge } from "../components/KindBadge";
import { JsonView } from "../components/JsonView";

export const Route = createFileRoute("/preview")({
  loader: ({ context }) => context.queryClient.ensureQueryData(documentsQueryOptions),
  head: () => ({
    meta: [
      { title: "RAGMasterPrompt — Data Preview" },
      {
        name: "description",
        content:
          "Visualize e edite os dados indexados: entidades, chaves, relações, tabelas em JSON e chunks vetorizados, com cores por natureza da informação.",
      },
      { property: "og:title", content: "RAGMasterPrompt — Data Preview" },
      {
        property: "og:description",
        content:
          "Visualize e edite os dados indexados: entidades, chaves, relações, tabelas em JSON e chunks vetorizados, com cores por natureza da informação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PreviewPage,
});

interface Entity {
  name: string;
  type: string;
  description: string;
}
interface KeyField {
  name: string;
  entity: string;
  role: string;
}
interface Relation {
  from: string;
  to: string;
  description: string;
}
interface TableInfo {
  name: string;
  columns: string[];
  rowCount: number;
  sample: Record<string, unknown>[];
}
interface StructuredData {
  entities?: Entity[];
  keys?: KeyField[];
  relations?: Relation[];
  tables?: TableInfo[];
}

const KIND_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "text", label: "Texto" },
  { value: "table", label: "Tabelas" },
] as const;

function PreviewPage() {
  const { data: documents } = useSuspenseQuery(documentsQueryOptions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const queryClient = useQueryClient();
  const updateChunk = useServerFn(updateChunkFn);

  const activeId = selectedId ?? documents[0]?.id ?? null;

  const { data: detail, isFetching } = useQuery({
    queryKey: ["document", activeId],
    queryFn: () => getDocumentFn({ data: { id: activeId! } }),
    enabled: !!activeId,
  });

  async function saveChunk(id: string) {
    await updateChunk({ data: { id, content: draft } });
    setEditingId(null);
    await queryClient.invalidateQueries({ queryKey: ["document", activeId] });
  }

  if (documents.length === 0) {
    return (
      <div className="glass-panel mx-auto max-w-xl p-10 text-center">
        <Database className="mx-auto h-8 w-8 text-primary glow-cyan" />
        <h1 className="mt-4 font-display text-lg font-bold tracking-widest text-foreground">
          DATA PREVIEW
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhuma fonte indexada ainda. Envie arquivos na página Fontes para visualizar e editar os
          dados aqui.
        </p>
      </div>
    );
  }

  // Verificação correta: se o documento está ativo mas o detail ainda não carregou
  if (!detail) {
    return (
      <div className="glass-panel mx-auto max-w-xl p-10 text-center">
        <p className="font-mono text-xs text-neon-amber animate-pulse-glow">
          Carregando detalhes do documento...
        </p>
      </div>
    );
  }

  const sd = (detail?.document?.structured_data ?? {}) as StructuredData;
  const chunks = detail?.chunks ?? [];
  const filteredChunks =
    kindFilter === "all" ? chunks : chunks.filter((c) => c.kind === kindFilter);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
           <aside className="space-y-2">
        <h1 className="px-1 font-display text-sm font-bold uppercase tracking-[0.25em] text-foreground">
          Data Preview
        </h1>
        {documents.map((doc) => (
          <button
            key={doc.id}
            onClick={() => {
              setSelectedId(doc.id);
              setEditingId(null);
            }}
            className={`glass-panel w-full px-4 py-3 text-left transition-shadow ${
              doc.id === activeId
                ? "border-primary/50 shadow-[0_0_24px_color-mix(in_oklab,var(--neon-cyan)_20%,transparent)]"
                : ""
            }`}
          >
            <p className="break-all font-mono text-xs font-semibold text-foreground">{doc.name}</p>
            <p className="mt-1 font-mono text-[0.62rem] text-muted-foreground">
              {doc.file_type} · {doc.chunk_count} chunks
            </p>
          </button>
        ))}
      </aside>

      <div className="space-y-6">
        {isFetching && (
          <p className="font-mono text-xs text-neon-amber animate-pulse-glow">sincronizando…</p>
        )}

        {detail && (
          <>
            <section className="glass-panel p-5">
              <h2 className="font-display text-xs font-bold uppercase tracking-[0.25em] text-primary glow-cyan">
                Resumo
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                {detail?.document?.summary ?? "Sem resumo disponível."}
              </p>
            </section>

            {(sd.entities?.length || sd.keys?.length || sd.relations?.length) && (
              <section className="grid gap-4 md:grid-cols-3">
                <div className="glass-panel p-4">
                  <h3 className="flex items-center gap-2 font-display text-[0.65rem] font-bold uppercase tracking-[0.2em]">
                    <span className="kind-badge kind-entity">Entidades</span>
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {(sd.entities ?? []).map((e, i) => (
                      <li key={i} className="rounded-lg border border-border bg-secondary/50 p-2.5">
                        <p className="font-mono text-xs font-semibold text-neon-magenta">
                          {e.name}
                          <span className="ml-2 text-[0.6rem] font-normal text-muted-foreground">
                            {e.type}
                          </span>
                        </p>
                        <p className="mt-1 text-[0.7rem] text-muted-foreground">{e.description}</p>
                      </li>
                    ))}
                    {!sd.entities?.length && (
                      <li className="font-mono text-xs text-muted-foreground">—</li>
                    )}
                  </ul>
                </div>

                <div className="glass-panel p-4">
                  <h3 className="flex items-center gap-2 font-display text-[0.65rem] font-bold uppercase tracking-[0.2em]">
                    <span className="kind-badge kind-key">Chaves</span>
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {(sd.keys ?? []).map((k, i) => (
                      <li key={i} className="rounded-lg border border-border bg-secondary/50 p-2.5">
                        <p className="font-mono text-xs font-semibold text-neon-amber">{k.name}</p>
                        <p className="mt-1 text-[0.7rem] text-muted-foreground">
                          {k.entity} · {k.role}
                        </p>
                      </li>
                    ))}
                    {!sd.keys?.length && (
                      <li className="font-mono text-xs text-muted-foreground">—</li>
                    )}
                  </ul>
                </div>

                <div className="glass-panel p-4">
                  <h3 className="flex items-center gap-2 font-display text-[0.65rem] font-bold uppercase tracking-[0.2em]">
                    <span className="kind-badge kind-relation">Relações</span>
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {(sd.relations ?? []).map((r, i) => (
                      <li key={i} className="rounded-lg border border-border bg-secondary/50 p-2.5">
                        <p className="flex items-center gap-1.5 font-mono text-xs font-semibold text-neon-rose">
                          {r.from} <ArrowRight className="h-3 w-3" /> {r.to}
                        </p>
                        <p className="mt-1 text-[0.7rem] text-muted-foreground">{r.description}</p>
                      </li>
                    ))}
                    {!sd.relations?.length && (
                      <li className="font-mono text-xs text-muted-foreground">—</li>
                    )}
                  </ul>
                </div>
              </section>
            )}

            {!!sd.tables?.length && (
              <section className="space-y-4">
                <h2 className="font-display text-xs font-bold uppercase tracking-[0.25em] text-neon-lime">
                  Tabelas em JSON
                </h2>
                {sd.tables.map((t, i) => (
                  <div key={i} className="glass-panel p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="kind-badge kind-table">{t.name}</span>
                      <span className="font-mono text-[0.65rem] text-muted-foreground">
                        {t.rowCount} linhas · {t.columns.length} colunas
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {t.columns.map((c) => (
                        <span
                          key={c}
                          className="glass-chip px-2.5 py-0.5 font-mono text-[0.62rem] text-neon-cyan"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                    {!!t.sample?.length && (
                      <pre className="mt-4 max-h-72 overflow-auto rounded-lg border border-border bg-background/60 p-4 font-mono text-[0.7rem] leading-relaxed">
                        <JsonView data={t.sample} />
                      </pre>
                    )}
                  </div>
                ))}
              </section>
            )}

            <section>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xs font-bold uppercase tracking-[0.25em] text-foreground">
                  Chunks indexados ({filteredChunks.length})
                </h2>
                <div className="flex gap-1.5">
                  {KIND_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setKindFilter(f.value)}
                      className={`glass-chip px-3 py-1 font-mono text-[0.65rem] uppercase tracking-wider transition-colors ${
                        kindFilter === f.value ? "text-primary glow-cyan" : "text-muted-foreground"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <ul className="mt-4 space-y-3">
                {filteredChunks.map((chunk) => (
                  <li key={chunk.id} className="glass-panel p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <KindBadge kind={chunk.kind} />
                        <span className="font-mono text-[0.62rem] text-muted-foreground">
                          #{chunk.chunk_index}
                        </span>
                      </div>
                      {editingId === chunk.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => void saveChunk(chunk.id)}
                            className="rounded-md p-1.5 text-neon-lime transition-colors hover:bg-secondary"
                            aria-label="Salvar chunk"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-md p-1.5 text-neon-rose transition-colors hover:bg-secondary"
                            aria-label="Cancelar edição"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(chunk.id);
                            setDraft(chunk.content);
                          }}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-primary"
                          aria-label="Editar chunk"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {editingId === chunk.id ? (
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={8}
                        className="input-neon mt-3 resize-y"
                      />
                    ) : (
                      <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[0.7rem] leading-relaxed text-muted-foreground">
                        {chunk.content}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
