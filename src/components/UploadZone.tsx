import React, { useState } from "react";
import { Upload, AlertCircle, Loader2 } from "lucide-react";
import { uploadAndCreateDocumentFn } from "@/lib/documents.functions";
import { useRouter } from "@tanstack/react-router";

interface UploadZoneProps {
  onSuccess?: () => void;
}

export function UploadZone({ onSuccess }: UploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const processFiles = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const fileList = Array.from(files);
      
      for (const currentFile of fileList) {
        if (!currentFile) continue;

        const arrayBuffer = await currentFile.arrayBuffer();
        const arrayBufferArray = Array.from(new Uint8Array(arrayBuffer));

        await uploadAndCreateDocumentFn({
          data: {
            fileName: currentFile.name,
            fileType: currentFile.type,
            arrayBufferArray,
          },
        });
      }

      router.invalidate();

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("Erro capturado no upload:", err);
      setError(err?.message || "Ocorreu um erro ao processar o arquivo.");
    } finally {
      // Garante que o spinner de carregamento sempre para, mesmo se houver erro ou sucesso
      setIsUploading(false);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    processFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  return (
    <div className="w-full">
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`block w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? "border-cyan-500 bg-cyan-950/20"
            : "border-slate-800 hover:border-slate-700 bg-slate-900/50"
        }`}
      >
        <input
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center justify-center space-y-4">
          {isUploading ? (
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          ) : (
            <div className="p-4 rounded-full bg-slate-800/80 text-cyan-400">
              <Upload className="w-8 h-8" />
            </div>
          )}

          <div>
            <p className="text-lg font-medium text-slate-200">
              {isDragActive
                ? "Solte os arquivos aqui..."
                : "SOLTE ARQUIVOS OU CLIQUE PARA ENVIAR"}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              PDF, DOC, TXT, JSON, MD - Extração, chunking e indexação automática
            </p>
          </div>
        </div>
      </label>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}