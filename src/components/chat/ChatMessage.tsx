"use client";
import React, { useState } from "react";
import { X, Pencil, Trash2, Smile, Reply, Pin, MoreHorizontal, FileText, Download, Bookmark } from "lucide-react";
import type { Message, Reaction, ReactionMap, ReplyTarget } from "@/lib/chat-types";
import Avatar from "@/components/Avatar";
import { MarkdownText } from "@/lib/markdown";
import { LinkEmbed } from "@/components/LinkEmbed";
import { useLightbox } from "@/components/ImageLightbox";
import { extractUrls } from "@/lib/links";
import { QUICK_EMOJIS } from "@/lib/chat-types";

type ChatMessageProps = {
  msg: Message;
  userId?: string;
  isOwner: boolean;
  canModerateMessages?: boolean;
  pinnedIds: Set<string>;
  reactions: ReactionMap;
  editingId: string | null;
  pickFor: string | null;
  searchQuery: string;
  highlight: (text: string) => React.ReactNode;
  mentionize: (text: string) => React.ReactNode;
  canPinMsg: (userId?: string | null) => boolean;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onReply: (target: ReplyTarget) => void;
  onToggleReaction: (id: string, emoji: string) => void;
  onTogglePin: (id: string) => void;
  onBookmark: (id: string) => void;
  isBookmarked: boolean;
  onViewProfile: (id: string) => void;
  scrollToMsg: (id: string | null | undefined) => void;
  EditBox: React.FC<{ save: (id: string, content: string) => void }>;
  setPickFor: (id: string | null) => void;
  grouped?: boolean;
};

export function ReactionBar({ list, toggle }: { list: Reaction[] | undefined; toggle: (emoji: string) => void }) {
  if (!list || list.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {list.map((r) => (
        <button
          key={r.emoji}
          onClick={() => toggle(r.emoji)}
          title={r.mine ? "Remover minha reação" : "Reagir também"}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${r.mine ? "bg-accent/30 border-accent text-white" : "bg-surface border-border text-foreground hover:border-zinc-400"}`}
        >
          <span>{r.emoji}</span><span className="font-semibold">{r.count}</span>
        </button>
      ))}
    </div>
  );
}

export function EmojiPicker({ messageId, toggle, onClose }: { messageId: string; toggle: (id: string, emoji: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(0);

  const EMOJI_CATEGORIES = [
    { name: "Frequentes", emojis: ["😀", "😂", "😍", "🥺", "😎", "🤔", "👍", "👋", "🔥", "❤️", "💯", "✨", "🎉", "😭", "🤣", "😢", "🥳", "😴", "🤯", "💀"] },
    { name: "Sorrisos", emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🫢", "🤫", "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "🫥", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴"] },
    { name: "Gestos", emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "💪", "🦾"] },
    { name: "Natureza", emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🌸", "🌺", "🌻", "🌹", "🌷", "🌱", "🌿", "🍀", "🌵", "🌴", "🌳", "🍂", "🍁", "🍄"] },
    { name: "Comida", emojis: ["🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍒", "🍑", "🥝", "🍕", "🍔", "🍟", "🌭", "🍿", "🧁", "🍰", "🎂", "☕", "🍵", "🥤", "🍺", "🍷", "🥂"] },
    { name: "Atividades", emojis: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🎯", "🎮", "🎲", "🧩", "🎭", "🎨", "🎬", "🎤", "🎧", "🎵", "🎹", "🎸", "🎺", "🎻", "🥁", "🏆", "🥇", "🥈", "🥉"] },
    { name: "Objetos", emojis: ["⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "💾", "💿", "📷", "📸", "📹", "🎥", "📺", "📻", "🔋", "🔌", "💡", "🔦", "🔑", "🗝️", "🔒", "🔓", "📦", "📫", "✏️", "📝", "📁", "📂", "🗑️"] },
    { name: "Símbolos", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "✨", "⭐", "🌟", "💫", "🔥", "💥", "❄️", "🌈", "☀️", "🌙", "💤", "💬"] },
  ];

  const filteredEmojis = query
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis).filter((e) => e.includes(query))
    : EMOJI_CATEGORIES[selectedCategory].emojis;

  return (
    <div className="mt-1 bg-surface border border-border rounded-xl shadow-xl w-72 overflow-hidden" onClick={(e) => e.stopPropagation()}>
      {/* Search */}
      <div className="p-2 border-b border-border">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar emoji..."
          className="w-full bg-input-bg rounded-md px-3 py-1.5 text-sm outline-none text-foreground placeholder:text-zinc-400"
          autoFocus
        />
      </div>

      {/* Category tabs */}
      {!query && (
        <div className="flex gap-0.5 px-2 py-1 border-b border-border overflow-x-auto">
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(i)}
              className={`px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-colors ${selectedCategory === i ? "bg-accent/20 text-accent" : "text-zinc-400 hover:text-foreground"}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="p-2 grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
        {filteredEmojis.map((e, i) => (
          <button
            key={`${e}-${i}`}
            onClick={() => { toggle(messageId, e); onClose(); }}
            className="w-8 h-8 flex items-center justify-center text-xl hover:bg-surface-active rounded transition-colors"
          >
            {e}
          </button>
        ))}
      </div>

      {/* Quick row */}
      <div className="flex items-center justify-between px-2 py-1.5 border-t border-border bg-surface">
        <div className="flex gap-0.5">
          {QUICK_EMOJIS.slice(0, 6).map((e) => (
            <button key={e} onClick={() => { toggle(messageId, e); onClose(); }} className="text-lg hover:scale-125 transition-transform p-0.5">{e}</button>
          ))}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded"><X className="w-3.5 h-3.5 text-zinc-400" /></button>
      </div>
    </div>
  );
}

export function QuoteBlock({ user, content, targetId, scrollToMsg }: { user?: string | null; content?: string | null; targetId?: string | null; scrollToMsg: (id: string | null | undefined) => void }) {
  if (!user && !content) return null;
  return (
    <button
      onClick={() => scrollToMsg(targetId)}
      title="Ir para a mensagem original"
      className="mb-1 flex items-stretch gap-2 text-left bg-surface/70 hover:bg-surface rounded px-2 py-1 max-w-full transition-colors"
    >
      <span className="w-1 rounded-full bg-accent shrink-0" />
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-foreground truncate">{user || "mensagem"}</span>
        <span className="block text-xs text-zinc-400 truncate">{content || "(apagada)"}</span>
      </span>
    </button>
  );
}

export function ReplyPreview({ target, clear }: { target: ReplyTarget | null; clear: () => void }) {
  if (!target) return null;
  return (
    <div className="mb-2 flex items-stretch gap-2 bg-surface rounded px-2 py-1.5">
      <span className="w-1 rounded-full bg-accent shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-xs text-zinc-400">Respondendo a <span className="font-semibold text-foreground">{target.user}</span></span>
        <span className="block text-xs text-zinc-400 truncate">{target.content}</span>
      </span>
      <button onClick={clear} className="p-1 hover:bg-surface-hover rounded self-start" title="Cancelar resposta"><X className="w-4 h-4 text-zinc-400" /></button>
    </div>
  );
}

export function AttachmentBlock({ url, name, type }: { url?: string | null; name?: string | null; type?: string | null }) {
  const openLightbox = useLightbox((s) => s.open);
  if (!url) return null;
  const kind = (type || "").toLowerCase();
  const isImage = kind.startsWith("image/");
  const isAudio = kind.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|opus|flac|aac)$/i.test(name || "");
  if (isImage) {
    return (
      <button type="button" onClick={() => openLightbox([url], 0)} className="mt-1 block max-w-sm cursor-pointer">
        <img src={url} alt={name || "anexo"} className="max-h-64 rounded-lg object-cover border border-border hover:brightness-110 transition" />
      </button>
    );
  }
  if (isAudio) {
    return (
      <div className="mt-1 max-w-sm rounded-lg border border-border bg-surface px-3 py-2">
        <div className="mb-1 truncate text-xs text-foreground">{name || "áudio"}</div>
        <audio controls preload="metadata" src={url} className="w-full min-w-60" />
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 bg-surface hover:bg-surface-hover border border-border rounded-lg px-3 py-2 max-w-sm transition-colors">
      <FileText className="w-5 h-5 text-zinc-400 shrink-0" />
      <span className="flex-1 min-w-0 text-sm text-foreground truncate">{name || "arquivo"}</span>
      <Download className="w-4 h-4 text-zinc-400 shrink-0" />
    </a>
  );
}

export function TypingBar({ users }: { users: { id: string; username: string }[] }) {
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
}

export function MentionBox({ value, candidates, apply, focusRef, userId }: {
  value: string;
  candidates: { id: string; username: string; avatar?: string }[];
  apply: (v: string) => void;
  focusRef: React.RefObject<HTMLInputElement | null>;
  userId?: string;
}) {
  const m = value.match(/@([A-Za-z0-9_.-]*)$/);
  if (!m) return null;
  const frag = m[1].toLowerCase();
  const list = candidates
    .filter((c) => c.username.toLowerCase().includes(frag) && c.id !== userId)
    .slice(0, 5);
  if (list.length === 0) return null;
  return (
    <div className="mb-2 w-64 bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
      {list.map((c) => (
        <button
          key={c.id}
          onClick={() => {
            apply(value.slice(0, value.length - m[0].length) + `@${c.username} `);
            setTimeout(() => focusRef.current?.focus(), 0);
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-hover text-left"
        >
          <Avatar src={c.avatar} name={c.username} className="w-6 h-6 rounded-full bg-accent text-xs" />
          <span className="text-sm text-foreground truncate">{c.username}</span>
        </button>
      ))}
    </div>
  );
}

export function mentionize(text: string) {
  const parts = text.split(/(@[A-Za-z0-9_.-]+)/g);
  if (parts.length === 1) return text;
  return parts.map((p, i) =>
    /^@[A-Za-z0-9_.-]+$/.test(p)
      ? <span key={i} className="bg-accent/40 text-white rounded px-0.5">{p}</span>
      : <span key={i}>{p}</span>
  );
}

export const ChatMessage = React.memo(function ChatMessage({ msg, userId, isOwner, canModerateMessages, pinnedIds, reactions, editingId, pickFor, searchQuery, highlight, mentionize: mentionizeFn, canPinMsg, onEdit, onDelete, onReply, onToggleReaction, onTogglePin, onBookmark, isBookmarked, onViewProfile, scrollToMsg, EditBox, setPickFor, grouped }: ChatMessageProps) {
  const isWebhook = !!(msg as any).metadata?.webhook_id;
  const webhookName = (msg as any).metadata?.webhook_name;
  const displayName = isWebhook ? webhookName || msg.user : msg.user;
  const displayAvatar = (msg as any).metadata?.webhook_avatar || msg.avatar;
  const displayColor = isWebhook ? "var(--accent)" : msg.color;

  if (grouped) {
    return (
      <div key={msg.id} id={`msg-${msg.id}`} className={`group flex gap-3 px-2 py-0.5 hover:bg-surface-hover rounded scroll-mt-20 ${msg.mentions?.includes(userId || "") ? "bg-accent/10 border-l-2 border-accent" : ""}`}>
        <div className="w-10 shrink-0 flex items-center justify-center">
          <span className="text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">{msg.timestamp?.slice(0, 5)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <QuoteBlock user={msg.reply_user} content={msg.reply_content} targetId={msg.reply_to} scrollToMsg={scrollToMsg} />
          {editingId === msg.id ? <EditBox save={onEdit} /> : <p className="text-[15px] leading-5 text-foreground break-words whitespace-pre-wrap">{searchQuery ? highlight(msg.content) : <MarkdownText text={msg.content} mentionize={mentionizeFn} />}</p>}
          {editingId !== msg.id && !msg.file_url && extractUrls(msg.content).slice(0, 3).map((url) => <LinkEmbed key={url} url={url} />)}
          {editingId !== msg.id && <AttachmentBlock url={msg.file_url} name={msg.file_name} type={msg.file_type} />}
          {editingId !== msg.id && <ReactionBar list={reactions[msg.id]} toggle={(e) => onToggleReaction(msg.id, e)} />}
          {pickFor === msg.id && <EmojiPicker messageId={msg.id} toggle={onToggleReaction} onClose={() => setPickFor(null)} />}
        </div>
        {editingId !== msg.id && (
          <div className="hidden group-hover:flex items-center gap-1 self-start bg-background border border-border rounded-lg p-1 shadow-lg">
            <button onClick={() => { onReply({ id: msg.id, user: msg.user, content: msg.content }); setPickFor(null); }} title="Responder"><Reply className="w-4 h-4 text-zinc-400 hover:text-foreground" /></button>
            <button onClick={() => setPickFor(pickFor === msg.id ? null : msg.id)} title="Reagir"><Smile className="w-4 h-4 text-zinc-400 hover:text-yellow-300" /></button>
            {canPinMsg(msg.user_id) && (
              <button onClick={() => onTogglePin(msg.id)} title={pinnedIds.has(msg.id) ? "Desafixar" : "Fixar"}><Pin className={`w-4 h-4 ${pinnedIds.has(msg.id) ? "text-[#F0B132]" : "text-zinc-400 hover:text-foreground"}`} /></button>
            )}
            <button onClick={() => onBookmark(msg.id)} title={isBookmarked ? "Desfavoritar" : "Favoritar"}><Bookmark className={`w-4 h-4 ${isBookmarked ? "text-yellow-400" : "text-zinc-400 hover:text-yellow-300"}`} /></button>
            {msg.user_id && msg.user_id === userId ? (
              <>
                <button onClick={() => onEdit(msg.id, msg.content)} title="Editar"><Pencil className="w-4 h-4 text-zinc-400 hover:text-foreground" /></button>
                <button onClick={() => onDelete(msg.id)} title="Excluir"><Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" /></button>
              </>
            ) : (isOwner || canModerateMessages) ? (
              <>
                <button onClick={() => onEdit(msg.id, msg.content)} title="Editar (moderação)"><Pencil className="w-4 h-4 text-amber-400 hover:text-foreground" /></button>
                <button onClick={() => onDelete(msg.id)} title="Excluir (moderação)"><Trash2 className="w-4 h-4 text-amber-400 hover:text-red-400" /></button>
              </>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <div key={msg.id} id={`msg-${msg.id}`} className={`group flex gap-3 px-2 py-1 hover:bg-surface-hover rounded scroll-mt-20 ${msg.mentions?.includes(userId || "") ? "bg-accent/10 border-l-2 border-accent" : ""}`}>
      <button onClick={() => msg.user_id && onViewProfile(msg.user_id)} className="shrink-0 mt-1 rounded-full" title="Ver perfil">
        <span className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: `${displayColor}33` }}><Avatar src={displayAvatar} name={displayName} className="w-10 h-10 rounded-full text-lg" /></span>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <button onClick={() => msg.user_id && onViewProfile(msg.user_id)} className="font-medium hover:underline" style={{ color: displayColor }}>{displayName}</button>
          {isWebhook && <span className="text-[10px] px-1 py-0.5 rounded bg-accent text-white font-medium leading-none">BOT</span>}
          <span className="text-xs text-zinc-400">{msg.timestamp}</span>
          {(msg as any).edited_at && <span className="text-[10px] text-zinc-400">(editado)</span>}
          {pinnedIds.has(msg.id) && <span title="Mensagem fixada"><Pin className="w-3 h-3 text-[#F0B132]" /></span>}
        </div>
        <QuoteBlock user={msg.reply_user} content={msg.reply_content} targetId={msg.reply_to} scrollToMsg={scrollToMsg} />
        {editingId === msg.id ? <EditBox save={onEdit} /> : <p className="text-[15px] leading-5 text-foreground break-words whitespace-pre-wrap">{searchQuery ? highlight(msg.content) : <MarkdownText text={msg.content} mentionize={mentionizeFn} />}</p>}
        {editingId !== msg.id && !msg.file_url && extractUrls(msg.content).slice(0, 3).map((url) => <LinkEmbed key={url} url={url} />)}
        {editingId !== msg.id && <AttachmentBlock url={msg.file_url} name={msg.file_name} type={msg.file_type} />}
        {editingId !== msg.id && <ReactionBar list={reactions[msg.id]} toggle={(e) => onToggleReaction(msg.id, e)} />}
        {pickFor === msg.id && <EmojiPicker messageId={msg.id} toggle={onToggleReaction} onClose={() => setPickFor(null)} />}
      </div>
      {editingId !== msg.id && (
        <div className="hidden group-hover:flex items-center gap-1 self-start bg-background border border-border rounded-lg p-1 shadow-lg">
          <button onClick={() => { onReply({ id: msg.id, user: msg.user, content: msg.content }); setPickFor(null); }} title="Responder"><Reply className="w-4 h-4 text-zinc-400 hover:text-foreground" /></button>
          <button onClick={() => setPickFor(pickFor === msg.id ? null : msg.id)} title="Reagir"><Smile className="w-4 h-4 text-zinc-400 hover:text-yellow-300" /></button>
          {canPinMsg(msg.user_id) && (
            <button onClick={() => onTogglePin(msg.id)} title={pinnedIds.has(msg.id) ? "Desafixar" : "Fixar"}><Pin className={`w-4 h-4 ${pinnedIds.has(msg.id) ? "text-[#F0B132]" : "text-zinc-400 hover:text-foreground"}`} /></button>
          )}
          <button onClick={() => onBookmark(msg.id)} title={isBookmarked ? "Desfavoritar" : "Favoritar"}><Bookmark className={`w-4 h-4 ${isBookmarked ? "text-yellow-400" : "text-zinc-400 hover:text-yellow-300"}`} /></button>
          {msg.user_id && msg.user_id === userId ? (
            <>
              <button onClick={() => onEdit(msg.id, msg.content)} title="Editar"><Pencil className="w-4 h-4 text-zinc-400 hover:text-foreground" /></button>
              <button onClick={() => onDelete(msg.id)} title="Excluir"><Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" /></button>
            </>
          ) : (isOwner || canModerateMessages) ? (
            <>
              <button onClick={() => onEdit(msg.id, msg.content)} title="Editar (moderação)"><Pencil className="w-4 h-4 text-amber-400 hover:text-foreground" /></button>
              <button onClick={() => onDelete(msg.id)} title="Excluir (moderação)"><Trash2 className="w-4 h-4 text-amber-400 hover:text-red-400" /></button>
            </>
          ) : null}
          <MoreHorizontal className="w-4 h-4" />
        </div>
      )}
    </div>
  );
});
