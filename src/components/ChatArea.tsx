"use client";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  Hash, Send, Smile, Gift, Sticker, Phone, Video, Pin, UserPlus, Menu,
  Search, Inbox, HelpCircle, Plus, MoreHorizontal, Pencil, Trash2, X, Reply,
  ChevronUp, ChevronDown, FileText, Download, Loader2, BarChart3, Check,
} from "lucide-react";
import type { Channel, DMConversation, DMMessage, Message, PendingFile, Poll, PresenceUser, ReactionMap, ReplyTarget } from "@/lib/chat-types";
import type { TypingUser } from "@/hooks/useTyping";
import Avatar from "@/components/Avatar";
import { QUICK_EMOJIS } from "@/lib/chat-types";
import VoiceChannel from "@/components/VoiceChannel";

type Props = {
  viewMode: "server" | "dm";
  setShowMobileSidebar: (v: boolean) => void;
  // DM
  dmConversations: DMConversation[];
  selectedDM: string | null;
  dmMessages: DMMessage[];
  dmInput: string;
  setDmInput: (v: string) => void;
  handleDMSend: () => void;
  onlineMembers: PresenceUser[];
  userId?: string;
  // Servidor
  currentChannel?: Channel;
  selectedChannel: string;
  channelMessages: Message[];
  input: string;
  setInput: (v: string) => void;
  handleSend: () => void;
  username: string;
  status: string;
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
  userAvatar?: string | null;
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
  onOpenPins: () => void;
  isOwner: boolean;
  polls: Poll[];
  onToggleVote: (pollId: string, optionId: string) => void;
  onDeletePoll: (pollId: string) => void;
  onOpenPollModal: () => void;
};

// Área principal de chat (DM ou canal). Extraído de page.tsx sem mudança visual.
export default function ChatArea(props: Props) {
  const {
    viewMode, setShowMobileSidebar,
    dmConversations, selectedDM, dmMessages, dmInput, setDmInput, handleDMSend, onlineMembers, userId,
    currentChannel, selectedChannel, channelMessages, input, setInput, handleSend, username, status,
    onEditMessage, onDeleteMessage, onEditDM, onDeleteDM, onInvite,
    reactions, onToggleReaction, dmReactions, onToggleDMReaction,
    replyTo, setReplyTo, dmReplyTo, setDmReplyTo,
    pendingFile, uploading, onAttachFile, onClearFile,
    pendingDmFile, uploadingDm, onAttachDmFile, onClearDmFile,
    typingChannel, typingDM, onBlurChannel, onBlurDM,
    mentionCandidates, dmMentionCandidates, userAvatar, onViewProfile,
    hasMore, loadingOlder, onLoadOlder, dmHasMore, dmLoadingOlder, onLoadOlderDM,
    pinnedIds, canPinMsg, onTogglePin, onOpenPins, isOwner,
    polls, onToggleVote, onDeletePoll, onOpenPollModal,
  } = props;
  const dmOther = dmConversations.find((d) => d.id === selectedDM)?.otherUser;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [votersOf, setVotersOf] = useState<string | null>(null);

  const startEdit = (id: string, content: string) => { setEditingId(id); setEditDraft(content); };
  const cancelEdit = () => { setEditingId(null); setEditDraft(""); };
  const saveEdit = (save: (id: string, content: string) => void) => {
    if (editingId && editDraft.trim()) save(editingId, editDraft.trim());
    cancelEdit();
  };

  const editBox = (save: (id: string, content: string) => void) => (
    <div className="mt-1 flex items-center gap-2">
      <input
        value={editDraft}
        onChange={(e) => setEditDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(save); if (e.key === "Escape") cancelEdit(); }}
        className="flex-1 bg-[#2B2D31] rounded px-2 py-1 text-[15px] outline-none focus:ring-1 focus:ring-[#5865F2] min-w-0"
        autoFocus
      />
      <button onClick={() => saveEdit(save)} className="text-xs text-[#5865F2] hover:underline shrink-0">Salvar</button>
      <button onClick={cancelEdit} className="p-1 hover:bg-[#2B2D31] rounded shrink-0"><X className="w-3.5 h-3.5 text-zinc-400" /></button>
    </div>
  );

  const reactionBar = (
    list: { emoji: string; count: number; mine: boolean }[] | undefined,
    toggle: (emoji: string) => void,
  ) => {
    if (!list || list.length === 0) return null;
    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {list.map((r) => (
          <button
            key={r.emoji}
            onClick={() => toggle(r.emoji)}
            title={r.mine ? "Remover minha reação" : "Reagir também"}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${r.mine ? "bg-[#5865F2]/30 border-[#5865F2] text-white" : "bg-[#2B2D31] border-[#4A4D53] text-zinc-300 hover:border-zinc-400"}`}
          >
            <span>{r.emoji}</span><span className="font-semibold">{r.count}</span>
          </button>
        ))}
      </div>
    );
  };

  const emojiPicker = (messageId: string, toggle: (id: string, emoji: string) => void) => (
    <div className="mt-1 flex items-center gap-1 bg-[#2B2D31] border border-[#4A4D53] rounded-lg p-1.5 w-fit shadow-lg">
      {QUICK_EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => { toggle(messageId, e); setPickFor(null); }}
          className="text-lg hover:scale-125 transition-transform p-0.5"
        >
          {e}
        </button>
      ))}
      <button onClick={() => setPickFor(null)} className="p-1 hover:bg-[#35373C] rounded"><X className="w-3.5 h-3.5 text-zinc-400" /></button>
    </div>
  );

  const scrollToMsg = (id: string | null | undefined) => {
    if (!id) return;
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Busca no texto das mensagens carregadas (canal ou DM atual)
  const [search, setSearch] = useState("");
  const [matchIdx, setMatchIdx] = useState(0);

  const searchPool = viewMode === "dm" ? dmMessages : channelMessages;
  const q = search.trim().toLowerCase();
  const matchIds = q
    ? searchPool.filter((m: any) => (m.content || "").toLowerCase().includes(q)).map((m: any) => m.id)
    : [];
  const activeMatchId = matchIds.length > 0 ? matchIds[matchIdx % matchIds.length] : null;

  const runSearch = (v: string) => { setSearch(v); setMatchIdx(0); };
  const stepMatch = (dir: 1 | -1) => {
    if (matchIds.length === 0) return;
    setMatchIdx((i) => (i + dir + matchIds.length) % matchIds.length);
  };

  // Ao trocar de conversa/canal, limpa a busca
  useEffect(() => { setSearch(""); setMatchIdx(0); }, [selectedDM, selectedChannel, viewMode]);

  // Rola até o resultado ativo
  useEffect(() => {
    if (activeMatchId) {
      const t = setTimeout(() => scrollToMsg(activeMatchId), 50);
      return () => clearTimeout(t);
    }
  }, [activeMatchId]);

  const highlight = (text: string) => {
    if (!q) return text;
    const out: React.ReactNode[] = [];
    const lower = text.toLowerCase();
    let i = 0, k = 0;
    while (true) {
      const j = lower.indexOf(q, i);
      if (j < 0) { out.push(text.slice(i)); break; }
      if (j > i) out.push(text.slice(i, j));
      out.push(<mark key={k++} className="bg-[#F0B132] text-black rounded-sm px-0.5">{text.slice(j, j + q.length)}</mark>);
      i = j + q.length;
    }
    return out;
  };

  const searchBox = (placeholder: string) => (
    <div className="relative hidden md:block">
      <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
      <input
        value={search}
        onChange={(e) => runSearch(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") stepMatch(e.shiftKey ? -1 : 1); if (e.key === "Escape") runSearch(""); }}
        placeholder={placeholder}
        className="bg-[#2B2D31] rounded pl-7 pr-14 py-1 text-sm w-44 focus:outline-none focus:ring-1 focus:ring-[#5865F2] placeholder:text-zinc-500 text-zinc-200"
      />
      {q && (
        <span className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[11px] text-zinc-400">
          {matchIds.length > 0 ? `${(matchIdx % matchIds.length) + 1}/${matchIds.length}` : "0"}
          <button onClick={() => stepMatch(-1)} className="p-0.5 hover:bg-[#35373C] rounded" title="Anterior (Shift+Enter)"><ChevronUp className="w-3.5 h-3.5" /></button>
          <button onClick={() => stepMatch(1)} className="p-0.5 hover:bg-[#35373C] rounded" title="Próximo (Enter)"><ChevronDown className="w-3.5 h-3.5" /></button>
          <button onClick={() => runSearch("")} className="p-0.5 hover:bg-[#35373C] rounded" title="Limpar (Esc)"><X className="w-3.5 h-3.5" /></button>
        </span>
      )}
    </div>
  );

  const quoteBlock = (user: string | null | undefined, content: string | null | undefined, targetId: string | null | undefined) => {
    if (!user && !content) return null;
    return (
      <button
        onClick={() => scrollToMsg(targetId)}
        title="Ir para a mensagem original"
        className="mb-1 flex items-stretch gap-2 text-left bg-[#2B2D31]/70 hover:bg-[#2B2D31] rounded px-2 py-1 max-w-full transition-colors"
      >
        <span className="w-1 rounded-full bg-[#5865F2] shrink-0" />
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-[#B5BAC1] truncate">{user || "mensagem"}</span>
          <span className="block text-xs text-zinc-400 truncate">{content || "(apagada)"}</span>
        </span>
      </button>
    );
  };

  const replyPreview = (
    target: ReplyTarget | null,
    clear: () => void,
  ) => {    if (!target) return null;
    return (
      <div className="mb-2 flex items-stretch gap-2 bg-[#2B2D31] rounded px-2 py-1.5">
        <span className="w-1 rounded-full bg-[#5865F2] shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-xs text-zinc-400">Respondendo a <span className="font-semibold text-zinc-200">{target.user}</span></span>
          <span className="block text-xs text-zinc-500 truncate">{target.content}</span>
        </span>
        <button onClick={clear} className="p-1 hover:bg-[#35373C] rounded self-start" title="Cancelar resposta"><X className="w-4 h-4 text-zinc-400" /></button>
      </div>
    );
  };

  const attachmentBlock = (url: string | null | undefined, name: string | null | undefined, type: string | null | undefined) => {
    if (!url) return null;
    const kind = (type || "").toLowerCase();
    const isImage = kind.startsWith("image/");
    const isAudio = kind.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|opus|flac|aac)$/i.test(name || "");
    if (isImage) {
      return (
        <a href={url} target="_blank" rel="noreferrer" className="mt-1 block max-w-sm">
          <img src={url} alt={name || "anexo"} className="max-h-64 rounded-lg object-cover border border-[#4A4D53] hover:brightness-110 transition" />
        </a>
      );
    }
    if (isAudio) {
      return (
        <div className="mt-1 max-w-sm rounded-lg border border-[#4A4D53] bg-[#2B2D31] px-3 py-2">
          <div className="mb-1 truncate text-xs text-zinc-300">{name || "áudio"}</div>
          <audio controls preload="metadata" src={url} className="w-full min-w-60" />
        </div>
      );
    }
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 bg-[#2B2D31] hover:bg-[#35373C] border border-[#4A4D53] rounded-lg px-3 py-2 max-w-sm transition-colors">
        <FileText className="w-5 h-5 text-zinc-400 shrink-0" />
        <span className="flex-1 min-w-0 text-sm text-zinc-200 truncate">{name || "arquivo"}</span>
        <Download className="w-4 h-4 text-zinc-400 shrink-0" />
      </a>
    );
  };

  const pendingPreview = (
    pending: PendingFile | null,
    isUploading: boolean,
    clear: () => void,
  ) => {
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
          <FileText className="w-6 h-6 text-zinc-400 shrink-0" />
        )}
        <span className="text-xs text-zinc-300 truncate max-w-48">{pending.name}</span>
        <button onClick={clear} className="p-1 hover:bg-[#35373C] rounded shrink-0" title="Remover anexo"><X className="w-4 h-4 text-zinc-400" /></button>
      </div>
    );
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dmFileInputRef = useRef<HTMLInputElement>(null);
  const channelInputRef = useRef<HTMLInputElement>(null);
  const dmInputRef = useRef<HTMLInputElement>(null);

  // Scroll inteligente: topo carrega histórico (preserva posição),
  // novas mensagens descem sozinhas só se já estou no fim
  const listRef = useRef<HTMLDivElement>(null);
  const dmListRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const dmNearBottom = useRef(true);
  const holding = useRef(false);
  const prevLastId = useRef<string | null>(null);
  const prevDmLastId = useRef<string | null>(null);

  const trackScroll = (
    el: HTMLDivElement | null,
    nearRef: React.MutableRefObject<boolean>,
    holdRef: React.MutableRefObject<boolean>,
    hasMoreFlag: boolean,
    loadingFlag: boolean,
    load: () => Promise<number>,
  ) => {
    if (!el || holdRef.current || loadingFlag) return;
    nearRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (el.scrollTop < 200 && hasMoreFlag) {
      holdRef.current = true;
      const h0 = el.scrollHeight;
      load().then(() => {
        requestAnimationFrame(() => {
          const e2 = el;
          if (e2) e2.scrollTop = e2.scrollHeight - h0;
          holdRef.current = false;
        });
      }).catch(() => { holdRef.current = false; });
    }
  };

  useEffect(() => {
    const last = channelMessages[channelMessages.length - 1]?.id || null;
    const changed = last !== prevLastId.current;
    prevLastId.current = last;
    if (!changed || holding.current) return;
    if (nearBottom.current) {
      const el = listRef.current;
      if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
  }, [channelMessages]);

  useEffect(() => {
    const last = dmMessages[dmMessages.length - 1]?.id || null;
    const changed = last !== prevDmLastId.current;
    prevDmLastId.current = last;
    if (!changed || holding.current) return;
    if (dmNearBottom.current) {
      const el = dmListRef.current;
      if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
  }, [dmMessages]);

  // Troca de conversa: volta pro fim
  useEffect(() => {
    nearBottom.current = true;
    prevLastId.current = null;
    const el = listRef.current;
    if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [selectedChannel]);
  useEffect(() => {
    dmNearBottom.current = true;
    prevDmLastId.current = null;
    const el = dmListRef.current;
    if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [selectedDM]);

  // Autocomplete de @menções no fim do texto
  const mentionBox = (
    value: string,
    candidates: { id: string; username: string; avatar?: string }[],
    apply: (v: string) => void,
    focusRef: RefObject<HTMLInputElement | null>,
  ) => {
    const m = value.match(/@([A-Za-z0-9_.-]*)$/);
    if (!m) return null;
    const frag = m[1].toLowerCase();
    const list = candidates
      .filter((c) => c.username.toLowerCase().includes(frag) && c.id !== userId)
      .slice(0, 5);
    if (list.length === 0) return null;
    return (
      <div className="mb-2 w-64 bg-[#2B2D31] border border-[#4A4D53] rounded-lg shadow-xl overflow-hidden">
        {list.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              apply(value.slice(0, value.length - m[0].length) + `@${c.username} `);
              setTimeout(() => focusRef.current?.focus(), 0);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#35373C] text-left"
          >
            <Avatar src={c.avatar} name={c.username} className="w-6 h-6 rounded-full bg-[#5865F2] text-xs" />
            <span className="text-sm text-zinc-200 truncate">{c.username}</span>
          </button>
        ))}
      </div>
    );
  };

  const mentionize = (text: string) => {
    const parts = text.split(/(@[A-Za-z0-9_.-]+)/g);
    if (parts.length === 1) return text;
    return parts.map((p, i) =>
      /^@[A-Za-z0-9_.-]+$/.test(p)
        ? <span key={i} className="bg-[#5865F2]/40 text-white rounded px-0.5">{p}</span>
        : <span key={i}>{p}</span>
    );
  };

  const typingBar = (users: TypingUser[]) => {
    if (users.length === 0) return <div className="h-5" />;
    const names = users.slice(0, 3).map((u) => u.username);
    const label =
      users.length === 1
        ? `${names[0]} está digitando`
        : users.length <= 3
          ? `${names.join(", ")} estão digitando`
          : `${names.join(", ")} e mais ${users.length - 3} estão digitando`;
    return (
      <div className="h-5 flex items-center gap-1.5 text-xs text-zinc-400 px-1">
        <span className="flex gap-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </span>
        <span className="truncate">{label}...</span>
      </div>
    );
  };

  // Feed cronológico: mensagens + enquetes intercaladas
  const feed: ({ kind: "msg"; at: string; msg: Message } | { kind: "poll"; at: string; poll: Poll })[] = [
    ...channelMessages.map((msg) => ({ kind: "msg" as const, at: msg.created_at || "", msg })),
    ...polls.map((poll) => ({ kind: "poll" as const, at: poll.created_at, poll })),
  ].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

  const renderPoll = (poll: Poll) => {
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
          <button onClick={() => setVotersOf(votersOf === poll.id ? null : poll.id)} className="text-[12px] text-[#8B9DFF] hover:underline">
            {votersOf === poll.id ? "Ocultar votos" : "Ver votos"}
          </button>
          <span className="ml-auto text-[10px] text-zinc-600">{time}</span>
          {(poll.user_id === userId || isOwner) && (
            <button onClick={() => onDeletePoll(poll.id)} className="text-[10px] text-zinc-600 hover:text-red-400 hover:underline">apagar</button>
          )}
        </div>
        {votersOf === poll.id && (
          <div className="mt-1.5 space-y-1 border-t border-white/10 pt-1.5">
            {poll.options.map((o) => (
              <div key={o.id}>
                <div className="text-[11px] font-semibold text-zinc-400">{o.label} ({o.votes})</div>
                {o.voters.length === 0 ? (
                  <div className="text-[11px] text-zinc-600">sem votos</div>
                ) : (
                  o.voters.map((v) => (
                    <div key={v.id} className="flex items-center gap-1.5 py-0.5">
                      <Avatar src={v.avatar} name={v.username} className="w-4 h-4 rounded-full text-[8px]" />
                      <span className="text-[11px] text-zinc-300 truncate">{v.username}</span>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderChannelMessage = (msg: Message) => (
    <div key={msg.id} id={`msg-${msg.id}`} className={`group flex gap-3 px-2 py-1 hover:bg-[#2E3035] rounded scroll-mt-20 ${msg.mentions?.includes(userId || "") ? "bg-[#5865F2]/10 border-l-2 border-[#5865F2]" : ""}`}>
      <button onClick={() => msg.user_id && onViewProfile(msg.user_id)} className="shrink-0 mt-1 rounded-full" title="Ver perfil">
        <span className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: `${msg.color}33` }}><Avatar src={msg.avatar} name={msg.user} className="w-10 h-10 rounded-full text-lg" /></span>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap"><button onClick={() => msg.user_id && onViewProfile(msg.user_id)} className="font-medium hover:underline" style={{ color: msg.color }}>{msg.user}</button><span className="text-xs text-zinc-400">{msg.timestamp}</span>{pinnedIds.has(msg.id) && <span title="Mensagem fixada"><Pin className="w-3 h-3 text-[#F0B132]" /></span>}</div>
        {quoteBlock(msg.reply_user, msg.reply_content, msg.reply_to)}
        {editingId === msg.id ? editBox(onEditMessage) : <p className="text-[15px] leading-5 text-[#DBDEE1] break-words whitespace-pre-wrap">{q ? highlight(msg.content) : mentionize(msg.content)}</p>}
        {editingId !== msg.id && attachmentBlock(msg.file_url, msg.file_name, msg.file_type)}
        {editingId !== msg.id && reactionBar(reactions[msg.id], (e) => onToggleReaction(msg.id, e))}
        {pickFor === msg.id && emojiPicker(msg.id, onToggleReaction)}
      </div>
      {editingId !== msg.id && (
        <div className="hidden group-hover:flex items-center gap-1 self-start bg-[#313338] border border-[#3F4147] rounded-lg p-1 shadow-lg">
          <button onClick={() => { setReplyTo({ id: msg.id, user: msg.user, content: msg.content }); setPickFor(null); }} title="Responder"><Reply className="w-4 h-4 text-zinc-400 hover:text-white" /></button>
          <button onClick={() => setPickFor(pickFor === msg.id ? null : msg.id)} title="Reagir"><Smile className="w-4 h-4 text-zinc-400 hover:text-yellow-300" /></button>
          {canPinMsg(msg.user_id) && (
            <button onClick={() => onTogglePin(msg.id)} title={pinnedIds.has(msg.id) ? "Desafixar" : "Fixar"}><Pin className={`w-4 h-4 ${pinnedIds.has(msg.id) ? "text-[#F0B132]" : "text-zinc-400 hover:text-white"}`} /></button>
          )}
          {msg.user_id && msg.user_id === userId ? (
            <>
              <button onClick={() => startEdit(msg.id, msg.content)} title="Editar"><Pencil className="w-4 h-4 text-zinc-400 hover:text-white" /></button>
              <button onClick={() => onDeleteMessage(msg.id)} title="Excluir"><Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" /></button>
            </>
          ) : isOwner ? (
            <button onClick={() => onDeleteMessage(msg.id)} title="Excluir (moderação do dono)"><Trash2 className="w-4 h-4 text-amber-400 hover:text-red-400" /></button>
          ) : null}
          <MoreHorizontal className="w-4 h-4" />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-[#313338] min-w-0">
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
              <Phone className="w-5 h-5" /><Video className="w-5 h-5" />
              {searchBox("Buscar na DM")}
            </div>
          </div>
          <div
            ref={dmListRef}
            onScroll={(e) => trackScroll(e.currentTarget, dmNearBottom, holding, dmHasMore, dmLoadingOlder, onLoadOlderDM)}
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
                <div key={m.id} id={`msg-${m.id}`} className={`group flex gap-3 px-2 py-1 hover:bg-[#2E3035] rounded scroll-mt-20 ${m.mentions?.includes(userId || "") ? "bg-[#5865F2]/10 border-l-2 border-[#5865F2]" : ""}`}>
                  <button onClick={() => onViewProfile(m.sender_id)} className="shrink-0 mt-0.5" title="Ver perfil">
                    <Avatar src={m.sender_id === userId ? (userAvatar || "😎") : (dmConversations.find((d) => d.id === selectedDM)?.participants.find((p) => p.id === m.sender_id)?.avatar || "👤")} name={m.username} className="w-8 h-8 rounded-full bg-[#5865F2] text-sm" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2"><button onClick={() => onViewProfile(m.sender_id)} className="font-medium text-sm hover:underline" style={{ color: m.sender_id === userId ? "#5865F2" : "#FEE75C" }}>{m.username}</button><span className="text-xs text-zinc-500">{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></div>
                    {quoteBlock(m.reply_user, m.reply_content, m.reply_to)}
                    {editingId === m.id ? editBox(onEditDM) : <p className="text-[15px] text-[#DBDEE1] break-words">{q ? highlight(m.content) : mentionize(m.content)}</p>}
                    {editingId !== m.id && attachmentBlock(m.file_url, m.file_name, m.file_type)}
                    {editingId !== m.id && reactionBar(dmReactions[m.id], (e) => onToggleDMReaction(m.id, e))}
                    {pickFor === m.id && emojiPicker(m.id, onToggleDMReaction)}
                  </div>
                  {editingId !== m.id && (
                    <div className="hidden group-hover:flex items-center gap-1 self-start bg-[#313338] border border-[#3F4147] rounded-lg p-1 shadow-lg">
                      <button onClick={() => { setDmReplyTo({ id: m.id, user: m.username, content: m.content }); setPickFor(null); }} title="Responder"><Reply className="w-4 h-4 text-zinc-400 hover:text-white" /></button>
                      <button onClick={() => setPickFor(pickFor === m.id ? null : m.id)} title="Reagir"><Smile className="w-4 h-4 text-zinc-400 hover:text-yellow-300" /></button>
                      {m.sender_id === userId && (
                        <>
                          <button onClick={() => startEdit(m.id, m.content)} title="Editar"><Pencil className="w-4 h-4 text-zinc-400 hover:text-white" /></button>
                          <button onClick={() => onDeleteDM(m.id)} title="Excluir"><Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" /></button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          {selectedDM && (
            <div className="px-4 pt-1 shrink-0">
              {typingBar(typingDM)}
            </div>
          )}
          {selectedDM && (
            <div className="p-4 pt-1 shrink-0">
              {replyPreview(dmReplyTo, () => setDmReplyTo(null))}
              {pendingPreview(pendingDmFile, uploadingDm, onClearDmFile)}
              {mentionBox(dmInput, dmMentionCandidates, setDmInput, dmInputRef)}
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
                <Phone className="w-5 h-5 hidden md:block" /><Video className="w-5 h-5 hidden md:block" /><button onClick={onOpenPins} title="Ver fixados"><Pin className="w-5 h-5 hidden md:block hover:text-white" /></button><button onClick={onInvite} title="Convidar amigos"><UserPlus className="w-5 h-5 hover:text-white" /></button>
                {searchBox("Buscar")}
                <Inbox className="w-5 h-5" /><HelpCircle className="w-5 h-5" />
              </div>
          </div>
          <div
            ref={listRef}
            onScroll={(e) => trackScroll(e.currentTarget, nearBottom, holding, hasMore, loadingOlder, onLoadOlder)}
            className="flex-1 overflow-y-auto p-4 space-y-1 flex flex-col"
          >
            {loadingOlder && <p className="text-center text-xs text-zinc-500 py-2">Carregando mais...</p>}
            {currentChannel?.type === "voice" ? (
              <VoiceChannel channelId={selectedChannel} username={username} status={status} />
            ) : (
              <>
                <div className="py-8 border-b border-[#3F4147] mb-4">
                  <div className="w-16 h-16 rounded-full bg-[#41434A] flex items-center justify-center text-3xl mb-3"><Hash className="w-8 h-8" /></div>
                  <h1 className="text-3xl font-bold">Bem-vindo(a) ao #{currentChannel?.name}!</h1>
                  <p className="text-zinc-400 mt-2">Mensagens agora são salvas no Supabase e aparecem em tempo real para todos.</p>
                  {channelMessages.length === 0 && <p className="text-sm text-zinc-500 mt-2">Nenhuma mensagem ainda. Seja o primeiro a enviar!</p>}
                </div>
                {feed.map((item) =>
                  item.kind === "poll" ? renderPoll(item.poll) : renderChannelMessage(item.msg)
                )}
              </>
            )}
          </div>
          {currentChannel?.type === "text" && (
            <div className="px-4 pt-1 shrink-0">
              {typingBar(typingChannel)}
            </div>
          )}
          {currentChannel?.type === "text" && (
            <div className="p-4 pt-1 shrink-0">
              {replyPreview(replyTo, () => setReplyTo(null))}
              {pendingPreview(pendingFile, uploading, onClearFile)}
              {mentionBox(input, mentionCandidates, setInput, channelInputRef)}
              <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAttachFile(f); e.target.value = ""; }} />
              <div className="bg-[#383A40] rounded-lg flex items-center gap-2 px-3 py-2">
                <button onClick={() => fileInputRef.current?.click()} className="w-7 h-7 rounded-full bg-zinc-500 flex items-center justify-center hover:bg-zinc-400 shrink-0" title="Anexar arquivo"><Plus className="w-4 h-4 text-[#383A40]" /></button>
                <button onClick={onOpenPollModal} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-zinc-500 shrink-0 text-zinc-400 hover:text-[#383A40]" title="Criar enquete"><BarChart3 className="w-4 h-4" /></button>
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
