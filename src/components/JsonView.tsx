export function JsonView({ data }: { data: unknown }) {
  if (data === null || data === undefined) return <span className="json-null">null</span>;
  if (typeof data === "string")
    return <span className="json-string">&quot;{data.length > 120 ? `${data.slice(0, 120)}…` : data}&quot;</span>;
  if (typeof data === "number") return <span className="json-number">{String(data)}</span>;
  if (typeof data === "boolean") return <span className="json-bool">{String(data)}</span>;

  if (Array.isArray(data)) {
    if (!data.length) return <span className="json-null">[ ]</span>;
    return (
      <span>
        <span className="text-muted-foreground">[</span>
        <span className="block">
          {data.map((item, i) => (
            <span key={i} className="block pl-4">
              <JsonView data={item} />
              {i < data.length - 1 ? <span className="text-muted-foreground">,</span> : null}
            </span>
          ))}
        </span>
        <span className="text-muted-foreground">]</span>
      </span>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (!entries.length) return <span className="json-null">{"{ }"}</span>;
    return (
      <span>
        <span className="text-muted-foreground">{"{"}</span>
        <span className="block">
          {entries.map(([key, value], i) => (
            <span key={key} className="block pl-4">
              <span className="json-key">&quot;{key}&quot;</span>
              <span className="text-muted-foreground">: </span>
              <JsonView data={value} />
              {i < entries.length - 1 ? <span className="text-muted-foreground">,</span> : null}
            </span>
          ))}
        </span>
        <span className="text-muted-foreground">{"}"}</span>
      </span>
    );
  }

  return <span className="json-string">{String(data)}</span>;
}
