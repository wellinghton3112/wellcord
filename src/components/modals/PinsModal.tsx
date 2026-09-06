"use client";
import { Pin, X } from "lucide-react";
import type { PinnedItem } from "@/hooks/usePins";

type Props = {
  channelName?: string;
  pins: PinnedItem[];
  onJump: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
  canManage: boolean;
  onClose: () => void;
};

// Lista de fixados do canal. Novo (feature pins).
export default function PinsModal({ channelName, pins, onJump, onUnpin, canManage, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#313338] rounded-lg w-full max-w-md p-6 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold flex items-center gap-2"><Pin className="w-5 h-5" /> Fixados em #{channelName}</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#404249] rounded"><X className="w-5 h-5 text-zinc-400" /></button>
        </div>
        <p className="text-sm text-zinc-400 mb-4">{pins.length} mensagem(ns) fixada(s)</p>
        <div className="flex-1 overflow-y-auto space-y-2">
          {pins.map((p) => (
            <div key={p.message_id} className="bg-[#2B2D31] rounded-lg p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-zinc-200 truncate">{p.username}</span>
                <span className="text-[11px] text-zinc-500">{new Date(p.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <p className="text-sm text-zinc-300 break-words mt-1">{p.content || "(anexo)"}</p>
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => { onJump(p.message_id); }} className="text-xs text-[#5865F2] hover:underline">Ir para mensagem</button>
                {canManage && (
                  <button onClick={() => onUnpin(p.message_id)} className="text-xs text-zinc-500 hover:text-red-400 hover:underline">Desafixar</button>
                )}
              </div>
            </div>
          ))}
          {pins.length === 0 && <p className="text-sm text-zinc-500">Nada fixado. Passe o mouse numa mensagem e clique no 📌.</p>}
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-6 py-2 bg-[#404249] hover:bg-[#4A4D53] rounded text-sm font-medium text-white">Fechar</button>
        </div>
      </div>
    </div>
  );
}
