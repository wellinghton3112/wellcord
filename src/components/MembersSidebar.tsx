"use client";
import type { PresenceUser } from "@/lib/chat-types";
import { statusConfig } from "@/lib/chat-types";
import { APP_VERSION } from "@/lib/version";

type Props = {
  showMobileMembers: boolean;
  onlineMembers: PresenceUser[];
  allProfiles: PresenceUser[];
  status: keyof typeof statusConfig;
};

// Coluna de membros online/offline. Extraído de page.tsx sem mudança visual.
export default function MembersSidebar({ showMobileMembers, onlineMembers, allProfiles, status }: Props) {
  const offline = allProfiles.filter((p) => !onlineMembers.some((o) => o.id === p.id));
  return (
    <div className={`${showMobileMembers ? "fixed inset-y-0 right-0 translate-x-0" : "hidden"} lg:translate-x-0 lg:relative lg:flex z-50 w-60 bg-[#2B2D31] flex-col shrink-0 overflow-y-auto h-full transition-transform duration-200`}>
      <div className="p-3 space-y-4">
        <h3 className="text-xs font-semibold text-zinc-400 tracking-wide px-2">ONLINE — {onlineMembers.length}</h3>
        {onlineMembers.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-2 py-1 rounded hover:bg-[#35373C] cursor-pointer group">
            <div className="relative"><div className="w-8 h-8 rounded-full bg-[#41434A] flex items-center justify-center text-sm">{m.avatar}</div><div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2B2D31] ${statusConfig[m.status as keyof typeof statusConfig]?.color || "bg-[#23A559]"}`} /></div>
            <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate text-zinc-300 group-hover:text-white">{m.username}</div><div className="text-xs text-zinc-500 truncate">{statusConfig[m.status as keyof typeof statusConfig]?.label || m.status}</div></div>
          </div>
        ))}
        {onlineMembers.length === 0 && <p className="text-xs text-zinc-500 px-2">Ninguém online além de você. Convide amigos!</p>}
        <div className="border-t border-[#3F4147] pt-3 space-y-1">
          <h3 className="text-xs font-semibold text-zinc-400 tracking-wide px-2">OFFLINE — {offline.length}</h3>
          {offline.slice(0, 20).map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-2 py-1 rounded opacity-60 hover:opacity-100 hover:bg-[#35373C] cursor-pointer group">
              <div className="relative"><div className="w-8 h-8 rounded-full bg-[#41434A] flex items-center justify-center text-sm grayscale">{m.avatar}</div><div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2B2D31] bg-zinc-500" /></div>
              <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate text-zinc-500 group-hover:text-zinc-300">{m.username}</div><div className="text-xs text-zinc-600">Offline</div></div>
            </div>
          ))}
          {offline.length === 0 && <p className="text-xs text-zinc-600 px-2">Nenhum offline</p>}
        </div>
        <div className="bg-[#232428] rounded-lg p-3 mt-4">
          <h4 className="font-bold text-sm mb-1">✅ Presença Ativa</h4>
          <p className="text-xs text-zinc-400">Seu status: {statusConfig[status].label}</p>
          <p className="text-xs text-[#23A559] mt-1">● {onlineMembers.length} online agora</p>
          <p className="text-[10px] text-zinc-500 mt-2 font-mono">{APP_VERSION}</p>
        </div>
      </div>
    </div>
  );
}
