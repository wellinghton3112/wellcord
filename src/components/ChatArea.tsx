"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { RefObject } from "react";
import {
  Hash, Send, Smile, Gift, Sticker, Phone, Video, Pin, UserPlus, Menu,
  Search, Inbox, HelpCircle, Plus, ChevronUp, ChevronDown, Loader2, BarChart3, X, Check,
} from "lucide-react";
import type { Channel, DMConversation, DMMessage, Message, PendingFile, Poll, PresenceUser, ReactionMap, ReplyTarget } from "@/lib/chat-types";
import type { TypingUser } from "@/hooks/useTyping";
import { useVoice } from "@/context/VoiceContext";
import Avatar from "@/components/Avatar";
import VoiceChannel from "@/components/VoiceChannel";
import { useAppStore } from "@/stores/useAppStore";
import { useModalStore } from "@/stores/useModalStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { useChatSearch } from "@/hooks/chat/useChatSearch";
import { useChatScroll } from "@/hooks/chat/useChatScroll";
import { useMessageEdit } from "@/hooks/chat/useMessageEdit";
import { ChatMessage, ChatDMMessage, ReplyPreview, TypingBar, MentionBox, mentionize, AttachmentBlock } from "@/components/chat";
import { useDropZone } from "@/hooks/chat/useDropZone";
import { DropOverlay } from "@/components/DropOverlay";
import { MAX_FILE_MB } from "@/lib/chat-types";

type Props = {
  dmConversations: DMConversation[];
  dmMessages: DMMessage[];
  dmInput: string;
  setDmInput: (v: string) => void;
  handleDMSend: () => void;
  onlineMembers: PresenceUser[];
  currentChannel?: Channel;
  serverName?: string;
  channelMessages: Message[];
  input: string;
  setInput: (v: string) => void;
  handleSend: () => void;
  onEditMessage: (id: string, content: string) => void;
  onDeleteMessage: (id: string) => void;
  onEditDM: (id: string, content: string) => void;
  onDeleteDM: (id: string) => void;
  onInvite: () => void;
  reactions: ReactionMap;
  onToggleReaction: (id: string, emoji: string) => void;
  dmReactions: ReactionMap;
  onToggleDMReaction: (id: string, emoji: string) => void;
  replyTo: ReplyTarget | null;
  setReplyTo: (r: ReplyTarget | null) => void;
  dmReplyTo: ReplyTarget | null;
  setDmReplyTo: (r: ReplyTarget | null) => void;
  pendingFile: PendingFile | null;
  uploading: boolean;
  onAttachFile: (f: File) => void;
  onClearFile: () => void;
  pendingDmFile: PendingFile | null;
  uploadingDm: boolean;
  onAttachDmFile: (f: File) => void;
  onClearDmFile: () => void;
  typingChannel: TypingUser[];
  typingDM: TypingUser[];
  onBlurChannel: () => void;
  onBlurDM: () => void;
  mentionCandidates: { id: string; username: string; avatar?: string }[];
  dmMentionCandidates: { id: string; username: string; avatar?: string }[];
  onViewProfile: (id: string) => void;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => Promise<number>;
  dmHasMore: boolean;
  dmLoadingOlder: boolean;
  onLoadOlderDM: () => Promise<number>;
  pinnedIds: Set<string>;
  canPinMsg: (userId?: string | null) => boolean;
  onTogglePin: (id: string) => void;
  isOwner: boolean;
  canModerateMessages?: boolean;
  polls: Poll[];
  onToggleVote: (pollId: string, optionId: string) => void;
  onDeletePoll: (pollId: string) => void;
};

export default function ChatArea(props: Props) {
  const {
    dmConversations, dmMessages, dmInput, setDmInput, handleDMSend, onlineMembers,
    currentChannel, serverName, channelMessages, input, setInput, handleSend,
    onEditMessage, onDeleteMessage, onEditDM, onDeleteDM, onInvite,
    reactions, onToggleReaction, dmReactions, onToggleDMReaction,
    replyTo, setReplyTo, dmReplyTo, setDmReplyTo,
    pendingFile, uploading, onAttachFile, onClearFile,
    pendingDmFile, uploadingDm, onAttachDmFile, onClearDmFile,
    typingChannel, typingDM, onBlurChannel, onBlurDM,
    mentionCandidates, dmMentionCandidates, onViewProfile,
    hasMore, loadingOlder, onLoadOlder, dmHasMore, dmLoadingOlder, onLoadOlderDM,
    pinnedIds, canPinMsg, onTogglePin, isOwner, canModerateMessages,
    polls, onToggleVote, onDeletePoll,
  } = props;

  const { viewMode, setShowMobileSidebar, selectedDM, selectedChannel } = useAppStore();
  const { username, avatar: userAvatar, status } = useProfileStore();
  const userId = useProfileStore((s) => s.user?.id);
  const dmOther = dmConversations.find((d) => d.id === selectedDM)?.otherUser;

  const [pickFor, setPickFor] = useState<string | null>(null);

  const channelSearch = useChatSearch({ messages: channelMessages, selectedDM, selectedChannel, viewMode });
  const dmSearch = useChatSearch({ messages: dmMessages, selectedDM, selectedChannel, viewMode });
  const search = viewMode === "dm" ? dmSearch : channelSearch;

  const channelScroll = useChatScroll({ messages: channelMessages, hasMore, loadingOlder, onLoadOlder, selectedKey: selectedChannel || "" });
  const dmScroll = useChatScroll({ messages: dmMessages, hasMore: dmHasMore, loadingOlder: dmLoadingOlder, onLoadOlder: onLoadOlderDM, selectedKey: selectedDM || "" });
  const scroll = viewMode === "dm" ? dmScroll : channelScroll;

  const channelEdit = useMessageEdit();
  const dmEdit = useMessageEdit();
  const edit = viewMode === "dm" ? dmEdit : channelEdit;

  const dropHandler = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) return;
    if (viewMode === "dm") onAttachDmFile(f);
    else onAttachFile(f);
  }, [viewMode, onAttachFile, onAttachDmFile]);

  const dropZone = useDropZone({
    onDrop: dropHandler,
    maxSize: MAX_FILE_MB * 1024 * 1024,
  });

  const { status: voiceStatus } = useVoice();
  const inVoiceView = viewMode === "server" && currentChannel?.type === "voice";
  const voiceActiveId = voiceStatus.joined && voiceStatus.channelId ? voiceStatus.channelId : null;
  const vcChannelId = inVoiceView ? selectedChannel : (voiceActiveId || selectedChannel);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dmFileInputRef = useRef<HTMLInputElement>(null);
  const channelInputRef = useRef<HTMLInputElement>(null);
  const dmInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!search.activeMatchId) return;
    const t = setTimeout(() => scroll.scrollToMsg(search.activeMatchId), 50);
    return () => clearTimeout(t);
  }, [search.activeMatchId]);

  const pendingPreview = useCallback((pending: PendingFile | null, isUploading: boolean, clear: () => void) => {
    if (isUploading) {
      return (
        <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Enviando arquivo...
        </div>
      );
    }
    if (!pending) return null;
    const isImage = (pending.type || "").startsWith("image/");
    return (
      <div className="mb-2 flex items-center gap-2 bg-[#2B2D31] rounded-lg p-2 w-fit max-w-full">
        {isImage ? (
          <img src={pending.url} alt={pending.name} className="h-14 w-14 rounded object-cover" />
        ) : (
          <AttachmentBlock url={pending.url} name={pending.name} type={pending.type} />
        )}
        <span className="text-xs text-zinc-300 truncate max-w-48">{pending.name}</span>
        <button onClick={clear} className="p-1 hover:bg-[#35373C] rounded shrink-0" title="Remover anexo"><X className="w-4 h-4 text-zinc-400" /></button>
      </div>
    );
  }, []);

  const searchBox = useCallback((placeholder: string) => (
    <div className="relative hidden md:block">
      <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
      <input
        value={search.search}
        onChange={(e) => search.runSearch(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") search.stepMatch(e.shiftKey ? -1 : 1); if (e.key === "Escape") search.runSearch(""); }}
        placeholder={placeholder}
        className="bg-[#2B2D31] rounded pl-7 pr-14 py-1 text-sm w-44 focus:outline-none focus:ring-1 focus:ring-[#5865F2] placeholder:text-zinc-500 text-zinc-200"
      />
      {search.q && (
        <span className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[11px] text-zinc-400">
          {search.matchIds.length > 0 ? `${(search.matchIdx % search.matchIds.length) + 1}/${search.matchIds.length}` : "0"}
          <button onClick={() => search.stepMatch(-1)} className="p-0.5 hover:bg-[#35373C] rounded" title="Anterior (Shift+Enter)"><ChevronUp className="w-3.5 h-3.5" /></button>
          <button onClick={() => search.stepMatch(1)} className="p-0.5 hover:bg-[#35373C] rounded" title="Próximo (Enter)"><ChevronDown className="w-3.5 h-3.5" /></button>
          <button onClick={() => search.runSearch("")} className="p-0.5 hover:bg-[#35373C] rounded" title="Limpar (Esc)"><X className="w-3.5 h-3.5" /></button>
        </span>
      )}
    </div>
  ), [search.q, search.matchIds, search.matchIdx, search.runSearch, search.stepMatch]);

  const feed = useMemo(() => [
    ...channelMessages.map((msg) => ({ kind: "msg" as const, at: msg.created_at || "", msg })),
    ...polls.map((poll) => ({ kind: "poll" as const, at: poll.created_at, poll })),
  ].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)), [channelMessages, polls]);

  const renderPoll = useCallback((poll: Poll) => {
    const total = poll.totalVotes;
    const time = new Date(poll.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return (
      <div key={`poll-${poll.id}`} id={`poll-${poll.id}`} className="my-1 ml-14 mr-2 max-w-md rounded-lg bg-[#2B2D31] p-2.5 scroll-mt-20">
        <div className="text-[14px] font-medium text-[#DBDEE1] break-words">{poll.question}</div>
        <div className="mt-1.5">
          {poll.options.map((o) => {
            const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
            return (
              <div key={o.id}>
                <button
                  onClick={() => onToggleVote(poll.id, o.id)}
                  className="w-full flex items-center gap-2 py-1 text-left group/opt"
                >
                  <span className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${o.mine ? "bg-[#5865F2] border-[#5865F2]" : "border-zinc-500 group-hover/opt:border-zinc-300"}`}>
                    {o.mine && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span className="flex-1 truncate text-[13px] text-zinc-200">{o.label}</span>
                  <span className="flex items-center shrink-0">
                    <span className="flex -space-x-1.5">
                      {o.voters.slice(0, 3).map((v) => (
                        <Avatar key={v.id} src={v.avatar} name={v.username} className="w-4 h-4 rounded-full border border-[#2B2D31] text-[8px]" />
                      ))}
                    </span>
                    <span className="ml-1 text-[11px] text-zinc-400 font-semibold w-4 text-right">{o.votes}</span>
                  </span>
                </button>
                <div className="ml-6 h-1 rounded-full bg-[#1E1F22] overflow-hidden">
                  <div className="h-full rounded-full bg-[#5865F2] transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[11px] text-zinc-500">{total} voto{total === 1 ? "" : "s"}</span>
          <span className="ml-auto text-[10px] text-zinc-600">{time}</span>
          {(poll.user_id === userId || isOwner) && (
            <button onClick={() => onDeletePoll(poll.id)} className="text-[10px] text-zinc-600 hover:text-red-400 hover:underline">apagar</button>
          )}
        </div>
      </div>
    );
  }, [polls, userId, isOwner, onToggleVote, onDeletePoll]);

  return (
    <div
      className="flex-1 flex flex-col bg-[#313338] min-w-0 relative"
      onDragOver={dropZone.onDragOver}
      onDragEnter={dropZone.onDragEnter}
      onDragLeave={dropZone.onDragLeave}
      onDrop={dropZone.onDrop}
    >
      <DropOverlay visible={dropZone.dragging} />
      {viewMode === "dm" ? (
        <>
          <div className="h-12 flex items-center px-4 gap-3 border-b border-[#1F2124] shadow-sm shrink-0">
            <button onClick={() => setShowMobileSidebar(true)} className="lg:hidden p-2 -ml-2 bg-[#2B2D31] hover:bg-[#404249] rounded-lg"><Menu className="w-5 h-5" /></button>
            {selectedDM ? (
              <>
                <Avatar src={dmOther?.avatar} name={dmOther?.username} className="w-8 h-8 rounded-full bg-[#5865F2] text-sm" />
                <span className="font-bold">{dmOther?.username || "DM"}</span>
                <span className={`w-2 h-2 rounded-full ${onlineMembers.some((m) => m.id === dmOther?.id) ? "bg-[#23A559]" : "bg-zinc-500"}`} />
              </>
            ) : (
              <span className="font-bold text-zinc-400">Selecione uma conversa</span>
            )}
            <div className="ml-auto flex items-center gap-3 text-zinc-400">
              <span title="Chamada de voz (em breve)"><Phone className="w-5 h-5 cursor-not-allowed opacity-50" /></span><span title="Chamada de vídeo (em breve)"><Video className="w-5 h-5 cursor-not-allowed opacity-50" /></span>
              {searchBox("Buscar na DM")}
            </div>
          </div>
          <div
            ref={dmScroll.listRef}
            onScroll={(e) => dmScroll.trackScroll(e.currentTarget)}
            className="flex-1 overflow-y-auto p-4 space-y-1"
          >
            {dmLoadingOlder && <p className="text-center text-xs text-zinc-500 py-2">Carregando mais...</p>}
            {!selectedDM ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4">
                <div className="w-16 h-16 rounded-full bg-[#41434A] flex items-center justify-center text-2xl">💬</div>
                <p>Selecione uma DM ou crie uma nova com +</p>
              </div>
            ) : dmMessages.length === 0 ? (
              <div className="py-8 text-center border-b border-[#3F4147]">
                <p className="text-zinc-400">Início da DM com {dmOther?.username}</p>
                <p className="text-xs text-zinc-500 mt-1">Mensagens privadas em tempo real</p>
              </div>
            ) : (
              dmMessages.map((m) => (
                <ChatDMMessage
                  key={m.id}
                  msg={m}
                  userId={userId}
                  userAvatar={userAvatar || undefined}
                  selectedDM={selectedDM}
                  dmConversations={dmConversations}
                  dmReactions={dmReactions}
                  editingId={dmEdit.editingId}
                  pickFor={pickFor}
                  searchQuery={search.q}
                  highlight={search.highlight}
                  onEdit={onEditDM}
                  onDelete={onDeleteDM}
                  onReply={setDmReplyTo}
                  onToggleReaction={onToggleDMReaction}
                  onViewProfile={onViewProfile}
                  scrollToMsg={dmScroll.scrollToMsg}
                  EditBox={dmEdit.EditBox}
                  setPickFor={setPickFor}
                />
              ))
            )}
          </div>
          {selectedDM && (
            <div className="px-4 pt-1 shrink-0">
              <TypingBar users={typingDM} />
            </div>
          )}
          {selectedDM && (
            <div className="p-4 pt-1 shrink-0">
              <ReplyPreview target={dmReplyTo} clear={() => setDmReplyTo(null)} />
              {pendingPreview(pendingDmFile, uploadingDm, onClearDmFile)}
              <MentionBox value={dmInput} candidates={dmMentionCandidates} apply={setDmInput} focusRef={dmInputRef} userId={userId} />
              <input ref={dmFileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAttachDmFile(f); e.target.value = ""; }} />
              <div className="bg-[#383A40] rounded-lg flex items-center gap-2 px-3 py-2">
                <button onClick={() => dmFileInputRef.current?.click()} className="w-7 h-7 rounded-full bg-zinc-500 flex items-center justify-center hover:bg-zinc-400 shrink-0" title="Anexar arquivo"><Plus className="w-4 h-4 text-[#383A40]" /></button>
                <input ref={dmInputRef} value={dmInput} onChange={(e) => setDmInput(e.target.value)} onBlur={onBlurDM} onKeyDown={(e) => e.key === "Enter" && handleDMSend()} placeholder={`Mensagem para @${dmOther?.username || ""}`} className="flex-1 bg-transparent outline-none placeholder:text-zinc-400 text-[15px] min-w-0" />
                <button onClick={handleDMSend} className="bg-[#5865F2] hover:bg-[#4752C4] text-white p-1.5 rounded-full"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="h-12 flex items-center px-4 gap-3 border-b border-[#1F2124] shadow-sm shrink-0">
            <button onClick={() => setShowMobileSidebar(true)} className="lg:hidden p-2 -ml-2 bg-[#2B2D31] hover:bg-[#404249] rounded-lg"><Menu className="w-5 h-5" /></button>
            <Hash className="w-5 h-5 text-zinc-400" /><span className="font-bold">{currentChannel?.name}</span>
            <span className="w-px h-6 bg-[#3F4147] mx-2" />
            <span className="text-sm text-zinc-400 truncate hidden sm:block">Canal de texto • Supabase Realtime ativo</span>
              <div className="ml-auto flex items-center gap-2 sm:gap-4 text-zinc-400">
                <span title="Chamada de voz (em breve)"><Phone className="w-5 h-5 hidden md:block cursor-not-allowed opacity-50" /></span><span title="Chamada de vídeo (em breve)"><Video className="w-5 h-5 hidden md:block cursor-not-allowed opacity-50" /></span><button onClick={() => useModalStore.getState().openModal("showPinsModal")} title="Ver fixados"><Pin className="w-5 h-5 hidden md:block hover:text-white" /></button><button onClick={onInvite} title="Convidar amigos"><UserPlus className="w-5 h-5 hover:text-white" /></button>
                {searchBox("Buscar")}
                <Inbox className="w-5 h-5" /><HelpCircle className="w-5 h-5" />
              </div>
          </div>
          <div
            ref={channelScroll.listRef}
            onScroll={(e) => channelScroll.trackScroll(e.currentTarget)}
            className="flex-1 overflow-y-auto p-4 space-y-1 flex flex-col"
          >
            {loadingOlder && <p className="text-center text-xs text-zinc-500 py-2">Carregando mais...</p>}
            {(inVoiceView || voiceActiveId) ? (
              <div className={inVoiceView ? "contents" : "hidden"}>
                <VoiceChannel
                  channelId={vcChannelId}
                  username={username}
                  status={status}
                  channelName={inVoiceView ? currentChannel?.name : undefined}
                  serverName={inVoiceView ? serverName : undefined}
                  avatar={userAvatar || undefined}
                />
              </div>
            ) : (
              <>
                <div className="py-8 border-b border-[#3F4147] mb-4">
                  <div className="w-16 h-16 rounded-full bg-[#41434A] flex items-center justify-center text-3xl mb-3"><Hash className="w-8 h-8" /></div>
                  <h1 className="text-3xl font-bold">Bem-vindo(a) ao #{currentChannel?.name}!</h1>
                  <p className="text-zinc-400 mt-2">Mensagens agora são salvas no Supabase e aparecem em tempo real para todos.</p>
                  {channelMessages.length === 0 && <p className="text-sm text-zinc-500 mt-2">Nenhuma mensagem ainda. Seja o primeiro a enviar!</p>}
                </div>
                {feed.map((item) =>
                  item.kind === "poll" ? renderPoll(item.poll) : (
                    <ChatMessage
                      key={item.msg.id}
                      msg={item.msg}
                      userId={userId}
                      isOwner={isOwner}
                      canModerateMessages={canModerateMessages}
                      pinnedIds={pinnedIds}
                      reactions={reactions}
                      editingId={channelEdit.editingId}
                      pickFor={pickFor}
                      searchQuery={search.q}
                      highlight={search.highlight}
                      mentionize={mentionize}
                      canPinMsg={canPinMsg}
                      onEdit={channelEdit.startEdit}
                      onDelete={onDeleteMessage}
                      onReply={setReplyTo}
                      onToggleReaction={onToggleReaction}
                      onTogglePin={onTogglePin}
                      onViewProfile={onViewProfile}
                      scrollToMsg={channelScroll.scrollToMsg}
                      EditBox={channelEdit.EditBox}
                      setPickFor={setPickFor}
                    />
                  )
                )}
              </>
            )}
          </div>
          {currentChannel?.type === "text" && (
            <div className="px-4 pt-1 shrink-0">
              <TypingBar users={typingChannel} />
            </div>
          )}
          {currentChannel?.type === "text" && (
            <div className="p-4 pt-1 shrink-0">
              <ReplyPreview target={replyTo} clear={() => setReplyTo(null)} />
              {pendingPreview(pendingFile, uploading, onClearFile)}
              <MentionBox value={input} candidates={mentionCandidates} apply={setInput} focusRef={channelInputRef} userId={userId} />
              <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAttachFile(f); e.target.value = ""; }} />
              <div className="bg-[#383A40] rounded-lg flex items-center gap-2 px-3 py-2">
                <button onClick={() => fileInputRef.current?.click()} className="w-7 h-7 rounded-full bg-zinc-500 flex items-center justify-center hover:bg-zinc-400 shrink-0" title="Anexar arquivo"><Plus className="w-4 h-4 text-[#383A40]" /></button>
                <button onClick={() => useModalStore.getState().openModal("showPollModal")} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-zinc-500 shrink-0 text-zinc-400 hover:text-[#383A40]" title="Criar enquete"><BarChart3 className="w-4 h-4" /></button>
                <input ref={channelInputRef} value={input} onChange={(e) => setInput(e.target.value)} onBlur={onBlurChannel} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder={`Conversar em #${currentChannel?.name}`} className="flex-1 bg-transparent outline-none placeholder:text-zinc-400 text-[15px] min-w-0" />
                <div className="flex items-center gap-2 text-zinc-400 shrink-0">
                  <Gift className="w-5 h-5 hidden sm:block" /><Sticker className="w-5 h-5 hidden sm:block" /><Smile className="w-5 h-5" />
                  <button onClick={handleSend} className="bg-[#5865F2] hover:bg-[#4752C4] text-white p-1.5 rounded-full transition-colors"><Send className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-2 hidden md:block">Enter para enviar • Realtime ativo • Compartilhe a URL com seus amigos</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
