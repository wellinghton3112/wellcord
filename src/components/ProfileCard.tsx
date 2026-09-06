"use client";
import { useState } from "react";
import { Copy, Check, Pencil, MessageCircle, X, Hash } from "lucide-react";
import Avatar from "@/components/Avatar";
import { statusConfig } from "@/lib/chat-types";

export type CardProfile = {
  id: string;
  username: string;
  avatar: string;
  color?: string;
  bio?: string;
  status_text?: string;
  created_at?: string;
};

type Props = {
  profile: CardProfile;
  status: string;
  isSelf: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSendDM: () => void;
};

// Card de perfil estilo Discord: banner, avatar + status, recado, bio e ações.
export default function ProfileCard({ profile, status, isSelf, onClose, onEdit, onSendDM }: Props) {
  const [copied, setCopied] = useState(false);
  const color = profile.color || "#5865F2";
  const statusColor = (statusConfig as any)[status]?.color || "bg-zinc-500";
  const statusLabel = (statusConfig as any)[status]?.label || "Offline";
  const shortId = profile.id.slice(0, 8);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(profile.id);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = profile.id;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4" onClick={onClose}>
      <div
        className="w-full max-w-[340px] rounded-2xl overflow-hidden shadow-2xl border border-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner */}
        <div className="h-28 relative" style={{ background: `linear-gradient(135deg, ${color}, #1E1F22 130%)` }}>
          <button onClick={onClose} className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/60 rounded-full" title="Fechar">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        {/* Avatar + recado */}
        <div className="bg-[#232428] px-4 pb-4">
          <div className="flex items-end gap-3 -mt-10 mb-2">
            <div className="relative shrink-0">
              <Avatar src={profile.avatar} name={profile.username} className="w-20 h-20 rounded-full border-[6px] border-[#232428] bg-[#5865F2] text-3xl" />
              <span className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-[#232428] ${statusColor}`} title={statusLabel} />
            </div>
            {profile.status_text ? (
              <div className="mb-4 bg-[#111214] border border-black/30 rounded-xl px-3 py-1.5 text-xs text-zinc-200 shadow-lg max-w-[190px] truncate">
                {profile.status_text}
              </div>
            ) : null}
          </div>
          <div className="bg-[#111214] rounded-xl p-3 space-y-3">
            <div>
              <div className="text-xl font-bold text-white leading-tight break-words">{profile.username}</div>
              <div className="text-sm text-zinc-400 flex items-center gap-1">
                {profile.username} <span className="text-zinc-600">•</span> <span className="font-mono text-xs">{shortId}</span>
              </div>
            </div>
            {profile.bio ? (
              <div>
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-1">Sobre mim</div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">{profile.bio}</p>
              </div>
            ) : (
              <p className="text-xs text-zinc-600 italic">Sem bio por enquanto.</p>
            )}
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
              <span>{statusLabel}</span>
              {profile.created_at && (
                <span className="ml-auto text-zinc-500">
                  Membro desde {new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                </span>
              )}
            </div>
            <div className="border-t border-white/10 pt-3 space-y-1">
              {isSelf ? (
                <button onClick={onEdit} className="w-full flex items-center gap-3 px-2 py-2 rounded hover:bg-white/10 text-sm text-zinc-200 text-left">
                  <Pencil className="w-4 h-4 text-zinc-400" /> Editar perfil
                </button>
              ) : (
                <button onClick={onSendDM} className="w-full flex items-center gap-3 px-2 py-2 rounded hover:bg-white/10 text-sm text-zinc-200 text-left">
                  <MessageCircle className="w-4 h-4 text-zinc-400" /> Enviar DM
                </button>
              )}
              <button onClick={copyId} className="w-full flex items-center gap-3 px-2 py-2 rounded hover:bg-white/10 text-sm text-zinc-200 text-left">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Hash className="w-4 h-4 text-zinc-400" />}
                {copied ? "ID copiado!" : "Copiar ID do usuário"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
