"use client";
import { Hash, Volume2, Settings, Plus, Search, Trash2, X, LogOut } from "lucide-react";
import type { Server, Channel, DMConversation, PresenceUser } from "@/lib/chat-types";
import { statusConfig } from "@/lib/chat-types";
import { APP_VERSION } from "@/lib/version";
import VoicePreview from "@/components/VoicePreview";

type Props = {
  showMobileSidebar: boolean;
  setShowMobileSidebar: (v: boolean) => void;
  viewMode: "server" | "dm";
  // DM
  dmConversations: DMConversation[];
  selectedDM: string | null;
  setSelectedDM: (id: string) => void;
  onlineMembers: PresenceUser[];
  setNewDMUsername: (v: string) => void;
  setShowNewDMModal: (v: boolean) => void;
  // Servidor
  currentServer?: Server;
  userId?: string;
  selectedChannel: string;
  setSelectedChannel: (id: string) => void;
  connected: boolean;
  openEditServer: (s: Server) => void;
  deleteServer: () => void;
  createChannel: () => void;
  deleteChannel: (id: string, name: string) => void;
  // Painel usuário
  username: string;
  status: keyof typeof statusConfig;
  setStatus: (s: "online" | "idle" | "dnd" | "invisible") => void;
  showStatusMenu: boolean;
  setShowStatusMenu: (v: boolean) => void;
  setShowUsernameModal: (v: boolean) => void;
  onSignOut: () => void;
};

// Coluna de canais/DMs + painel do usuário. Extraído de page.tsx sem mudança visual.
export default function ChannelSidebar(props: Props) {
  const {
    showMobileSidebar, setShowMobileSidebar, viewMode,
    dmConversations, selectedDM, setSelectedDM, onlineMembers, setNewDMUsername, setShowNewDMModal,
    currentServer, selectedChannel, setSelectedChannel, connected, openEditServer, deleteServer, createChannel, deleteChannel,
    username, status, setStatus, showStatusMenu, setShowStatusMenu, setShowUsernameModal, onSignOut, userId,
  } = props;

  // Dono do servidor (ou legado sem dono) pode gerenciar; demais só usam
  const canManage = !currentServer?.owner_id || currentServer.owner_id === userId;

  const channelRow = (ch: Channel, icon: React.ReactNode) => (
    <div key={ch.id} className={`group flex items-center gap-1 px-2 py-1 rounded mt-0.5 ${selectedChannel === ch.id ? "bg-[#404249] text-white" : "text-zinc-400 hover:bg-[#35373C] hover:text-zinc-200"}`}>
      <button onClick={() => setSelectedChannel(ch.id)} className="flex-1 flex items-center gap-2 text-[15px] font-medium overflow-hidden">
        {icon}<span className="truncate">{ch.name}</span>
      </button>
      {canManage && <button onClick={() => deleteChannel(ch.id, ch.name)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#2B2D31] rounded" title="Excluir canal"><X className="w-3 h-3 hover:text-red-400" /></button>}
    </div>
  );

  return (
    <div className={`${showMobileSidebar ? "translate-x-0 left-[72px]" : "-translate-x-full left-0"} lg:translate-x-0 lg:inset-y-auto lg:left-0 fixed inset-y-0 lg:relative z-50 lg:z-auto w-60 bg-[#2B2D31] flex lg:flex flex-col shrink-0 h-full transition-transform duration-200`}>
      {viewMode === "dm" ? (
        <>
          <div className="h-12 px-4 flex items-center justify-between border-b border-[#1F2124] shadow-sm shrink-0">
            <span className="font-bold text-[15px]">Mensagens Diretas</span>
            <button onClick={() => setShowNewDMModal(true)} className="w-7 h-7 rounded bg-[#5865F2] hover:bg-[#4752C4] flex items-center justify-center" title="Nova DM"><Plus className="w-4 h-4 text-white" /></button>
          </div>
          <div className="p-2">
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input placeholder="Buscar DM" className="w-full bg-[#1E1F22] rounded pl-7 pr-2 py-1.5 text-sm focus:outline-none placeholder:text-zinc-500" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {dmConversations.length === 0 ? (
              <p className="text-xs text-zinc-500 px-2">Nenhuma DM ainda. Clique + para iniciar.</p>
            ) : dmConversations.map((dm) => (
              <button key={dm.id} onClick={() => setSelectedDM(dm.id)} className={`w-full flex items-center gap-3 px-2 py-2 rounded text-left ${selectedDM === dm.id ? "bg-[#404249] text-white" : "text-zinc-400 hover:bg-[#35373C] hover:text-zinc-200"}`}>
                <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-sm shrink-0">{dm.otherUser?.avatar || "👤"}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{dm.otherUser?.username || "Desconhecido"}</div>
                  <div className="text-xs text-zinc-500 truncate">Clique para conversar</div>
                </div>
                <div className={`w-2 h-2 rounded-full ${onlineMembers.some((m) => m.id === dm.otherUser?.id) ? "bg-[#23A559]" : "bg-zinc-600"}`} />
              </button>
            ))}
            <div className="mt-4 p-2 bg-[#232428] rounded">
              <p className="text-xs font-bold text-zinc-300">Amigos Online — {onlineMembers.length}</p>
              <div className="mt-2 space-y-1">
                {onlineMembers.slice(0, 5).map((m) => (
                  <button key={m.id} onClick={() => { setNewDMUsername(m.username); setShowNewDMModal(true); }} className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-[#35373C] text-left">
                    <div className="w-6 h-6 rounded-full bg-[#41434A] flex items-center justify-center text-xs">{m.avatar}</div>
                    <span className="text-xs text-zinc-300 truncate">{m.username}</span>
                    <Plus className="w-3 h-3 ml-auto text-zinc-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="h-12 px-4 flex items-center justify-between border-b border-[#1F2124] shadow-sm shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => setShowMobileSidebar(false)} className="lg:hidden p-1 hover:bg-[#404249] rounded mr-1"><X className="w-4 h-4" /></button>
              {currentServer?.image_url ? <img src={currentServer.image_url} alt="" className="w-6 h-6 rounded object-cover shrink-0" /> : <span className="text-sm shrink-0">{currentServer?.icon}</span>}
              <span className="font-bold text-[15px] truncate">{currentServer?.name}</span>
            </div>
              <div className="flex items-center gap-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${connected ? "bg-[#23A559] text-white" : "bg-zinc-600 text-zinc-300"}`}>{connected ? "● AO VIVO" : "offline"}</span>
                {currentServer && canManage && <button onClick={() => openEditServer(currentServer)} className="p-1 hover:bg-[#404249] rounded" title="Editar servidor"><Settings className="w-3.5 h-3.5 text-zinc-400 hover:text-white" /></button>}
                {currentServer && canManage && <button onClick={deleteServer} className="p-1 hover:bg-[#404249] rounded" title="Excluir servidor"><Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400" /></button>}
              </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            <div>
                <div className="flex items-center justify-between px-1 py-1 text-xs font-semibold text-zinc-400 tracking-wide">
                  <span>⌄ CANAIS DE TEXTO</span>
                  {canManage && <Plus onClick={createChannel} className="w-3.5 h-3.5 cursor-pointer hover:text-zinc-200" />}
                </div>
              {currentServer?.channels.filter((c) => c.type === "text").map((ch) => channelRow(ch,
                ch.image_url ? <img src={ch.image_url} alt="" className="w-4 h-4 rounded object-cover shrink-0" /> : ch.icon ? <span className="w-4 h-4 flex items-center justify-center text-sm shrink-0">{ch.icon}</span> : <Hash className="w-4 h-4 shrink-0 text-zinc-500" />
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1 px-1 py-1 text-xs font-semibold text-zinc-400 tracking-wide">⌄ CANAIS DE VOZ</div>
              {currentServer?.channels.filter((c) => c.type === "voice").map((ch) => (
                <div key={ch.id} className="flex flex-col">
                  {channelRow(ch,
                    ch.image_url ? <img src={ch.image_url} alt="" className="w-4 h-4 rounded object-cover shrink-0" /> : ch.icon ? <span className="w-4 h-4 flex items-center justify-center text-sm shrink-0">{ch.icon}</span> : <Volume2 className="w-4 h-4 shrink-0 text-zinc-500" />
                  )}
                  <VoicePreview channelId={ch.id} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      <div className="h-[52px] bg-[#232428] flex items-center px-2 gap-2 shrink-0 relative">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-sm">😎</div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#232428] ${statusConfig[status].color}`} />
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowStatusMenu(!showStatusMenu)}>
          <div className="text-sm font-semibold leading-none truncate flex items-center gap-1">{username} <span className={`w-2 h-2 rounded-full ${statusConfig[status].color}`} /></div>
          <div className="text-xs text-zinc-400 leading-none truncate">{statusConfig[status].label}</div>
        </div>
        <span className="text-[8px] font-mono bg-[#1E1F22] px-1 py-0.5 rounded text-zinc-500 shrink-0">{APP_VERSION}</span>
        <button onClick={() => setShowUsernameModal(true)} className="p-1 hover:bg-[#35373C] rounded shrink-0"><Settings className="w-4 h-4 text-zinc-400" /></button>
        <button onClick={onSignOut} className="p-1 hover:bg-[#DA373C] rounded group shrink-0" title="Sair"><LogOut className="w-4 h-4 text-zinc-400 group-hover:text-white" /></button>
        {showStatusMenu && (
          <div className="absolute bottom-full left-2 mb-2 w-48 bg-[#232428] border border-[#1E1F22] rounded-lg shadow-xl overflow-hidden z-50">
            {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map((k) => (
              <button key={k} onClick={() => { setStatus(k); setShowStatusMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#35373C] ${status === k ? "bg-[#35373C] text-white" : "text-zinc-300"}`}>
                <span className={`w-3 h-3 rounded-full ${statusConfig[k].color}`} /> {statusConfig[k].label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
