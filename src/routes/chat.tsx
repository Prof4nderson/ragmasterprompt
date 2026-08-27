import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { Bot, SendHorizonal, User } from "lucide-react";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "RAGMasterPrompt — Chat IA" },
      {
        name: "description",
        content:
          "Converse com seus dados indexados: busca semântica no pgvector, transformações, conversões para JSON e análise por IA.",
      },
      { property: "og:title", content: "RAGMasterPrompt — Chat IA" },
      {
        property: "og:description",
        content:
          "Converse com seus dados indexados: busca semântica no pgvector, transformações, conversões para JSON e análise por IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

const SUGGESTIONS = [
  "Quais entidades e chaves existem nos dados indexados?",
  "Converta a primeira tabela em JSON organizado.",
  "Resuma o conteúdo dos documentos em tópicos.",
  "Quais relações existem entre as entidades?",
];

function messageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function ChatPage() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function send(text: string) {
    if (!text.trim() || busy) return;
    void sendMessage({ text });
    setInput("");
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-4xl flex-col">
      <header className="pb-4 text-center">
        <h1 className="font-display text-lg font-bold tracking-[0.25em] text-foreground">
          CHAT <span className="text-primary glow-cyan">IA</span>
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          recuperação semântica via pgvector · transformações sob demanda
        </p>
      </header>

      <div ref={scrollRef} className="glass-panel flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <Bot className="h-10 w-10 text-accent glow-magenta" />
            <p className="max-w-md text-sm text-muted-foreground">
              Pergunte sobre os dados indexados ou peça transformações — conversão de tabelas em
              JSON, extração de entidades, resumos e mais.
            </p>
            <div className="flex max-w-lg flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="glass-chip px-3.5 py-1.5 font-mono text-[0.68rem] text-muted-foreground transition-colors hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role !== "user" && (
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/40 bg-accent/10">
                <Bot className="h-4 w-4 text-accent" />
              </span>
            )}
            <div
              className={`max-w-[85%] rounded-xl border px-4 py-3 ${
                m.role === "user"
                  ? "border-primary/40 bg-primary/10"
                  : "border-border bg-secondary/60"
              }`}
            >
              {m.role === "user" ? (
                <p className="whitespace-pre-wrap text-sm text-foreground">{messageText(m)}</p>
              ) : (
                <div className="chat-markdown text-foreground">
                  <ReactMarkdown>{messageText(m)}</ReactMarkdown>
                </div>
              )}
            </div>
            {m.role === "user" && (
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </span>
            )}
          </div>
        ))}

        {busy && (
          <p className="font-mono text-xs text-neon-amber animate-pulse-glow">
            consultando vetores e gerando resposta…
          </p>
        )}
        {error && (
          <p className="font-mono text-xs text-neon-rose">
            Erro: {error.message || "falha ao gerar resposta."}
          </p>
        )}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte ou peça uma transformação nos dados…"
          className="input-neon flex-1"
          aria-label="Mensagem para o chat"
        />
        <button type="submit" disabled={busy || !input.trim()} className="btn-neon">
          <SendHorizonal className="h-4 w-4" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>
    </div>
  );
}
