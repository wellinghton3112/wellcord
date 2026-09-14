"use client";
import { Upload } from "lucide-react";

export function DropOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-accent/15 backdrop-blur-sm border-2 border-dashed border-accent rounded-lg pointer-events-none">
      <div className="flex flex-col items-center gap-3 text-accent">
        <Upload className="w-12 h-12 animate-bounce" />
        <span className="text-lg font-bold">Solte o arquivo aqui</span>
        <span className="text-sm text-zinc-400">Imagens, áudios e documentos</span>
      </div>
    </div>
  );
}
