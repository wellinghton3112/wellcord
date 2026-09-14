"use client";
import { Pin } from "lucide-react";
import type { PinnedItem } from "@/hooks/usePins";
import { ModalShell } from "@/components/ModalShell";

type Props = {
  channelName?: string;
  pins: PinnedItem[];
  onJump: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
  canManage: boolean;
  onClose: () => void;
};

export default function PinsModal({ channelName, pins, onJump, onUnpin, canManage, onClose }: Props) {
  const sorted = [...pins].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-lg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-lg font-bold flex items-center gap-2"><Pin className="w-5 h-5 text-[#F0B132]" /> Fixados em #{channelName}</h2>
        <span className="text-xs text-zinc-400 bg-surface px-2 py-1 rounded-full">{pins.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[50vh] p-4 space-y-2">
        {sorted.map((p) => (
          <div key={p.message_id} className="bg-surface rounded-xl p-3 hover:bg-surface-hover transition-colors group">
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
                {(p.username || "?")[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-zinc-200">{p.username}</span>
                <span className="text-[10px] text-zinc-400 ml-2">
                  {new Date(p.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
            <p className="text-sm text-zinc-300 break-words pl-11 line-clamp-3">{p.content || "(anexo)"}</p>
            <div className="flex justify-end gap-2 mt-2 pl-11">
              <button onClick={() => onJump(p.message_id)} className="text-xs text-accent hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                Ir para mensagem
              </button>
              {canManage && (
                <button onClick={() => onUnpin(p.message_id)} className="text-xs text-zinc-400 hover:text-red-400 hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                  Desafixar
                </button>
              )}
            </div>
          </div>
        ))}
        {pins.length === 0 && (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#41434A] flex items-center justify-center mx-auto mb-3">
              <Pin className="w-7 h-7 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-400 font-medium">Nada fixado</p>
            <p className="text-xs text-zinc-600 mt-1">Passe o mouse numa mensagem e clique no 📌</p>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
