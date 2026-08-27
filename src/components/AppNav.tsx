import { Link } from "@tanstack/react-router";
import { Database, MessageSquareText, Sparkles, UploadCloud } from "lucide-react";

const items = [
  { to: "/", label: "Fontes", icon: UploadCloud },
  { to: "/preview", label: "Data Preview", icon: Database },
  { to: "/chat", label: "Chat IA", icon: MessageSquareText },
  { to: "/prompt", label: "Gerar Prompt", icon: Sparkles },
] as const;

export function AppNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <nav className="glass-panel flex flex-wrap items-center justify-between gap-2 px-5 py-3">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/50 bg-primary/10 font-display text-sm font-bold text-primary glow-cyan">
              R
            </span>
            <span className="font-display text-xs font-bold tracking-[0.28em] text-primary glow-cyan sm:text-sm">
              RAGMASTER<span className="text-accent glow-magenta">PROMPT</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-1">
            {items.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="nav-link"
                activeProps={{ className: "nav-link nav-link-active" }}
                activeOptions={{ exact: to === "/" }}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
