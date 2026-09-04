"use client";
import type { RefObject } from "react";
import {
  Hash, Send, Smile, Gift, Sticker, Phone, Video, Pin, UserPlus, Menu,
  Search, Inbox, HelpCircle, Plus, MoreHorizontal,
} from "lucide-react";
import type { Channel, DMConversation, DMMessage, Message, PresenceUser } from "@/lib/chat-types";
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
};

// Área principal de chat (DM ou canal). Extraído de page.tsx sem mudança visual.
export default function ChatArea(props: Props) {
  const {
    viewMode, setShowMobileSidebar,
    dmConversations, selectedDM, dmMessages, dmInput, setDmInput, handleDMSend, dmEndRef, onlineMembers, userId,
    currentChannel, selectedChannel, channelMessages, messagesEndRef, input, setInput, handleSend, username, status,
  } = props;
  const dmOther = dmConversations.find((d) => d.id === selectedDM)?.otherUser;

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
                <div key={m.id} className="flex gap-3 px-2 py-1 hover:bg-[#2E3035] rounded">
                  <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-sm shrink-0">{m.sender_id === userId ? "😎" : "👤"}</div>
                  <div>
                    <div className="flex items-baseline gap-2"><span className="font-medium text-sm" style={{ color: m.sender_id === userId ? "#5865F2" : "#FEE75C" }}>{m.username}</span><span className="text-xs text-zinc-500">{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></div>
                    <p className="text-[15px] text-[#DBDEE1] break-words">{m.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={dmEndRef} />
          </div>
          {selectedDM && (
            <div className="p-4 shrink-0">
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
              <Phone className="w-5 h-5 hidden md:block" /><Video className="w-5 h-5 hidden md:block" /><Pin className="w-5 h-5 hidden md:block" /><UserPlus className="w-5 h-5" />
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
                  <div key={msg.id} className="group flex gap-3 px-2 py-1 hover:bg-[#2E3035] rounded">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 mt-1" style={{ background: `${msg.color}33` }}>{msg.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap"><span className="font-medium cursor-pointer" style={{ color: msg.color }}>{msg.user}</span><span className="text-xs text-zinc-400">{msg.timestamp}</span></div>
                      <p className="text-[15px] leading-5 text-[#DBDEE1] break-words whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <div className="hidden group-hover:flex items-center gap-1 self-start bg-[#313338] border border-[#3F4147] rounded-lg p-1 shadow-lg"><Smile className="w-4 h-4" /><MoreHorizontal className="w-4 h-4" /></div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
          {currentChannel?.type === "text" && (
            <div className="p-4 shrink-0">
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
