"use client";
import React from "react";
import { Pencil, Trash2, Smile, Reply } from "lucide-react";
import type { DMMessage, ReactionMap, ReplyTarget } from "@/lib/chat-types";
import Avatar from "@/components/Avatar";
import { LinkEmbed } from "@/components/LinkEmbed";
import { extractUrls } from "@/lib/links";
import { MarkdownText } from "@/lib/markdown";
import { ReactionBar, EmojiPicker, QuoteBlock, AttachmentBlock, mentionize } from "./ChatMessage";

type ChatDMMessageProps = {
  msg: DMMessage;
  userId?: string;
  userAvatar?: string;
  selectedDM: string | null;
  dmConversations: { id: string; participants: { id: string; username: string; avatar: string }[] }[];
  dmReactions: ReactionMap;
  editingId: string | null;
  pickFor: string | null;
  searchQuery: string;
  highlight: (text: string) => React.ReactNode;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onReply: (target: ReplyTarget) => void;
  onToggleReaction: (id: string, emoji: string) => void;
  onViewProfile: (id: string) => void;
  scrollToMsg: (id: string | null | undefined) => void;
  EditBox: React.FC<{ save: (id: string, content: string) => void }>;
  setPickFor: (id: string | null) => void;
};

export const ChatDMMessage = React.memo(function ChatDMMessage({ msg, userId, userAvatar, selectedDM, dmConversations, dmReactions, editingId, pickFor, searchQuery, highlight, onEdit, onDelete, onReply, onToggleReaction, onViewProfile, scrollToMsg, EditBox, setPickFor }: ChatDMMessageProps) {
  const isMine = msg.sender_id === userId;
  const otherAvatar = dmConversations.find((d) => d.id === selectedDM)?.participants.find((p) => p.id === msg.sender_id)?.avatar || "👤";

  return (
    <div key={msg.id} id={`msg-${msg.id}`} className={`group flex gap-3 px-2 py-1 hover:bg-[#2E3035] rounded scroll-mt-20 ${msg.mentions?.includes(userId || "") ? "bg-accent/10 border-l-2 border-accent" : ""}`}>
      <button onClick={() => onViewProfile(msg.sender_id)} className="shrink-0 mt-0.5" title="Ver perfil">
        <Avatar src={isMine ? (userAvatar || "😎") : otherAvatar} name={msg.username} className="w-8 h-8 rounded-full bg-accent text-sm" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2"><button onClick={() => onViewProfile(msg.sender_id)} className="font-medium text-sm hover:underline" style={{ color: isMine ? "var(--accent)" : "#FEE75C" }}>{msg.username}</button><span className="text-xs text-zinc-400">{new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></div>
        <QuoteBlock user={msg.reply_user} content={msg.reply_content} targetId={msg.reply_to} scrollToMsg={scrollToMsg} />
        {editingId === msg.id ? <EditBox save={onEdit} /> : <p className="text-[15px] text-[#DBDEE1] break-words">{searchQuery ? highlight(msg.content) : <MarkdownText text={msg.content} mentionize={mentionize} />}</p>}
        {editingId !== msg.id && !msg.file_url && extractUrls(msg.content).slice(0, 3).map((url) => <LinkEmbed key={url} url={url} />)}
        {editingId !== msg.id && <AttachmentBlock url={msg.file_url} name={msg.file_name} type={msg.file_type} />}
        {editingId !== msg.id && <ReactionBar list={dmReactions[msg.id]} toggle={(e) => onToggleReaction(msg.id, e)} />}
        {pickFor === msg.id && <EmojiPicker messageId={msg.id} toggle={onToggleReaction} onClose={() => setPickFor(null)} />}
      </div>
      {editingId !== msg.id && (
        <div className="hidden group-hover:flex items-center gap-1 self-start bg-background border border-border rounded-lg p-1 shadow-lg">
          <button onClick={() => { onReply({ id: msg.id, user: msg.username, content: msg.content }); setPickFor(null); }} title="Responder"><Reply className="w-4 h-4 text-zinc-400 hover:text-white" /></button>
          <button onClick={() => setPickFor(pickFor === msg.id ? null : msg.id)} title="Reagir"><Smile className="w-4 h-4 text-zinc-400 hover:text-yellow-300" /></button>
          {isMine && (
            <>
              <button onClick={() => onEdit(msg.id, msg.content)} title="Editar"><Pencil className="w-4 h-4 text-zinc-400 hover:text-white" /></button>
              <button onClick={() => onDelete(msg.id)} title="Excluir"><Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-400" /></button>
            </>
          )}
        </div>
      )}
    </div>
  );
});
