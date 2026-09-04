"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

type Props = {
  serverName?: string;
  code: string;
  creating: boolean;
  onClose: () => void;
};

// Modal de convite: link para entrar no servidor. Novo (feature membership).
export default function InviteModal({ serverName, code, creating, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" && code ? `${window.location.origin}/join/${code}` : "";

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#313338] rounded-lg w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold mb-1">Convidar para {serverName || "o servidor"}</h2>
        <p className="text-sm text-zinc-400 mb-4">Quem abrir o link entra no servidor. Só membros veem os canais.</p>
        {creating || !code ? (
          <p className="text-sm text-zinc-400">Gerando convite...</p>
        ) : (
          <div className="flex items-center gap-2">
            <input value={link} readOnly className="flex-1 bg-[#2B2D31] border border-[#1E1F22] rounded px-3 py-2 text-white text-sm outline-none min-w-0" />
            <button onClick={copy} className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] rounded text-sm font-medium text-white flex items-center gap-2 shrink-0">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-6 py-2 bg-[#404249] hover:bg-[#4A4D53] rounded text-sm font-medium text-white">Fechar</button>
        </div>
      </div>
    </div>
  );
}
