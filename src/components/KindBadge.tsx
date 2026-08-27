const LABELS: Record<string, string> = {
  text: "Texto",
  table: "Tabela",
  entity: "Entidade",
  key: "Chave",
  relation: "Relação",
};

export function KindBadge({ kind }: { kind: string }) {
  const cls = ["text", "table", "entity", "key", "relation"].includes(kind) ? kind : "text";
  return <span className={`kind-badge kind-${cls}`}>{LABELS[kind] ?? kind}</span>;
}
