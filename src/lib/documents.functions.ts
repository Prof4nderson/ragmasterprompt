import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TableSchema = z.object({
  name: z.string(),
  columns: z.array(z.string()),
  rows: z.array(z.record(z.string(), z.unknown())),
});

const IngestSchema = z.object({
  name: z.string().min(1),
  fileType: z.string(),
  sizeBytes: z.number(),
  text: z.string(),
  tables: z.array(TableSchema),
});

export const ingestDocumentFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => IngestSchema.parse(data))
  .handler(async ({ data }) => {
    const { ingestDocument } = await import("./ingest.server");
    return ingestDocument(data);
  });

export const listDocumentsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listDocuments } = await import("./documents.server");
  return listDocuments();
});

export const getDocumentFn = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { getDocument } = await import("./documents.server");
    return getDocument(data.id);
  });

export const deleteDocumentFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { deleteDocument } = await import("./documents.server");
    return deleteDocument(data.id);
  });

export const updateChunkFn = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({ id: z.string(), content: z.string().min(1), kind: z.string().optional() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { updateChunk } = await import("./documents.server");
    return updateChunk(data.id, data.content, data.kind);
  });