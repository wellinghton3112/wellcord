"use client";
import { useState } from "react";
import type { RefObject } from "react";
import {
  Hash, Send, Smile, Gift, Sticker, Phone, Video, Pin, UserPlus, Menu,
  Search, Inbox, HelpCircle, Plus, MoreHorizontal, Pencil, Trash2, X, Reply,
} from "lucide-react";
import type { Channel, DMConversation, DMMessage, Message, PresenceUser, ReactionMap, ReplyTarget } from "@/lib/chat-types";
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
  dmEndRef: RefObject<HTMLDivElement | null>;
  onlineMembers: PresenceUser[];
  userId?: string;
  // Servidor
  currentChannel?: Channel;
  selectedChannel: string;
  channelMessages: Message[];
  messagesEndRef: RefObject<HTMLDivElement | null>;
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
};

// Área principal de chat (DM ou canal). Extraído de page.tsx sem mudança visual.
export default function ChatArea(props: Props) {
  const {
    viewMode, setShowMobileSidebar,
    dmConversations, selectedDM, dmMessages, dmInput, setDmInput, handleDMSend, dmEndRef, onlineMembers, userId,
    currentChannel, selectedChannel, channelMessages, messagesEndRef, input, setInput, handleSend, username, status,
    onEditMessage, onDeleteMessage, onEditDM, onDeleteDM, onInvite,
    reactions, onToggleReaction, dmReactions, onToggleDMReaction,
    replyTo, setReplyTo, dmReplyTo, setDmReplyTo,
  } = props;
  const dmOther = dmConversations.find((d) => d.id === selectedDM)?.otherUser;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [pickFor, setPickFor] = useState<string | null>(null);

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
  ) => {
    if (!target) return null;
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

  return (
    <div className="flex-1 flex flex-col bg-[#313338] min-w-0">
      {viewMode === "dm" ? (
        <>
          <div className="h-12 flex items-center px-4 gap-3 border-b border-[#1F2124] shadow-sm shrink-0">
            <button onClick={() => setShowMobileSidebar(true)} className="lg:hidden p-2 -ml-2 bg-[#2B2D31] hover:bg-[#404249] rounded-lg"><Menu className="w-5 h-5" /></button>
            {selectedDM ? (
              <>
                <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-sm">{dmOther?.avatar || "👤"}</div>
                <span className="font-bold">{dmOther?.username || "DM"}</span>
                <span className={`w-2 h-2 rounded-full ${onlineMembers.some((m) => m.id === dmOther?.id) ? "bg-[#23A559]" : "bg-zinc-500"}`} />
              </>
            ) : (
              <span className="font-bold text-zinc-400">Selecione uma conversa</span>
            )}
            <div className="ml-auto flex items-center gap-3 text-zinc-400">
              <Phone className="w-5 h-5" /><Video className="w-5 h-5" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
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
                <div key={m.id} id={`msg-${m.id}`} className="group flex gap-3 px-2 py-1 hover:bg-[#2E3035] rounded scroll-mt-20">
                  <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-sm shrink-0">{m.sender_id === userId ? "😎" : "👤"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2"><span className="font-medium text-sm" style={{ color: m.sender_id === userId ? "#5865F2" : "#FEE75C" }}>{m.username}</span><span className="text-xs text-zinc-500">{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></div>
                    {quoteBlock(m.reply_user, m.reply_content, m.reply_to)}
                    {editingId === m.id ? editBox(onEditDM) : <p className="text-[15px] text-[#DBDEE1] break-words">{m.content}</p>}
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
            <div ref={dmEndRef} />
          </div>
          {selectedDM && (
            <div className="p-4 shrink-0">
              {replyPreview(dmReplyTo, () => setDmReplyTo(null))}
              <div className="bg-[#383A40] rounded-lg flex items-center gap-2 px-3 py-2">
                <input value={dmInput} onChange={(e) => setDmInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleDMSend()} placeholder={`Mensagem para @${dmOther?.username || ""}`} className="flex-1 bg-transparent outline-none placeholder:text-zinc-400 text-[15px] min-w-0" />
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
              <Phone className="w-5 h-5 hidden md:block" /><Video className="w-5 h-5 hidden md:block" /><Pin className="w-5 h-5 hidden md:block" /><button onClick={onInvite} title="Convidar amigos"><UserPlus className="w-5 h-5 hover:text-white" /></button>
              <div className="relative hidden md:block"><Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2" /><input placeholder="Buscar" className="bg-[#2B2D31] rounded pl-7 pr-2 py-1 text-sm w-36 focus:outline-none placeholder:text-zinc-500" /></div>
              <Inbox className="w-5 h-5" /><HelpCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1 flex flex-col">
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
                {channelMessages.map((msg) => (
                  <div key={msg.id} id={`msg-${msg.id}`} className="group flex gap-3 px-2 py-1 hover:bg-[#2E3035] rounded scroll-mt-20">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 mt-1" style={{ background: `${msg.color}33` }}>{msg.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap"><span className="font-medium cursor-pointer" style={{ color: msg.color }}>{msg.user}</span><span className="text-xs text-zinc-400">{msg.timestamp}</span></div>
                      {quoteBlock(msg.reply_user, msg.reply_content, msg.reply_to)}
                      {editingId === msg.id ? editBox(onEditMessage) : <p className="text-[15px] leading-5 text-[#DBDEE1] break-words whitespace-pre-wrap">{msg.content}</p>}
                      {editingId !== msg.id && reactionBar(reactions[msg.id], (e) => onToggleReaction(msg.id, e))}
                      {pickFor === msg.id && emojiPicker(msg.id, onToggleReaction)}
                    </div>
                    {editingId !== msg.id && (
                      <div className="hidden group-hover:flex items-center gap-1 self-start bg-[#313338] border border-[#3F4147] rounded-lg p-1 shadow-lg">
                        <button onClick={() => { setReplyTo({ id: msg.id, user: msg.user, content: msg.content }); setPickFor(null); }} title="Responder"><Reply className="w-4 h-4 text-zinc-400 hover:text-white" /></button>
                        <button onClick={() => setPickFor(pickFor === msg.id ? null : msg.id)} title="Reagir"><Smile className="w-4 h-4 text-zinc-400 hover:text-yellow-300" /></button>
                        {msg.user_id && msg.user_id === userId ? (
                          <>
                            <button onClick={() => startEdit(msg.id, msg.content)} title="Editar"><Pencil className="w-4 h-4 text-zinc-400 hover:text-white" /></button>
                            <button onClick={() => onDeleteMessage(msg.id)} title="Excluir"><Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" /></button>
                          </>
                        ) : null}
                        <MoreHorizontal className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
          {currentChannel?.type === "text" && (
            <div className="p-4 shrink-0">
              {replyPreview(replyTo, () => setReplyTo(null))}
              <div className="bg-[#383A40] rounded-lg flex items-center gap-2 px-3 py-2">
                <button className="w-7 h-7 rounded-full bg-zinc-500 flex items-center justify-center hover:bg-zinc-400 shrink-0"><Plus className="w-4 h-4 text-[#383A40]" /></button>
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder={`Conversar em #${currentChannel?.name}`} className="flex-1 bg-transparent outline-none placeholder:text-zinc-400 text-[15px] min-w-0" />
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
