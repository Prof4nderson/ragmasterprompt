import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, FileUp, Loader2, XCircle } from "lucide-react";
import { parseFile, fileExtension } from "../lib/parse-files";
import { ingestDocumentFn } from "../lib/documents.functions";

interface UploadItem {
  key: string;
  name: string;
  status: "parsing" | "indexing" | "done" | "error";
  message?: string;
}

const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.json,.yml,.yaml,.txt,.md";

export function UploadZone({ onIngested }: { onIngested: () => void }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const ingest = useServerFn(ingestDocumentFn);

  function patchItem(key: string, patch: Partial<UploadItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    for (const file of list) {
      const key = crypto.randomUUID();
      setItems((prev) => [...prev, { key, name: file.name, status: "parsing" }]);
      try {
        const parsed = await parseFile(file);
        if (!parsed.text.trim() && !parsed.tables.length) {
          throw new Error("Nenhum conteúdo extraído do arquivo.");
        }
        patchItem(key, { status: "indexing" });
        const result = await ingest({
          data: {
            name: file.name,
            fileType: fileExtension(file.name),
            sizeBytes: file.size,
            text: parsed.text,
            tables: parsed.tables,
          },
        });
        patchItem(key, { status: "done", message: `${result.chunks} chunks indexados` });
      } catch (e) {
        patchItem(key, {
          status: "error",
          message: e instanceof Error ? e.message : "Falha ao processar arquivo.",
        });
      }
    }
    onIngested();
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Enviar arquivos para indexação"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
        }}
        className={`glass-panel neon-frame flex cursor-pointer flex-col items-center justify-center gap-3 px-6 py-12 text-center transition-shadow ${
          dragOver ? "shadow-[0_0_50px_color-mix(in_oklab,var(--neon-cyan)_35%,transparent)]" : ""
        }`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/40 bg-primary/10">
          <FileUp className="h-6 w-6 text-primary glow-cyan" />
        </span>
        <p className="font-display text-sm font-bold tracking-[0.2em] text-foreground">
          SOLTE ARQUIVOS OU <span className="text-primary glow-cyan">CLIQUE PARA ENVIAR</span>
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          PDF · DOC · XLS · CSV · JSON · YML — extração, chunking, embeddings e indexação vetorial
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li
              key={item.key}
              className="glass-panel flex items-center gap-3 px-4 py-2.5 font-mono text-xs"
            >
              {item.status === "done" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-neon-lime" />
              ) : item.status === "error" ? (
                <XCircle className="h-4 w-4 shrink-0 text-neon-rose" />
              ) : (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neon-amber" />
              )}
              <span className="truncate text-foreground">{item.name}</span>
              <span className="ml-auto shrink-0 text-muted-foreground">
                {item.status === "parsing" && "extraindo…"}
                {item.status === "indexing" && "vetorizando…"}
                {item.status === "done" && (item.message ?? "concluído")}
                {item.status === "error" && (item.message ?? "erro")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
