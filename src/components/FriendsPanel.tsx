"use client";
import { useState } from "react";
import { Search, UserPlus, MessageCircle, Check, X, UserX } from "lucide-react";
import Avatar from "@/components/Avatar";
import { statusConfig } from "@/lib/chat-types";
import type { Friend, FriendRequest } from "@/hooks/useFriends";
import type { PresenceUser } from "@/lib/chat-types";

type Props = {
  friends: Friend[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  onlineMembers: PresenceUser[];
  sending: boolean;
  onAdd: (username: string) => Promise<boolean>;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string, username: string) => void;
  onDM: (id: string) => void;
  onViewProfile: (id: string) => void;
};

type Tab = "online" | "all" | "pending";

// Aba de amigos: abas, busca, adicionar e linhas com ações. Novo (feature amigos).
export default function FriendsPanel(props: Props) {
  const { friends, incoming, outgoing, onlineMembers, sending, onAdd, onAccept, onReject, onCancel, onRemove, onDM, onViewProfile } = props;
  const [tab, setTab] = useState<Tab>("online");
  const [search, setSearch] = useState("");
  const [newFriend, setNewFriend] = useState("");

  const onlineIds = new Set(onlineMembers.map((m) => m.id));
  const statusOf = (id: string) => onlineMembers.find((m) => m.id === id)?.status || "offline";
  const q = search.trim().toLowerCase();
  const shown = friends.filter((f) => {
    if (tab === "online" && !onlineIds.has(f.user_id)) return false;
    if (q && !f.username.toLowerCase().includes(q)) return false;
    return true;
  });

  const add = async () => {
    if (!newFriend.trim()) return;
    const ok = await onAdd(newFriend);
    if (ok) setNewFriend("");
  };

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "online", label: "Disponível" },
    { id: "all", label: "Todos" },
    { id: "pending", label: "Pendente", badge: incoming.length },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#313338] min-w-0">
      <div className="h-12 flex items-center px-4 gap-2 border-b border-[#1F2124] shadow-sm shrink-0 overflow-x-auto">
        <span className="font-bold hidden sm:block">Amigos</span>
        <span className="w-px h-6 bg-[#3F4147] mx-1 hidden sm:block" />
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-2.5 py-1 rounded text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? "bg-[#404249] text-white" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            {t.label}
            {t.badge ? <span className="ml-1.5 min-w-4 h-4 px-1 rounded-full bg-[#DA373C] text-white text-[10px] font-bold inline-flex items-center justify-center">{t.badge}</span> : null}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <input
            value={newFriend}
            onChange={(e) => setNewFriend(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Adicionar pelo username"
            className="bg-[#2B2D31] rounded pl-3 pr-2 py-1.5 text-sm w-44 focus:outline-none focus:ring-1 focus:ring-[#5865F2] placeholder:text-zinc-500 text-zinc-200"
          />
          <button onClick={add} disabled={sending || !newFriend.trim()} className="px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 rounded text-sm font-medium text-white flex items-center gap-1.5 shrink-0">
            <UserPlus className="w-4 h-4" /> {sending ? "..." : "Adicionar"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="relative mb-3 max-w-md">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar" className="w-full bg-[#2B2D31] rounded pl-8 pr-2 py-1.5 text-sm focus:outline-none placeholder:text-zinc-500 text-zinc-200" />
        </div>

        {tab === "pending" ? (
          <>
            {incoming.length === 0 && outgoing.length === 0 && (
              <p className="text-sm text-zinc-500 mt-6 text-center">Nenhum pedido pendente.</p>
            )}
            {incoming.map((r) => (
              <div key={r.from_user} className="flex items-center gap-3 px-2 py-2 hover:bg-[#2E3035] rounded group">
                <button onClick={() => onViewProfile(r.from_user)} title="Ver perfil"><Avatar src={r.avatar} name={r.username} className="w-10 h-10 rounded-full bg-[#41434A] text-base" /></button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-white truncate">{r.username}</div>
                  <div className="text-xs text-zinc-500">Quer ser teu amigo</div>
                </div>
                <button onClick={() => onAccept(r.from_user)} className="w-9 h-9 rounded-full bg-[#23A559] hover:bg-[#1A7F44] flex items-center justify-center" title="Aceitar"><Check className="w-4 h-4 text-white" /></button>
                <button onClick={() => onReject(r.from_user)} className="w-9 h-9 rounded-full bg-[#35373C] hover:bg-[#DA373C] flex items-center justify-center" title="Recusar"><X className="w-4 h-4 text-zinc-300" /></button>
              </div>
            ))}
            {outgoing.map((r) => (
              <div key={r.to_user} className="flex items-center gap-3 px-2 py-2 hover:bg-[#2E3035] rounded">
                <Avatar src={r.avatar} name={r.username} className="w-10 h-10 rounded-full bg-[#41434A] text-base" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-zinc-300 truncate">{r.username}</div>
                  <div className="text-xs text-zinc-500">Pedido enviado</div>
                </div>
                <button onClick={() => onCancel(r.to_user)} className="text-xs text-zinc-500 hover:text-red-400 hover:underline">Cancelar</button>
              </div>
            ))}
          </>
        ) : (
          <>
            <h3 className="text-xs font-semibold text-zinc-400 tracking-wide px-2 mb-1">
              {tab === "online" ? `DISPONÍVEL — ${shown.length}` : `TODOS — ${shown.length}`}
            </h3>
            {shown.length === 0 && (
              <p className="text-sm text-zinc-500 mt-6 text-center">
                {tab === "online" ? "Ninguém online. Chama os amigos!" : "Sem amigos ainda. Adiciona pelo username ali em cima."}
              </p>
            )}
            {shown.map((f) => {
              const st = statusOf(f.user_id);
              return (
                <div key={f.user_id} className="flex items-center gap-3 px-2 py-1.5 hover:bg-[#2E3035] rounded group">
                  <button onClick={() => onViewProfile(f.user_id)} className="relative shrink-0" title="Ver perfil">
                    <Avatar src={f.avatar} name={f.username} className="w-10 h-10 rounded-full bg-[#41434A] text-base" />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#313338] ${(statusConfig as any)[st]?.color || "bg-zinc-500"}`} />
                  </button>
                  <button onClick={() => onViewProfile(f.user_id)} className="flex-1 min-w-0 text-left">
                    <div className="font-medium text-sm text-zinc-200 truncate">{f.username}</div>
                    <div className="text-xs text-zinc-500 truncate">{(statusConfig as any)[st]?.label || "Offline"}</div>
                  </button>
                  <button onClick={() => onDM(f.user_id)} className="w-9 h-9 rounded-full bg-[#35373C] hover:bg-[#5865F2] hidden group-hover:flex items-center justify-center" title="Conversar">
                    <MessageCircle className="w-4 h-4 text-zinc-300" />
                  </button>
                  <button onClick={() => onRemove(f.user_id, f.username)} className="w-9 h-9 rounded-full hover:bg-[#DA373C] hidden group-hover:flex items-center justify-center" title="Remover amigo">
                    <UserX className="w-4 h-4 text-zinc-400 hover:text-white" />
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
