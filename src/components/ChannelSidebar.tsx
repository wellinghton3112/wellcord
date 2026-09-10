"use client";
import { useEffect, useState } from "react";
import { Hash, Volume2, Settings, Plus, Search, Trash2, X, LogOut, Users, DoorOpen, MessageCircle, Check, UserX, UserPlus, Shield } from "lucide-react";
import type { Server, Channel, DMConversation, PresenceUser } from "@/lib/chat-types";
import { statusConfig } from "@/lib/chat-types";
import { APP_VERSION } from "@/lib/version";
import VoicePreview from "@/components/VoicePreview";
import Avatar from "@/components/Avatar";
import { useVoice } from "@/context/VoiceContext";
import { loadPtt, savePtt, eventToAccelerator, type PttConfig } from "@/lib/ptt";
import type { Friend, FriendRequest } from "@/hooks/useFriends";
import type { ActiveVoice } from "@/hooks/useActiveNow";

type Props = {
  showMobileSidebar: boolean;
  setShowMobileSidebar: (v: boolean) => void;
  viewMode: "server" | "dm";
  // DM
  dmConversations: DMConversation[];
  selectedDM: string | null;
  setSelectedDM: (id: string) => void;
  unreadDMs?: Record<string, number>;
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
  userAvatar?: string | null;
  status: keyof typeof statusConfig;
  setStatus: (s: "online" | "idle" | "dnd" | "invisible") => void;
  showStatusMenu: boolean;
  setShowStatusMenu: (v: boolean) => void;
  setShowUsernameModal: (v: boolean) => void;
  onSignOut: () => void;
  onViewProfile: (id: string) => void;
  onOpenMembers: () => void;
  onOpenRoles: () => void;
  onLeaveServer: () => void;
  channelUnread?: Record<string, number>;
  setViewModeDM: () => void;
  // Amigos (aba dentro das DMs)
  friendsList: Friend[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  sendingFriend: boolean;
  onAddFriend: (username: string) => Promise<boolean>;
  onAcceptFriend: (id: string) => void;
  onRejectFriend: (id: string) => void;
  onCancelFriend: (id: string) => void;
  onRemoveFriend: (id: string, username: string) => void;
  onFriendDM: (id: string) => void;
  activeVoice: ActiveVoice[];
  onJoinVoice: (serverId: string, channelId: string) => void;
};

// Coluna de canais/DMs + painel do usuário. Extraído de page.tsx sem mudança visual.
export default function ChannelSidebar(props: Props) {
  const {
    showMobileSidebar, setShowMobileSidebar, viewMode,
    dmConversations, selectedDM, setSelectedDM, unreadDMs, onlineMembers, setNewDMUsername, setShowNewDMModal,
    currentServer, selectedChannel, setSelectedChannel, connected, openEditServer, deleteServer, createChannel, deleteChannel,
    username, status, setStatus, showStatusMenu, setShowStatusMenu, setShowUsernameModal, onSignOut, userId, userAvatar, onViewProfile, onOpenMembers, onOpenRoles, onLeaveServer, channelUnread, setViewModeDM,
    friendsList, incomingRequests, outgoingRequests, sendingFriend, onAddFriend, onAcceptFriend, onRejectFriend, onCancelFriend, onRemoveFriend, onFriendDM,
    activeVoice, onJoinVoice,
  } = props;

  const [sideTab, setSideTab] = useState<"dms" | "friends">("dms");
  const [dmSearch, setDmSearch] = useState("");
  const { status: voiceStatus, controlsRef: voiceControls } = useVoice();

  const filteredDMs = dmConversations.filter((dm) => {
    const name = dm.otherUser?.username;
    if (!name) return true;
    return name.toLowerCase().includes(dmSearch.toLowerCase());
  });

  // Tray do app desktop: badge de não-lidas + estado de voz
  const dmTotal = Object.values(unreadDMs || {}).reduce((a, b) => a + b, 0);
  const chTotal = Object.values(channelUnread || {}).reduce((a, b) => a + b, 0);
  useEffect(() => {
    window.wellcord?.tray.update({ unread: dmTotal + chTotal, inVoice: voiceStatus.joined, muted: voiceStatus.muted });
  }, [dmTotal, chTotal, voiceStatus.joined, voiceStatus.muted]);

  // Push-to-talk (só no .exe): liga/desliga + captura da tecla
  const [ptt, setPtt] = useState<PttConfig | null>(null);
  const [capturingPtt, setCapturingPtt] = useState(false);
  useEffect(() => {
    if (!window.wellcord?.ptt) return;
    const cfg = loadPtt();
    setPtt(cfg);
    if (cfg.enabled && cfg.accelerator) window.wellcord.ptt.set(cfg.accelerator);
  }, []);
  const isDesktop = typeof window !== "undefined" && !!window.wellcord?.ptt;

  const applyPtt = (cfg: PttConfig) => {
    setPtt(cfg);
    savePtt(cfg);
    if (cfg.enabled && cfg.accelerator) window.wellcord?.ptt.set(cfg.accelerator);
    else window.wellcord?.ptt.set(null);
  };

  useEffect(() => {
    if (!capturingPtt) return;
    const h = (e: KeyboardEvent) => {
      e.preventDefault();
      const acc = eventToAccelerator(e);
      if (acc && ptt) applyPtt({ ...ptt, accelerator: acc });
      setCapturingPtt(false);
    };
    window.addEventListener("keydown", h, { once: false });
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturingPtt]);
  const [friendQuery, setFriendQuery] = useState("");
  const [newFriendName, setNewFriendName] = useState("");
  const onlineIds = new Set(onlineMembers.map((m) => m.id));
  const fq = friendQuery.trim().toLowerCase();
  const shownFriends = friendsList.filter((f) => !fq || f.username.toLowerCase().includes(fq));

  const addFriend = async () => {
    if (!newFriendName.trim()) return;
    const ok = await onAddFriend(newFriendName);
    if (ok) setNewFriendName("");
  };

  // Dono do servidor (ou legado sem dono) pode gerenciar; demais só usam
  const canManage = !currentServer?.owner_id || currentServer.owner_id === userId;

  const channelRow = (ch: Channel, icon: React.ReactNode) => (
    <div key={ch.id} className={`group flex items-center gap-1 px-2 py-1 rounded mt-0.5 ${selectedChannel === ch.id ? "bg-[#404249] text-white" : "text-zinc-400 hover:bg-[#35373C] hover:text-zinc-200"}`}>
      <button onClick={() => setSelectedChannel(ch.id)} className="flex-1 flex items-center gap-2 text-[15px] font-medium overflow-hidden">
        {icon}<span className={`truncate ${selectedChannel !== ch.id && (channelUnread?.[ch.id] || 0) > 0 ? "font-bold text-white" : ""}`}>{ch.name}</span>
      </button>
      {(channelUnread?.[ch.id] || 0) > 0 && selectedChannel !== ch.id && (
        <span className="min-w-4 h-4 px-1 rounded-full bg-[#DA373C] text-white text-[10px] font-bold flex items-center justify-center shrink-0">{channelUnread![ch.id] > 9 ? "9+" : channelUnread![ch.id]}</span>
      )}
      {canManage && <button onClick={() => deleteChannel(ch.id, ch.name)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#2B2D31] rounded" title="Excluir canal"><X className="w-3 h-3 hover:text-red-400" /></button>}
    </div>
  );

  return (
    <div className={`${showMobileSidebar ? "translate-x-0 left-[72px]" : "-translate-x-full left-0"} lg:translate-x-0 lg:inset-y-auto lg:left-0 fixed inset-y-0 lg:relative z-50 lg:z-auto w-60 bg-[#2B2D31] flex lg:flex flex-col shrink-0 h-full transition-transform duration-200`}>
      {viewMode !== "server" ? (
        <>
          <div className="h-12 px-3 flex items-center gap-1 border-b border-[#1F2124] shadow-sm shrink-0">
            <button onClick={() => setSideTab("dms")} className={`flex-1 py-1.5 rounded text-[13px] font-semibold transition-colors ${sideTab === "dms" ? "bg-[#404249] text-white" : "text-zinc-400 hover:text-zinc-200"}`}>Conversas</button>
            <button onClick={() => setSideTab("friends")} className={`flex-1 py-1.5 rounded text-[13px] font-semibold transition-colors flex items-center justify-center gap-1.5 ${sideTab === "friends" ? "bg-[#404249] text-white" : "text-zinc-400 hover:text-zinc-200"}`}>
              Amigos
              {incomingRequests.length > 0 && <span className="min-w-4 h-4 px-1 rounded-full bg-[#DA373C] text-white text-[10px] font-bold inline-flex items-center justify-center">{incomingRequests.length > 9 ? "9+" : incomingRequests.length}</span>}
            </button>
            <button onClick={() => setShowNewDMModal(true)} className="w-7 h-7 rounded bg-[#5865F2] hover:bg-[#4752C4] flex items-center justify-center shrink-0" title="Nova DM"><Plus className="w-4 h-4 text-white" /></button>
          </div>
          {sideTab === "dms" ? (
          <>
          <div className="p-2">
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input value={dmSearch} onChange={(e) => setDmSearch(e.target.value)} placeholder="Buscar DM" className="w-full bg-[#1E1F22] rounded pl-7 pr-2 py-1.5 text-sm focus:outline-none placeholder:text-zinc-500" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredDMs.length === 0 ? (
              <p className="text-xs text-zinc-500 px-2">{dmSearch ? "Nenhuma DM encontrada." : "Nenhuma DM ainda. Clique + para iniciar."}</p>
            ) : filteredDMs.map((dm) => (
              <button key={dm.id} onClick={() => { setSelectedDM(dm.id); setViewModeDM(); }} className={`w-full flex items-center gap-3 px-2 py-2 rounded text-left ${selectedDM === dm.id ? "bg-[#404249] text-white" : "text-zinc-400 hover:bg-[#35373C] hover:text-zinc-200"}`}>
                <span onClick={(e) => { e.stopPropagation(); if (dm.otherUser) onViewProfile(dm.otherUser.id); }} title="Ver perfil">
                  <Avatar src={dm.otherUser?.avatar} name={dm.otherUser?.username} className="w-8 h-8 rounded-full bg-[#5865F2] text-sm" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{dm.otherUser?.username || "Desconhecido"}</div>
                  <div className="text-xs text-zinc-500 truncate">Clique para conversar</div>
                </div>
                {(unreadDMs?.[dm.id] || 0) > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#DA373C] text-white text-[11px] font-bold flex items-center justify-center shrink-0">{unreadDMs![dm.id] > 9 ? "9+" : unreadDMs![dm.id]}</span>
                )}
                <div className={`w-2 h-2 rounded-full ${onlineMembers.some((m) => m.id === dm.otherUser?.id) ? "bg-[#23A559]" : "bg-zinc-600"}`} />
              </button>
            ))}
            <div className="mt-4 p-2 bg-[#232428] rounded">
              <p className="text-xs font-bold text-zinc-300">Amigos Online — {onlineMembers.length}</p>
              <div className="mt-2 space-y-1">
                  {onlineMembers.slice(0, 5).map((m) => (
                    <button key={m.id} onClick={() => { setNewDMUsername(m.username); setShowNewDMModal(true); }} className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-[#35373C] text-left">
                      <Avatar src={m.avatar} name={m.username} className="w-6 h-6 rounded-full bg-[#41434A] text-xs" />
                      <span className="text-xs text-zinc-300 truncate">{m.username}</span>
                      <Plus className="w-3 h-3 ml-auto text-zinc-500" />
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </>
      ) : (
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {activeVoice.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-zinc-400 px-1 mb-1">ATIVO AGORA</p>
                {activeVoice.map((g) => (
                  <div key={g.channelId} className="mb-1.5 rounded-lg bg-[#232428] p-2">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-3.5 h-3.5 text-[#23A559] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 truncate">{g.channelName}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{g.serverName} • {g.users.length} em voz</div>
                      </div>
                      <button onClick={() => onJoinVoice(g.serverId, g.channelId)} className="px-2 py-1 rounded bg-[#23A559] hover:bg-[#1A7F44] text-white text-[11px] font-bold shrink-0">Entrar</button>
                    </div>
                    <div className="mt-1.5 flex items-center">
                      {g.users.slice(0, 5).map((u) => (
                        <button key={u.id} onClick={() => onViewProfile(u.id)} title={u.username} className="-ml-1 first:ml-0">
                          <Avatar src={u.avatar} name={u.username} className="w-6 h-6 rounded-full border-2 border-[#232428] bg-[#41434A] text-[10px]" />
                        </button>
                      ))}
                      {g.users.length > 5 && <span className="ml-1 text-[10px] text-zinc-500">+{g.users.length - 5}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <input
                value={newFriendName}
                onChange={(e) => setNewFriendName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addFriend()}
                placeholder="Username do amigo"
                className="flex-1 min-w-0 bg-[#1E1F22] rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#5865F2] placeholder:text-zinc-500 text-zinc-200"
              />
              <button onClick={addFriend} disabled={sendingFriend || !newFriendName.trim()} className="px-2 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 rounded text-zinc-200 shrink-0" title="Adicionar amigo">
                <UserPlus className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input value={friendQuery} onChange={(e) => setFriendQuery(e.target.value)} placeholder="Buscar amigo" className="w-full bg-[#1E1F22] rounded pl-7 pr-2 py-1.5 text-xs focus:outline-none placeholder:text-zinc-500 text-zinc-200" />
            </div>
            {incomingRequests.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-zinc-400 px-1 mb-1">PEDIDOS — {incomingRequests.length}</p>
                {incomingRequests.map((r) => (
                  <div key={r.from_user} className="flex items-center gap-2 px-1.5 py-1.5 rounded bg-[#232428] mb-1">
                    <button onClick={() => onViewProfile(r.from_user)} title="Ver perfil"><Avatar src={r.avatar} name={r.username} className="w-7 h-7 rounded-full bg-[#41434A] text-xs" /></button>
                    <span className="flex-1 min-w-0 text-xs font-medium text-zinc-200 truncate">{r.username}</span>
                    <button onClick={() => onAcceptFriend(r.from_user)} className="w-7 h-7 rounded-full bg-[#23A559] hover:bg-[#1A7F44] flex items-center justify-center shrink-0" title="Aceitar"><Check className="w-3.5 h-3.5 text-white" /></button>
                    <button onClick={() => onRejectFriend(r.from_user)} className="w-7 h-7 rounded-full bg-[#35373C] hover:bg-[#DA373C] flex items-center justify-center shrink-0" title="Recusar"><X className="w-3.5 h-3.5 text-zinc-300" /></button>
                  </div>
                ))}
              </div>
            )}
            {outgoingRequests.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-zinc-400 px-1 mb-1">ENVIADOS</p>
                {outgoingRequests.map((r) => (
                  <div key={r.to_user} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-[#35373C]">
                    <Avatar src={r.avatar} name={r.username} className="w-6 h-6 rounded-full bg-[#41434A] text-[10px]" />
                    <span className="flex-1 min-w-0 text-xs text-zinc-400 truncate">{r.username}</span>
                    <button onClick={() => onCancelFriend(r.to_user)} className="text-[11px] text-zinc-500 hover:text-red-400 shrink-0">cancelar</button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <p className="text-[11px] font-bold text-zinc-400 px-1 mb-1">AMIGOS — {shownFriends.length}</p>
              {shownFriends.length === 0 && <p className="text-[11px] text-zinc-600 px-1">{friendsList.length === 0 ? "Sem amigos ainda." : "Nada achado."}</p>}
              {shownFriends.map((f) => (
                <div key={f.user_id} className="flex items-center gap-2 px-1.5 py-1.5 rounded hover:bg-[#35373C] group">
                  <button onClick={() => onViewProfile(f.user_id)} className="relative shrink-0" title="Ver perfil">
                    <Avatar src={f.avatar} name={f.username} className="w-7 h-7 rounded-full bg-[#41434A] text-xs" />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#2B2D31] ${onlineIds.has(f.user_id) ? "bg-[#23A559]" : "bg-zinc-600"}`} />
                  </button>
                  <button onClick={() => onFriendDM(f.user_id)} className="flex-1 min-w-0 text-left">
                    <span className="block text-xs font-medium text-zinc-200 truncate">{f.username}</span>
                    <span className="block text-[10px] text-zinc-500">{onlineIds.has(f.user_id) ? "Online" : "Offline"}</span>
                  </button>
                  <button onClick={() => onFriendDM(f.user_id)} className="p-1.5 hover:bg-[#5865F2] rounded opacity-0 group-hover:opacity-100 shrink-0" title="Conversar"><MessageCircle className="w-3.5 h-3.5 text-zinc-300" /></button>
                  <button onClick={() => onRemoveFriend(f.user_id, f.username)} className="p-1.5 hover:bg-[#DA373C] rounded opacity-0 group-hover:opacity-100 shrink-0" title="Remover"><UserX className="w-3.5 h-3.5 text-zinc-400 hover:text-white" /></button>
                </div>
              ))}
            </div>
          </div>
          )}
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
                {currentServer && <button onClick={onOpenMembers} className="p-1 hover:bg-[#404249] rounded" title="Membros e convites"><Users className="w-3.5 h-3.5 text-zinc-400 hover:text-white" /></button>}
                {currentServer && canManage && <button onClick={onOpenRoles} className="p-1 hover:bg-[#404249] rounded" title="Cargos e permissões"><Shield className="w-3.5 h-3.5 text-zinc-400 hover:text-white" /></button>}
                {currentServer && canManage && <button onClick={() => openEditServer(currentServer)} className="p-1 hover:bg-[#404249] rounded" title="Editar servidor"><Settings className="w-3.5 h-3.5 text-zinc-400 hover:text-white" /></button>}
                {currentServer && canManage && <button onClick={deleteServer} className="p-1 hover:bg-[#404249] rounded" title="Excluir servidor"><Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400" /></button>}
                {currentServer && !canManage && <button onClick={onLeaveServer} className="p-1 hover:bg-[#404249] rounded" title="Sair do servidor"><DoorOpen className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400" /></button>}
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
      {voiceStatus.joined && (
        <div className="absolute bottom-full left-0 right-0 bg-[#1E1F22] border-t border-black/40 px-2 py-1.5">
          <div className="flex items-center gap-1.5 text-[#23A559] text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-[#23A559] animate-pulse shrink-0" />
            <span className="truncate">Voz conectada</span>
          </div>
          <div className="text-[11px] text-zinc-400 truncate mt-0.5">
            {voiceStatus.channelName || "Canal de voz"}{voiceStatus.serverName ? ` / ${voiceStatus.serverName}` : ""}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <button onClick={() => voiceControls.current?.toggleMute()} className={`flex-1 py-1 rounded text-[11px] font-semibold ${voiceStatus.muted ? "bg-[#DA373C] text-white" : "bg-[#2B2D31] hover:bg-[#35373C] text-zinc-200"}`} title={voiceStatus.muted ? "Ativar microfone" : "Mutar"}>
              {voiceStatus.muted ? "Mutado" : "Mutar"}
            </button>
            <button onClick={() => voiceControls.current?.toggleDeafen()} className={`flex-1 py-1 rounded text-[11px] font-semibold ${voiceStatus.deafened ? "bg-[#DA373C] text-white" : "bg-[#2B2D31] hover:bg-[#35373C] text-zinc-200"}`} title="Surdo">
              {voiceStatus.deafened ? "Ensurdecido" : "Ensurdecer"}
            </button>
            <button onClick={() => voiceControls.current?.leave()} className="flex-1 py-1 rounded text-[11px] font-semibold bg-[#DA373C] hover:bg-[#A12828] text-white" title="Sair da voz">
              Sair
            </button>
          </div>
        </div>
      )}
        <button onClick={() => userId && onViewProfile(userId)} className="relative shrink-0" title="Meu perfil">
          <Avatar src={userAvatar || undefined} name={username} className="w-8 h-8 rounded-full bg-[#5865F2] text-sm" />
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#232428] ${statusConfig[status].color}`} />
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowStatusMenu(!showStatusMenu)}>
          <div className="text-sm font-semibold leading-none truncate flex items-center gap-1">{username} <span className={`w-2 h-2 rounded-full ${statusConfig[status].color}`} /></div>
          <div className="text-xs text-zinc-400 leading-none truncate">{statusConfig[status].label}</div>
        </div>
        <span className="text-[8px] font-mono bg-[#1E1F22] px-1 py-0.5 rounded text-zinc-500 shrink-0">{APP_VERSION}</span>
        <button onClick={() => setShowUsernameModal(true)} className="p-1 hover:bg-[#35373C] rounded shrink-0"><Settings className="w-4 h-4 text-zinc-400" /></button>
        <button onClick={onSignOut} className="p-1 hover:bg-[#DA373C] rounded group shrink-0" title="Sair"><LogOut className="w-4 h-4 text-zinc-400 group-hover:text-white" /></button>
        {showStatusMenu && (
          <div className="absolute bottom-full left-2 mb-2 w-52 bg-[#232428] border border-[#1E1F22] rounded-lg shadow-xl overflow-hidden z-50">
            {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map((k) => (
              <button key={k} onClick={() => { setStatus(k); setShowStatusMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#35373C] ${status === k ? "bg-[#35373C] text-white" : "text-zinc-300"}`}>
                <span className={`w-3 h-3 rounded-full ${statusConfig[k].color}`} /> {statusConfig[k].label}
              </button>
            ))}
            {isDesktop && ptt && (
              <div className="border-t border-[#1E1F22] px-3 py-2">
                <button
                  onClick={() => applyPtt({ ...ptt, enabled: !ptt.enabled })}
                  className="w-full flex items-center gap-2 text-sm text-zinc-300 hover:text-white"
                >
                  <span className={`w-3 h-3 rounded-full ${ptt.enabled ? "bg-[#23A559]" : "bg-zinc-600"}`} />
                  Push-to-talk {ptt.enabled ? "ligado" : "desligado"}
                </button>
                {ptt.enabled && (
                  <button
                    onClick={() => setCapturingPtt(true)}
                    className="mt-1.5 w-full text-left text-xs bg-[#2B2D31] hover:bg-[#35373C] rounded px-2 py-1.5 text-zinc-300"
                  >
                    {capturingPtt ? "Pressione a tecla..." : `Tecla: ${ptt.accelerator}`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
