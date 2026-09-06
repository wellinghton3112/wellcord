"use client";
import { useState } from "react";
import { Copy, Check, X, UserX, Link2, Clock, Hash } from "lucide-react";
import Avatar from "@/components/Avatar";
import type { ServerMember, ServerInvite } from "@/hooks/useServerManager";

type Props = {
  serverName?: string;
  isOwner: boolean;
  userId?: string;
  members: ServerMember[];
  invites: ServerInvite[];
  onKick: (m: ServerMember) => void;
  onRevoke: (code: string) => void;
  onCreateInvite: (maxUses: number | null, expiresHours: number | null) => Promise<string | null>;
  onClose: () => void;
};

// Gestão do servidor: membros, kick e convites. Novo (feature membros).
export default function MembersModal({ serverName, isOwner, userId, members, invites, onKick, onRevoke, onCreateInvite, onClose }: Props) {
  const [maxUses, setMaxUses] = useState("0");
  const [expires, setExpires] = useState("0");
  const [creating, setCreating] = useState(false);
  const [lastLink, setLastLink] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const linkFor = (code: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/join/${code}` : code;

  const copy = async (code: string) => {
    const link = linkFor(code);
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
    setCopied(code);
    setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000);
  };

  const create = async () => {
    setCreating(true);
    const code = await onCreateInvite(
      maxUses === "0" ? null : Number(maxUses),
      expires === "0" ? null : Number(expires)
    );
    setCreating(false);
    if (code) setLastLink(linkFor(code));
  };

  const fmtExpiry = (iso: string | null) =>
    !iso ? "nunca" : new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#313338] rounded-lg w-full max-w-md p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold">Membros de {serverName || "servidor"}</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#404249] rounded"><X className="w-5 h-5 text-zinc-400" /></button>
        </div>
        <p className="text-sm text-zinc-400 mb-4">{members.length} no servidor</p>

        <div className="space-y-1 mb-5">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-[#35373C] group">
              <Avatar src={m.avatar} name={m.username} className="w-8 h-8 rounded-full bg-[#41434A] text-sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate text-zinc-200">
                  {m.username}
                  {m.user_id === userId && <span className="text-zinc-500"> (você)</span>}
                </div>
                <div className="text-xs text-zinc-500">{m.role === "owner" ? "👑 Dono" : "Membro"}</div>
              </div>
              {isOwner && m.user_id !== userId && (
                <button onClick={() => onKick(m)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-[#DA373C] rounded" title={`Remover ${m.username}`}>
                  <UserX className="w-4 h-4 text-zinc-400 hover:text-white" />
                </button>
              )}
            </div>
          ))}
          {members.length === 0 && <p className="text-xs text-zinc-500">Nenhum membro visível.</p>}
        </div>

        <h3 className="text-sm font-bold text-zinc-200 mb-2 flex items-center gap-2"><Link2 className="w-4 h-4" /> Convites</h3>
        <div className="flex gap-2 mb-3">
          <label className="flex-1 text-xs text-zinc-400">
            Usos
            <select value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className="w-full mt-1 bg-[#2B2D31] border border-[#1E1F22] rounded px-2 py-1.5 text-white text-sm outline-none">
              <option value="0">Ilimitado</option>
              <option value="1">1 uso</option>
              <option value="5">5 usos</option>
              <option value="25">25 usos</option>
            </select>
          </label>
          <label className="flex-1 text-xs text-zinc-400">
            Expira em
            <select value={expires} onChange={(e) => setExpires(e.target.value)} className="w-full mt-1 bg-[#2B2D31] border border-[#1E1F22] rounded px-2 py-1.5 text-white text-sm outline-none">
              <option value="0">Nunca</option>
              <option value="1">1 hora</option>
              <option value="24">24 horas</option>
              <option value="168">7 dias</option>
            </select>
          </label>
          <button onClick={create} disabled={creating} className="self-end px-4 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 rounded text-sm font-medium text-white shrink-0">
            {creating ? "..." : "Criar"}
          </button>
        </div>
        {lastLink && (
          <div className="flex items-center gap-2 mb-3">
            <input value={lastLink} readOnly className="flex-1 bg-[#2B2D31] border border-[#5865F2] rounded px-2 py-1.5 text-white text-xs outline-none min-w-0" />
            <button onClick={() => copy(lastLink.split("/join/")[1] || "")} className="px-3 py-1.5 bg-[#404249] hover:bg-[#4A4D53] rounded text-xs text-white shrink-0">Copiar</button>
          </div>
        )}
        <div className="space-y-1">
          {invites.map((inv) => (
            <div key={inv.code} className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#2B2D31] text-xs">
              <Hash className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="font-mono text-zinc-200 truncate">{inv.code}</span>
              <span className="text-zinc-500 shrink-0">{inv.uses}{inv.max_uses ? `/${inv.max_uses}` : ""} usos</span>
              <span className="text-zinc-500 flex items-center gap-1 shrink-0"><Clock className="w-3 h-3" />{fmtExpiry(inv.expires_at)}</span>
              <button onClick={() => copy(inv.code)} className="ml-auto p-1 hover:bg-[#404249] rounded shrink-0" title="Copiar link">
                {copied === inv.code ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              </button>
              <button onClick={() => onRevoke(inv.code)} className="p-1 hover:bg-[#DA373C] rounded shrink-0" title="Revogar">
                <X className="w-3.5 h-3.5 text-zinc-400 hover:text-white" />
              </button>
            </div>
          ))}
          {invites.length === 0 && <p className="text-xs text-zinc-600">Nenhum convite ativo.</p>}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-6 py-2 bg-[#404249] hover:bg-[#4A4D53] rounded text-sm font-medium text-white">Fechar</button>
        </div>
      </div>
    </div>
  );
}
