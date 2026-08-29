"use client";

import { useState, useEffect, useRef } from "react";
import {
  Hash,
  Volume2,
  Settings,
  Plus,
  Send,
  Smile,
  Gift,
  Sticker,
  HelpCircle,
  Inbox,
  Search,
  Phone,
  Video,
  Pin,
  UserPlus,
  MoreHorizontal,
  LogOut,
  Mic,
  Headphones,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import VoiceChannel from "@/components/VoiceChannel";
import { useRouter } from "next/navigation";

type Message = {
  id: string;
  user: string;
  avatar: string;
  color: string;
  content: string;
  timestamp: string;
  channelId: string;
  created_at?: string;
};

type Channel = {
  id: string;
  server_id?: string;
  name: string;
  type: "text" | "voice";
};

type Server = {
  id: string;
  name: string;
  icon: string;
  channels: Channel[];
};

const fallbackServers: Server[] = [
  {
    id: "fallback-1",
    name: "Casa dos Amigos",
    icon: "🏠",
    channels: [
      { id: "fallback-1-1", name: "geral", type: "text" },
      { id: "fallback-1-2", name: "memes", type: "text" },
    ],
  },
];

const members = [
  { name: "Você", avatar: "😎", status: "online", role: "Admin" },
  { name: "Ana", avatar: "🌸", status: "online", role: "Online — 2" },
  { name: "Marcos", avatar: "⚡", status: "idle", role: "" },
  { name: "Julia", avatar: "🦊", status: "online", role: "" },
  { name: "Pedro", avatar: "🎧", status: "offline", role: "Offline — 1" },
];

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return "Hoje às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch { return dateStr; }
}

export default function DiscordClone() {
  const supabase = createClient();
  const router = useRouter();
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>("");
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("Você");
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentServer = servers.find((s) => s.id === selectedServer);
  const currentChannel = currentServer?.channels.find((c) => c.id === selectedChannel);
  const channelMessages = messages.filter((m) => m.channelId === selectedChannel);

  // Auth: exige login
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      // busca perfil
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profile?.username) setUsername(profile.username);
      else if (user.user_metadata?.username) setUsername(user.user_metadata.username);
      else setUsername(user.email?.split("@")[0] || "Você");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) router.push("/login");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [channelMessages]);

  // Carregar servidores e canais do Supabase
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: srvData, error: srvErr } = await supabase.from("servers").select("*").order("created_at");
      if (srvErr) {
        console.error("load servers", srvErr);
        setServers(fallbackServers);
        setSelectedServer(fallbackServers[0].id);
        setSelectedChannel(fallbackServers[0].channels[0].id);
        setLoading(false);
        return;
      }
      if (!srvData || srvData.length === 0) {
        // seed inicial
        const seed = [
          { name: "Casa dos Amigos", icon: "🏠", channels: [{ name: "geral", type: "text" }, { name: "memes", type: "text" }, { name: "jogos", type: "text" }, { name: "Geral", type: "voice" }] },
          { name: "Estudos", icon: "📚", channels: [{ name: "dúvidas", type: "text" }, { name: "projetos", type: "text" }] },
          { name: "Games", icon: "🎮", channels: [{ name: "valorant", type: "text" }, { name: "minecraft", type: "text" }] },
        ];
        for (const s of seed) {
          const { data: insSrv } = await supabase.from("servers").insert({ name: s.name, icon: s.icon }).select().single();
          if (insSrv) {
            for (const ch of s.channels) {
              await supabase.from("channels").insert({ server_id: insSrv.id, name: ch.name, type: ch.type });
            }
          }
        }
        return load(); // recarregar
      }
      // buscar canais
      const { data: chData } = await supabase.from("channels").select("*").order("created_at");
      const mapped: Server[] = srvData.map((s: any) => ({
        id: s.id,
        name: s.name,
        icon: s.icon,
        channels: (chData || []).filter((c: any) => c.server_id === s.id).map((c: any) => ({ id: c.id, server_id: c.server_id, name: c.name, type: c.type })),
      }));
      setServers(mapped);
      if (!selectedServer && mapped.length > 0) {
        setSelectedServer(mapped[0].id);
        setSelectedChannel(mapped[0].channels[0]?.id || "");
      }
      setLoading(false);
      setConnected(true);
    }
    load();
  }, []);

  // Carregar mensagens do canal selecionado + Realtime
  useEffect(() => {
    if (!selectedChannel || selectedChannel.startsWith("fallback")) return;
    let channelSub: any;

    async function loadMessages() {
      const { data } = await supabase.from("messages").select("*").eq("channel_id", selectedChannel).order("created_at", { ascending: true }).limit(100);
      if (data) {
        setMessages((prev) => {
          const others = prev.filter((m) => m.channelId !== selectedChannel);
          const mapped = data.map((r: any) => ({
            id: r.id,
            user: r.username,
            avatar: r.avatar || "😎",
            color: r.color || "#5865F2",
            content: r.content,
            timestamp: formatTime(r.created_at),
            channelId: r.channel_id,
            created_at: r.created_at,
          }));
          return [...others, ...mapped];
        });
      }
    }
    loadMessages();

    channelSub = supabase
      .channel(`messages-${selectedChannel}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${selectedChannel}` }, (payload: any) => {
        const r = payload.new;
        setMessages((prev) => {
          if (prev.some((m) => m.id === r.id)) return prev;
          return [...prev, { id: r.id, user: r.username, avatar: r.avatar || "😎", color: r.color || "#5865F2", content: r.content, timestamp: formatTime(r.created_at), channelId: r.channel_id, created_at: r.created_at }];
        });
      })
      .subscribe();

    return () => { if (channelSub) supabase.removeChannel(channelSub); };
  }, [selectedChannel]);

  // Realtime para novos servidores/canais
  useEffect(() => {
    const srvSub = supabase.channel("servers-realtime").on("postgres_changes", { event: "*", schema: "public", table: "servers" }, async () => {
      const { data: srvData } = await supabase.from("servers").select("*").order("created_at");
      const { data: chData } = await supabase.from("channels").select("*").order("created_at");
      if (srvData) {
        const mapped: Server[] = srvData.map((s: any) => ({
          id: s.id, name: s.name, icon: s.icon,
          channels: (chData || []).filter((c: any) => c.server_id === s.id).map((c: any) => ({ id: c.id, server_id: c.server_id, name: c.name, type: c.type })),
        }));
        setServers(mapped);
      }
    }).subscribe();
    const chSub = supabase.channel("channels-realtime").on("postgres_changes", { event: "*", schema: "public", table: "channels" }, async () => {
      const { data: chData } = await supabase.from("channels").select("*").order("created_at");
      const { data: srvData } = await supabase.from("servers").select("*").order("created_at");
      if (srvData && chData) {
        const mapped: Server[] = srvData.map((s: any) => ({
          id: s.id, name: s.name, icon: s.icon,
          channels: chData.filter((c: any) => c.server_id === s.id).map((c: any) => ({ id: c.id, server_id: c.server_id, name: c.name, type: c.type })),
        }));
        setServers(mapped);
      }
    }).subscribe();
    return () => { supabase.removeChannel(srvSub); supabase.removeChannel(chSub); };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !selectedChannel || !user) return;
    const content = input;
    setInput("");
    const { error } = await supabase.from("messages").insert({
      channel_id: selectedChannel,
      user_id: user.id,
      username,
      content,
      avatar: "😎",
      color: "#5865F2",
    });
    if (error) {
      console.error(error);
      alert("Erro ao enviar: " + error.message);
      setInput(content);
    }
  };

  const createServer = async () => {
    const name = prompt("Nome do novo servidor:");
    if (!name) return;
    const { data, error } = await supabase.from("servers").insert({ name, icon: name[0].toUpperCase() }).select().single();
    if (error) return alert(error.message);
    await supabase.from("channels").insert({ server_id: data.id, name: "geral", type: "text" });
    setSelectedServer(data.id);
    // canal será selecionado via realtime reload; pega após delay
    setTimeout(async () => {
      const { data: ch } = await supabase.from("channels").select("*").eq("server_id", data.id).limit(1).single();
      if (ch) setSelectedChannel(ch.id);
    }, 500);
  };

  const createChannel = async () => {
    const name = prompt("Nome do novo canal (sem #):");
    if (!name || !currentServer) return;
    const type = confirm("OK = canal de texto, Cancelar = canal de voz") ? "text" : "voice";
    const { error } = await supabase.from("channels").insert({ server_id: currentServer.id, name: name.toLowerCase().replace(/\s+/g, "-"), type });
    if (error) alert(error.message);
  };

  if (loading) {
    return <div className="h-screen w-screen bg-[#313338] flex items-center justify-center text-zinc-300">Carregando seu Discord... ⏳</div>;
  }

  return (
    <div className="flex h-screen w-screen bg-[#313338] text-zinc-100 overflow-hidden select-none">
      <div className="w-[72px] bg-[#1E1F22] flex flex-col items-center py-3 gap-2 shrink-0 overflow-y-auto">
        <div className="w-8 h-0.5 bg-[#35363C] rounded-full my-1" />
        {servers.map((server) => (
          <button
            key={server.id}
            onClick={() => { setSelectedServer(server.id); setSelectedChannel(server.channels[0]?.id || ""); }}
            className={`w-12 h-12 flex items-center justify-center text-lg font-bold transition-all duration-200 relative group ${selectedServer === server.id ? "bg-[#5865F2] text-white rounded-[16px]" : "bg-[#313338] text-zinc-300 rounded-[24px] hover:rounded-[16px] hover:bg-[#5865F2] hover:text-white"}`}
            title={server.name}
          >
            {server.icon}
            {selectedServer === server.id && <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />}
          </button>
        ))}
        <button onClick={createServer} className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-[#313338] hover:bg-[#23A559] text-[#23A559] hover:text-white flex items-center justify-center transition-all duration-200 group" title="Adicionar servidor">
          <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>

      <div className="w-60 bg-[#2B2D31] flex flex-col shrink-0">
        <div className="h-12 px-4 flex items-center justify-between border-b border-[#1F2124] shadow-sm shrink-0">
          <span className="font-bold text-[15px] truncate">{currentServer?.name}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${connected ? "bg-[#23A559] text-white" : "bg-zinc-600 text-zinc-300"}`}>{connected ? "● AO VIVO" : "offline"}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          <div>
            <div className="flex items-center justify-between px-1 py-1 text-xs font-semibold text-zinc-400 tracking-wide">
              <span>⌄ CANAIS DE TEXTO</span>
              <Plus onClick={createChannel} className="w-3.5 h-3.5 cursor-pointer hover:text-zinc-200" />
            </div>
            {currentServer?.channels.filter((c) => c.type === "text").map((ch) => (
              <button key={ch.id} onClick={() => setSelectedChannel(ch.id)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[15px] font-medium mt-0.5 ${selectedChannel === ch.id ? "bg-[#404249] text-white" : "text-zinc-400 hover:bg-[#35373C] hover:text-zinc-200"}`}>
                <Hash className="w-4 h-4 shrink-0 text-zinc-500" /><span className="truncate">{ch.name}</span>
              </button>
            ))}
          </div>
          <div>
            <div className="flex items-center gap-1 px-1 py-1 text-xs font-semibold text-zinc-400 tracking-wide">⌄ CANAIS DE VOZ</div>
            {currentServer?.channels.filter((c) => c.type === "voice").map((ch) => (
              <button key={ch.id} onClick={() => setSelectedChannel(ch.id)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[15px] font-medium mt-0.5 ${selectedChannel === ch.id ? "bg-[#404249] text-white" : "text-zinc-400 hover:bg-[#35373C] hover:text-zinc-200"}`}>
                <Volume2 className="w-4 h-4 shrink-0 text-zinc-500" /><span className="truncate">{ch.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="h-[52px] bg-[#232428] flex items-center px-2 gap-2 shrink-0">
          <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-sm">😎</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold leading-none truncate">{username}</div>
            <div className="text-xs text-zinc-400 leading-none truncate">{user?.email}</div>
          </div>
          <button onClick={() => setShowUsernameModal(true)} className="p-1.5 hover:bg-[#35373C] rounded"><Settings className="w-4 h-4 text-zinc-400" /></button>
          <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="p-1.5 hover:bg-[#DA373C] rounded group" title="Sair"><LogOut className="w-4 h-4 text-zinc-400 group-hover:text-white" /></button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#313338] min-w-0">
        <div className="h-12 flex items-center px-4 gap-3 border-b border-[#1F2124] shadow-sm shrink-0">
          <Hash className="w-5 h-5 text-zinc-400" /><span className="font-bold">{currentChannel?.name}</span>
          <span className="w-px h-6 bg-[#3F4147] mx-2" />
          <span className="text-sm text-zinc-400 truncate hidden sm:block">Canal de texto • Supabase Realtime ativo</span>
          <div className="ml-auto flex items-center gap-4 text-zinc-400">
            <Phone className="w-5 h-5 hidden md:block" /><Video className="w-5 h-5 hidden md:block" /><Pin className="w-5 h-5 hidden md:block" /><UserPlus className="w-5 h-5" />
            <div className="relative hidden md:block"><Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2" /><input placeholder="Buscar" className="bg-[#2B2D31] rounded pl-7 pr-2 py-1 text-sm w-36 focus:outline-none placeholder:text-zinc-500" /></div>
            <Inbox className="w-5 h-5" /><HelpCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1 flex flex-col">
          {currentChannel?.type === "voice" ? (
            <VoiceChannel channelId={selectedChannel} username={username} />
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
      </div>

      <div className="w-60 bg-[#2B2D31] hidden lg:flex flex-col shrink-0 overflow-y-auto">
        <div className="p-3 space-y-4">
          {[{ role: "ONLINE — 3", users: members.slice(0, 3) }, { role: "OFFLINE — 2", users: members.slice(3) }].map((group) => (
            <div key={group.role}>
              <h3 className="text-xs font-semibold text-zinc-400 tracking-wide px-2 mb-1">{group.role}</h3>
              {group.users.map((m) => (
                <div key={m.name} className="flex items-center gap-3 px-2 py-1 rounded hover:bg-[#35373C] cursor-pointer group">
                  <div className="relative"><div className="w-8 h-8 rounded-full bg-[#41434A] flex items-center justify-center text-sm">{m.avatar}</div><div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2B2D31] ${m.status === "online" ? "bg-[#23A559]" : m.status === "idle" ? "bg-[#F0B132]" : "bg-zinc-500"}`} /></div>
                  <div className="flex-1 min-w-0"><div className={`text-sm font-medium truncate ${m.status === "offline" ? "text-zinc-500" : "text-zinc-300 group-hover:text-white"}`}>{m.name}</div></div>
                </div>
              ))}
            </div>
          ))}
          <div className="bg-[#232428] rounded-lg p-3 mt-6">
            <h4 className="font-bold text-sm mb-1">✅ Supabase Conectado</h4>
            <p className="text-xs text-zinc-400">ID do projeto: idppxrb...btq</p>
            <p className="text-xs text-[#23A559] mt-1">● Realtime funcionando</p>
            <p className="text-xs text-zinc-500 mt-2">Próximos: voz WebRTC, Desktop (Tauri), Mobile (Capacitor)</p>
          </div>
        </div>
      </div>

      {showUsernameModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#313338] rounded-lg w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-2">Editar perfil</h2>
            <p className="text-sm text-zinc-400 mb-4">Este nome aparece nas mensagens. Logado como {user?.email}</p>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-[#2B2D31] rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#5865F2] text-white" placeholder="Seu nome" autoFocus />
            <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowUsernameModal(false)} className="px-4 py-2 text-sm hover:underline">Cancelar</button><button onClick={async () => { if (user) await supabase.from("profiles").update({ username }).eq("id", user.id); setShowUsernameModal(false); }} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] rounded text-sm font-medium text-white">Salvar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
