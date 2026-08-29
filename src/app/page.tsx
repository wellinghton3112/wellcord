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
  Circle,
  Moon,
  MinusCircle,
  EyeOff,
  Trash2,
  X,
  Menu,
  Users,
  MessageCircle,
} from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { createClient } from "@/lib/supabase";
import VoiceChannel from "@/components/VoiceChannel";
import VoicePreview from "@/components/VoicePreview";
import { VoiceProvider } from "@/context/VoiceContext";
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
  icon?: string;
  image_url?: string;
};

type Server = {
  id: string;
  name: string;
  icon: string;
  image_url?: string;
  channels: Channel[];
};

type DMConversation = {
  id: string;
  participants: { id: string; username: string; avatar: string }[];
  otherUser?: { id: string; username: string; avatar: string };
};

type DMMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  username: string;
  content: string;
  created_at: string;
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

type PresenceUser = { id: string; username: string; avatar: string; status: "online" | "idle" | "dnd" | "invisible" | "offline"; email?: string };
const statusConfig = {
  online: { label: "Online", color: "bg-[#23A559]", icon: Circle },
  idle: { label: "Ausente", color: "bg-[#F0B132]", icon: Moon },
  dnd: { label: "Não perturbe", color: "bg-[#DA373C]", icon: MinusCircle },
  invisible: { label: "Invisível", color: "bg-zinc-500", icon: EyeOff },
};

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
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"text" | "voice">("text");
  const [newChannelIcon, setNewChannelIcon] = useState("💬");
  const [newChannelImage, setNewChannelImage] = useState<File | null>(null);
  const [newChannelPreview, setNewChannelPreview] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [showCreateServerModal, setShowCreateServerModal] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [newServerIcon, setNewServerIcon] = useState("🏠");
  const [newServerImage, setNewServerImage] = useState<File | null>(null);
  const [newServerPreview, setNewServerPreview] = useState("");
  const [creatingServer, setCreatingServer] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [status, setStatus] = useState<"online" | "idle" | "dnd" | "invisible">("online");
  const [onlineMembers, setOnlineMembers] = useState<PresenceUser[]>([]);
  const [allProfiles, setAllProfiles] = useState<PresenceUser[]>([]);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [viewMode, setViewMode] = useState<"server" | "dm">("server");
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
  const [selectedDM, setSelectedDM] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<DMMessage[]>([]);
  const [dmInput, setDmInput] = useState("");
  const [showNewDMModal, setShowNewDMModal] = useState(false);
  const [newDMUsername, setNewDMUsername] = useState("");
  const [creatingDM, setCreatingDM] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMobileMembers, setShowMobileMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dmEndRef = useRef<HTMLDivElement>(null);

  const currentServer = servers.find((s) => s.id === selectedServer);
  const currentChannel = currentServer?.channels.find((c) => c.id === selectedChannel);
  const channelMessages = messages.filter((m) => m.channelId === selectedChannel);

  // Se veio do email com ?code=..., troca por sessão
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(() => {
        window.history.replaceState({}, "", window.location.pathname);
        window.location.reload();
      });
    }
  }, []);

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

  // Presença real: online/ausente/ocupado/invisível
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("presence:global", { config: { presence: { key: user.id } } });
    ch.on("presence", { event: "sync" }, () => {
      const state: any = ch.presenceState();
      const members: PresenceUser[] = [];
      Object.values(state).forEach((arr: any) =>
        (arr as any[]).forEach((p: any) => {
          if (p.status !== "invisible") members.push(p as PresenceUser);
        })
      );
      const uniq = Array.from(new Map(members.map((m) => [m.id, m])).values());
      setOnlineMembers(uniq);
    });
    ch.subscribe(async (s) => {
      if (s === "SUBSCRIBED" && status !== "invisible") {
        await ch.track({ id: user.id, username, avatar: "😎", status, email: user.email });
      }
    });
    return () => { supabase.removeChannel(ch); };
  }, [user, username, status]);

  // Carregar todos os perfis para lista offline
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("id, username, avatar").then(({ data }) => {
      if (data) setAllProfiles(data.map((p: any) => ({ id: p.id, username: p.username, avatar: p.avatar || "😎", status: "offline" as const })));
    });
  }, [user, onlineMembers.length]);

  // Atualiza presença quando username/status mudam
  useEffect(() => {
    if (!user) return;
  }, [status, username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [channelMessages]);

  // Carregar servidores e canais do Supabase (só após login)
  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      const { data: srvData, error: srvErr } = await supabase.from("servers").select("*").order("created_at");
      if (srvErr) {
        console.error("load servers", srvErr);
        setLoading(false);
        return;
      }
      if (!srvData || srvData.length === 0) {
        setServers([]);
        setLoading(false);
        setConnected(true);
        return;
      }
      // buscar canais
      const { data: chData } = await supabase.from("channels").select("*").order("created_at");
      const mapped: Server[] = srvData.map((s: any) => ({
        id: s.id,
        name: s.name,
        icon: s.icon,
        image_url: s.image_url,
        channels: (chData || []).filter((c: any) => c.server_id === s.id).map((c: any) => ({ id: c.id, server_id: c.server_id, name: c.name, type: c.type, icon: c.icon, image_url: c.image_url })),
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
  }, [user]);

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
          id: s.id, name: s.name, icon: s.icon, image_url: (s as any).image_url,
          channels: (chData || []).filter((c: any) => c.server_id === s.id).map((c: any) => ({ id: c.id, server_id: c.server_id, name: c.name, type: c.type, icon: c.icon, image_url: c.image_url })),
        }));
        setServers(mapped);
      }
    }).subscribe();
    const chSub = supabase.channel("channels-realtime").on("postgres_changes", { event: "*", schema: "public", table: "channels" }, async () => {
      const { data: chData } = await supabase.from("channels").select("*").order("created_at");
      const { data: srvData } = await supabase.from("servers").select("*").order("created_at");
      if (srvData && chData) {
        const mapped: Server[] = srvData.map((s: any) => ({
          id: s.id, name: s.name, icon: s.icon, image_url: (s as any).image_url,
          channels: chData.filter((c: any) => c.server_id === s.id).map((c: any) => ({ id: c.id, server_id: c.server_id, name: c.name, type: c.type, icon: c.icon, image_url: c.image_url })),
        }));
        setServers(mapped);
      }
    }).subscribe();
    return () => { supabase.removeChannel(srvSub); supabase.removeChannel(chSub); };
  }, []);

  // DMs: carregar conversas
  const loadDMs = async () => {
    if (!user) return;
    const { data: parts } = await supabase.from("dm_participants").select("conversation_id").eq("user_id", user.id);
    if (!parts || parts.length === 0) { setDmConversations([]); return; }
    const ids = parts.map((p: any) => p.conversation_id);
    const { data: allParts } = await supabase.from("dm_participants").select("conversation_id, user_id").in("conversation_id", ids);
    const { data: profiles } = await supabase.from("profiles").select("id, username, avatar");
    const convs: DMConversation[] = ids.map((id: string) => {
      const p = (allParts || []).filter((x: any) => x.conversation_id === id);
      const participants = p.map((x: any) => {
        const prof = (profiles || []).find((pr: any) => pr.id === x.user_id);
        return { id: x.user_id, username: prof?.username || x.user_id.slice(0, 6), avatar: prof?.avatar || "😎" };
      });
      const other = participants.find((x) => x.id !== user.id);
      return { id, participants, otherUser: other };
    });
    setDmConversations(convs);
  };

  useEffect(() => { if (user) loadDMs(); }, [user]);

  useEffect(() => {
    if (!selectedDM) return;
    const load = async () => {
      const { data } = await supabase.from("dm_messages").select("*").eq("conversation_id", selectedDM).order("created_at", { ascending: true }).limit(100);
      if (data) {
        const mapped = await Promise.all(data.map(async (r: any) => {
          const { data: prof } = await supabase.from("profiles").select("username").eq("id", r.sender_id).single();
          return { id: r.id, conversation_id: r.conversation_id, sender_id: r.sender_id, username: prof?.username || r.sender_id.slice(0, 6), content: r.content, created_at: r.created_at };
        }));
        setDmMessages(mapped);
      }
    };
    load();
    const ch = supabase.channel(`dm-${selectedDM}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${selectedDM}` }, async (payload: any) => {
      const r = payload.new;
      const { data: prof } = await supabase.from("profiles").select("username").eq("id", r.sender_id).single();
      setDmMessages((prev) => [...prev, { id: r.id, conversation_id: r.conversation_id, sender_id: r.sender_id, username: prof?.username || r.sender_id.slice(0, 6), content: r.content, created_at: r.created_at }]);
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedDM]);

  useEffect(() => { dmEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [dmMessages]);

  useEffect(() => { setShowMobileSidebar(false); }, [selectedChannel, selectedDM]);

  const handleDMSend = async () => {
    if (!dmInput.trim() || !selectedDM || !user) return;
    const content = dmInput;
    setDmInput("");
    const { error } = await supabase.from("dm_messages").insert({ conversation_id: selectedDM, sender_id: user.id, content });
    if (error) { alert(error.message); setDmInput(content); }
  };

  const createDM = async () => {
    if (!newDMUsername.trim() || !user) return;
    setCreatingDM(true);
    const { data: prof } = await supabase.from("profiles").select("id, username").ilike("username", `%${newDMUsername.trim()}%`).limit(1).single();
    if (!prof) { alert("Usuário não encontrado"); setCreatingDM(false); return; }
    if (prof.id === user.id) { alert("Não pode criar DM consigo mesmo"); setCreatingDM(false); return; }
    // verifica se já existe conversa
    const { data: myConvs } = await supabase.from("dm_participants").select("conversation_id").eq("user_id", user.id);
    let existing: string | null = null;
    if (myConvs) {
      for (const c of myConvs) {
        const { data: parts } = await supabase.from("dm_participants").select("user_id").eq("conversation_id", c.conversation_id);
        if (parts && parts.length === 2 && parts.some((p: any) => p.user_id === prof.id)) { existing = c.conversation_id; break; }
      }
    }
    if (existing) { setSelectedDM(existing); setViewMode("dm"); setShowNewDMModal(false); setCreatingDM(false); return; }
    const { data: conv, error } = await supabase.from("dm_conversations").insert({}).select().single();
    if (error || !conv) { alert(error?.message || "Erro"); setCreatingDM(false); return; }
    await supabase.from("dm_participants").insert([{ conversation_id: conv.id, user_id: user.id }, { conversation_id: conv.id, user_id: prof.id }]);
    await loadDMs();
    setSelectedDM(conv.id);
    setViewMode("dm");
    setShowNewDMModal(false);
    setCreatingDM(false);
  };

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

  const openCreateServer = () => {
    setEditingServer(null);
    setNewServerName("");
    setNewServerIcon("🏠");
    setNewServerImage(null);
    setNewServerPreview("");
    setShowCreateServerModal(true);
  };
  const openEditServer = (s: Server) => {
    setEditingServer(s);
    setNewServerName(s.name);
    setNewServerIcon(s.icon);
    setNewServerImage(null);
    setNewServerPreview(s.image_url || "");
    setShowCreateServerModal(true);
  };
  const handleServerSave = async () => {
    if (!newServerName.trim()) return;
    setCreatingServer(true);
    let image_url: string | null = editingServer?.image_url || null;
    if (newServerImage) {
      const ext = newServerImage.name.split(".").pop();
      const path = `servers/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("server-icons").upload(path, newServerImage);
      if (upErr) { alert("Erro ao subir imagem: " + upErr.message); setCreatingServer(false); return; }
      const { data } = supabase.storage.from("server-icons").getPublicUrl(path);
      image_url = data.publicUrl;
    } else if (!newServerPreview && editingServer?.image_url) {
      image_url = null;
    }
    if (editingServer) {
      const { error } = await supabase.from("servers").update({ name: newServerName, icon: newServerIcon, image_url }).eq("id", editingServer.id);
      if (error) alert(error.message);
    } else {
      const { data, error } = await supabase.from("servers").insert({ name: newServerName, icon: newServerIcon, image_url }).select().single();
      if (error) { alert(error.message); setCreatingServer(false); return; }
      await supabase.from("channels").insert({ server_id: data.id, name: "geral", type: "text", icon: "💬" });
      setSelectedServer(data.id);
      setTimeout(async () => {
        const { data: ch } = await supabase.from("channels").select("*").eq("server_id", data.id).limit(1).single();
        if (ch) setSelectedChannel(ch.id);
      }, 500);
    }
    setCreatingServer(false);
    setShowCreateServerModal(false);
  };

  const deleteServer = async () => {
    if (!currentServer) return;
    if (!confirm(`Excluir servidor "${currentServer.name}" e todos os canais?`)) return;
    const { error } = await supabase.from("servers").delete().eq("id", currentServer.id);
    if (error) return alert(error.message);
    // seleciona outro servidor
    const remaining = servers.filter((s) => s.id !== currentServer.id);
    if (remaining.length > 0) {
      setSelectedServer(remaining[0].id);
      setSelectedChannel(remaining[0].channels[0]?.id || "");
    } else {
      setSelectedServer("");
      setSelectedChannel("");
    }
  };

  const deleteChannel = async (channelId: string, channelName: string) => {
    if (!confirm(`Excluir canal #${channelName}? Mensagens serão perdidas.`)) return;
    const { error } = await supabase.from("channels").delete().eq("id", channelId);
    if (error) alert(error.message);
    else if (selectedChannel === channelId) {
      const next = currentServer?.channels.find((c) => c.id !== channelId);
      if (next) setSelectedChannel(next.id);
    }
  };

  const createChannel = () => {
    if (!currentServer) return;
    setNewChannelName("");
    setNewChannelType("text");
    setNewChannelIcon("💬");
    setNewChannelImage(null);
    setNewChannelPreview("");
    setShowCreateChannelModal(true);
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !currentServer) return;
    setCreatingChannel(true);
    let image_url: string | null = null;
    if (newChannelImage) {
      const ext = newChannelImage.name.split(".").pop();
      const path = `${currentServer.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("channel-icons").upload(path, newChannelImage);
      if (upErr) { alert("Erro ao subir imagem: " + upErr.message); setCreatingChannel(false); return; }
      const { data } = supabase.storage.from("channel-icons").getPublicUrl(path);
      image_url = data.publicUrl;
    }
    const { error } = await supabase.from("channels").insert({
      server_id: currentServer.id,
      name: newChannelName.toLowerCase().replace(/\s+/g, "-"),
      type: newChannelType,
      icon: newChannelIcon,
      image_url,
    });
    setCreatingChannel(false);
    if (error) alert(error.message);
    else setShowCreateChannelModal(false);
  };

  if (loading) {
    return <div className="h-screen w-screen bg-[#313338] flex items-center justify-center text-zinc-300">Carregando seu Discord... ⏳</div>;
  }

  return (
    <VoiceProvider>
    <div className="h-screen w-screen bg-[#313338] text-zinc-100 overflow-hidden">

      {showMobileSidebar && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setShowMobileSidebar(false)} />}
      {showMobileMembers && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setShowMobileMembers(false)} />}

      <div className="flex h-full">

      {/* Server sidebar - desktop only */}
      <div className="hidden lg:flex w-[72px] bg-[#1E1F22] flex-col items-center py-3 gap-2 shrink-0 overflow-y-auto">
        <button onClick={() => setViewMode("dm")} className={`w-12 h-12 flex items-center justify-center text-xl transition-all ${viewMode === "dm" ? "bg-[#5865F2] text-white rounded-[16px]" : "bg-[#313338] text-zinc-300 rounded-[24px] hover:rounded-[16px] hover:bg-[#5865F2] hover:text-white"}`} title="Mensagens Diretas">💬</button>
        <div className="w-8 h-0.5 bg-[#35363C] rounded-full my-1" />
        {servers.map((server) => (
          <button
            key={server.id}
            onClick={() => { setViewMode("server"); setSelectedServer(server.id); setSelectedChannel(server.channels[0]?.id || ""); }}
            onDoubleClick={() => openEditServer(server)}
            onContextMenu={(e) => { e.preventDefault(); openEditServer(server); }}
            className={`w-12 h-12 flex items-center justify-center text-lg font-bold transition-all duration-200 relative group overflow-hidden ${viewMode === "server" && selectedServer === server.id ? "bg-[#5865F2] text-white rounded-[16px]" : "bg-[#313338] text-zinc-300 rounded-[24px] hover:rounded-[16px] hover:bg-[#5865F2] hover:text-white"}`}
            title={`${server.name} (duplo clique para editar)`}
          >
            {server.image_url ? <img src={server.image_url} alt={server.name} className="w-full h-full object-cover" /> : server.icon}
            {viewMode === "server" && selectedServer === server.id && <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />}
          </button>
        ))}
        <button onClick={openCreateServer} className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-[#313338] hover:bg-[#23A559] text-[#23A559] hover:text-white flex items-center justify-center transition-all duration-200 group" title="Adicionar servidor">
          <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>

      {/* Server sidebar - mobile overlay */}
      <div className={`${showMobileSidebar ? "translate-x-0" : "-translate-x-full"} lg:hidden fixed inset-y-0 left-0 z-50 w-[72px] bg-[#1E1F22] flex flex-col items-center py-3 gap-2 shrink-0 overflow-y-auto transition-transform duration-200`}>
        <button onClick={() => setViewMode("dm")} className={`w-12 h-12 flex items-center justify-center text-xl transition-all ${viewMode === "dm" ? "bg-[#5865F2] text-white rounded-[16px]" : "bg-[#313338] text-zinc-300 rounded-[24px] hover:rounded-[16px] hover:bg-[#5865F2] hover:text-white"}`} title="Mensagens Diretas">💬</button>
        <div className="w-8 h-0.5 bg-[#35363C] rounded-full my-1" />
        {servers.map((server) => (
          <button
            key={server.id}
            onClick={() => { setViewMode("server"); setSelectedServer(server.id); setSelectedChannel(server.channels[0]?.id || ""); setShowMobileSidebar(false); }}
            onDoubleClick={() => openEditServer(server)}
            onContextMenu={(e) => { e.preventDefault(); openEditServer(server); }}
            className={`w-12 h-12 flex items-center justify-center text-lg font-bold transition-all duration-200 relative group overflow-hidden ${viewMode === "server" && selectedServer === server.id ? "bg-[#5865F2] text-white rounded-[16px]" : "bg-[#313338] text-zinc-300 rounded-[24px] hover:rounded-[16px] hover:bg-[#5865F2] hover:text-white"}`}
            title={`${server.name} (duplo clique para editar)`}
          >
            {server.image_url ? <img src={server.image_url} alt={server.name} className="w-full h-full object-cover" /> : server.icon}
            {viewMode === "server" && selectedServer === server.id && <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />}
          </button>
        ))}
        <button onClick={openCreateServer} className="w-12 h-12 rounded-[24px] hover:rounded-[16px] bg-[#313338] hover:bg-[#23A559] text-[#23A559] hover:text-white flex items-center justify-center transition-all duration-200 group" title="Adicionar servidor">
          <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>

      {/* Channel sidebar - desktop */}
      <div className="hidden lg:flex w-60 bg-[#2B2D31] flex-col shrink-0">
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
            </div>
          </>
        ) : (
          <>
            <div className="h-12 px-4 flex items-center justify-between border-b border-[#1F2124] shadow-sm shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {currentServer?.image_url ? <img src={currentServer.image_url} alt="" className="w-6 h-6 rounded object-cover shrink-0" /> : <span className="text-sm shrink-0">{currentServer?.icon}</span>}
                <span className="font-bold text-[15px] truncate">{currentServer?.name}</span>
              </div>
              <div className="flex items-center gap-1">
                {currentServer && <button onClick={() => openEditServer(currentServer)} className="p-1 hover:bg-[#404249] rounded" title="Editar servidor"><Settings className="w-3.5 h-3.5 text-zinc-400 hover:text-white" /></button>}
                {currentServer && <button onClick={deleteServer} className="p-1 hover:bg-[#404249] rounded" title="Excluir servidor"><Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400" /></button>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
              <div>
                <div className="flex items-center justify-between px-1 py-1 text-xs font-semibold text-zinc-400 tracking-wide">
                  <span>CANAIS DE TEXTO</span>
                  <Plus onClick={createChannel} className="w-3.5 h-3.5 cursor-pointer hover:text-zinc-200" />
                </div>
                {currentServer?.channels.filter((c) => c.type === "text").map((ch) => (
                  <div key={ch.id} className={`group flex items-center gap-1 px-2 py-1 rounded mt-0.5 ${selectedChannel === ch.id ? "bg-[#404249] text-white" : "text-zinc-400 hover:bg-[#35373C] hover:text-zinc-200"}`}>
                    <button onClick={() => setSelectedChannel(ch.id)} className="flex-1 flex items-center gap-2 text-[15px] font-medium overflow-hidden">
                      {ch.image_url ? <img src={ch.image_url} alt="" className="w-4 h-4 rounded object-cover shrink-0" /> : ch.icon ? <span className="w-4 h-4 flex items-center justify-center text-sm shrink-0">{ch.icon}</span> : <Hash className="w-4 h-4 shrink-0 text-zinc-500" />}<span className="truncate">{ch.name}</span>
                    </button>
                    <button onClick={() => deleteChannel(ch.id, ch.name)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#2B2D31] rounded" title="Excluir canal"><X className="w-3 h-3 hover:text-red-400" /></button>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 px-1 py-1 text-xs font-semibold text-zinc-400 tracking-wide">CANAIS DE VOZ</div>
                {currentServer?.channels.filter((c) => c.type === "voice").map((ch) => (
                  <div key={ch.id} className="flex flex-col">
                    <div className={`group flex items-center gap-1 px-2 py-1 rounded mt-0.5 ${selectedChannel === ch.id ? "bg-[#404249] text-white" : "text-zinc-400 hover:bg-[#35373C] hover:text-zinc-200"}`}>
                      <button onClick={() => setSelectedChannel(ch.id)} className="flex-1 flex items-center gap-2 text-[15px] font-medium overflow-hidden">
                        {ch.image_url ? <img src={ch.image_url} alt="" className="w-4 h-4 rounded object-cover shrink-0" /> : ch.icon ? <span className="w-4 h-4 flex items-center justify-center text-sm shrink-0">{ch.icon}</span> : <Volume2 className="w-4 h-4 shrink-0 text-zinc-500" />}<span className="truncate">{ch.name}</span>
                      </button>
                      <button onClick={() => deleteChannel(ch.id, ch.name)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#2B2D31] rounded" title="Excluir canal"><X className="w-3 h-3 hover:text-red-400" /></button>
                    </div>
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
          <button onClick={() => setShowUsernameModal(true)} className="p-1 hover:bg-[#35373C] rounded shrink-0"><Settings className="w-4 h-4 text-zinc-400" /></button>
          <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="p-1 hover:bg-[#DA373C] rounded group shrink-0" title="Sair"><LogOut className="w-4 h-4 text-zinc-400 group-hover:text-white" /></button>
        </div>
      </div>

      {/* Channel sidebar - mobile overlay */}
      <div className={`${showMobileSidebar ? "translate-x-0" : "-translate-x-full"} lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[#2B2D31] flex flex-col shrink-0 transition-transform duration-200`}>
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
                {currentServer && <button onClick={() => openEditServer(currentServer)} className="p-1 hover:bg-[#404249] rounded" title="Editar servidor"><Settings className="w-3.5 h-3.5 text-zinc-400 hover:text-white" /></button>}
                {currentServer && <button onClick={deleteServer} className="p-1 hover:bg-[#404249] rounded" title="Excluir servidor"><Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400" /></button>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
              <div>
                <div className="flex items-center justify-between px-1 py-1 text-xs font-semibold text-zinc-400 tracking-wide">
                  <span>⌄ CANAIS DE TEXTO</span>
                  <Plus onClick={createChannel} className="w-3.5 h-3.5 cursor-pointer hover:text-zinc-200" />
                </div>
                {currentServer?.channels.filter((c) => c.type === "text").map((ch) => (
                  <div key={ch.id} className={`group flex items-center gap-1 px-2 py-1 rounded mt-0.5 ${selectedChannel === ch.id ? "bg-[#404249] text-white" : "text-zinc-400 hover:bg-[#35373C] hover:text-zinc-200"}`}>
                    <button onClick={() => setSelectedChannel(ch.id)} className="flex-1 flex items-center gap-2 text-[15px] font-medium overflow-hidden">
                      {ch.image_url ? <img src={ch.image_url} alt="" className="w-4 h-4 rounded object-cover shrink-0" /> : ch.icon ? <span className="w-4 h-4 flex items-center justify-center text-sm shrink-0">{ch.icon}</span> : <Hash className="w-4 h-4 shrink-0 text-zinc-500" />}<span className="truncate">{ch.name}</span>
                    </button>
                    <button onClick={() => deleteChannel(ch.id, ch.name)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#2B2D31] rounded" title="Excluir canal"><X className="w-3 h-3 hover:text-red-400" /></button>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 px-1 py-1 text-xs font-semibold text-zinc-400 tracking-wide">⌄ CANAIS DE VOZ</div>
                {currentServer?.channels.filter((c) => c.type === "voice").map((ch) => (
                  <div key={ch.id} className="flex flex-col">
                    <div className={`group flex items-center gap-1 px-2 py-1 rounded mt-0.5 ${selectedChannel === ch.id ? "bg-[#404249] text-white" : "text-zinc-400 hover:bg-[#35373C] hover:text-zinc-200"}`}>
                      <button onClick={() => setSelectedChannel(ch.id)} className="flex-1 flex items-center gap-2 text-[15px] font-medium overflow-hidden">
                        {ch.image_url ? <img src={ch.image_url} alt="" className="w-4 h-4 rounded object-cover shrink-0" /> : ch.icon ? <span className="w-4 h-4 flex items-center justify-center text-sm shrink-0">{ch.icon}</span> : <Volume2 className="w-4 h-4 shrink-0 text-zinc-500" />}<span className="truncate">{ch.name}</span>
                      </button>
                      <button onClick={() => deleteChannel(ch.id, ch.name)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#2B2D31] rounded" title="Excluir canal"><X className="w-3 h-3 hover:text-red-400" /></button>
                    </div>
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
          <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="p-1 hover:bg-[#DA373C] rounded group shrink-0" title="Sair"><LogOut className="w-4 h-4 text-zinc-400 group-hover:text-white" /></button>
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

      <div className="flex-1 flex flex-col bg-[#313338] min-w-0">
        {viewMode === "dm" ? (
          <>
            <div className="h-12 flex items-center px-4 gap-3 border-b border-[#1F2124] shadow-sm shrink-0">
              {selectedDM ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-sm">{dmConversations.find((d) => d.id === selectedDM)?.otherUser?.avatar || "👤"}</div>
                  <span className="font-bold">{dmConversations.find((d) => d.id === selectedDM)?.otherUser?.username || "DM"}</span>
                  <span className={`w-2 h-2 rounded-full ${onlineMembers.some((m) => m.id === dmConversations.find((d) => d.id === selectedDM)?.otherUser?.id) ? "bg-[#23A559]" : "bg-zinc-500"}`} />
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
                  <p className="text-zinc-400">Início da DM com {dmConversations.find((d) => d.id === selectedDM)?.otherUser?.username}</p>
                  <p className="text-xs text-zinc-500 mt-1">Mensagens privadas em tempo real</p>
                </div>
              ) : (
                dmMessages.map((m) => (
                  <div key={m.id} className="flex gap-3 px-2 py-1 hover:bg-[#2E3035] rounded">
                    <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-sm shrink-0">{m.sender_id === user?.id ? "😎" : "👤"}</div>
                    <div>
                      <div className="flex items-baseline gap-2"><span className="font-medium text-sm" style={{ color: m.sender_id === user?.id ? "#5865F2" : "#FEE75C" }}>{m.username}</span><span className="text-xs text-zinc-500">{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></div>
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
                  <input value={dmInput} onChange={(e) => setDmInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleDMSend()} placeholder={`Mensagem para @${dmConversations.find((d) => d.id === selectedDM)?.otherUser?.username || ""}`} className="flex-1 bg-transparent outline-none placeholder:text-zinc-400 text-[15px] min-w-0" />
                  <button onClick={handleDMSend} className="bg-[#5865F2] hover:bg-[#4752C4] text-white p-1.5 rounded-full"><Send className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="h-12 flex items-center px-4 gap-3 border-b border-[#1F2124] shadow-sm shrink-0">
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

      {/* Members - desktop */}
      <div className="hidden lg:flex w-60 bg-[#2B2D31] flex-col shrink-0 overflow-y-auto">
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
            <h3 className="text-xs font-semibold text-zinc-400 tracking-wide px-2">OFFLINE — {allProfiles.filter((p) => !onlineMembers.some((o) => o.id === p.id)).length}</h3>
            {allProfiles.filter((p) => !onlineMembers.some((o) => o.id === p.id)).slice(0, 20).map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-2 py-1 rounded opacity-60 hover:opacity-100 hover:bg-[#35373C] cursor-pointer group">
                <div className="relative"><div className="w-8 h-8 rounded-full bg-[#41434A] flex items-center justify-center text-sm grayscale">{m.avatar}</div><div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2B2D31] bg-zinc-500" /></div>
                <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate text-zinc-500 group-hover:text-zinc-300">{m.username}</div><div className="text-xs text-zinc-600">Offline</div></div>
              </div>
            ))}
            {allProfiles.filter((p) => !onlineMembers.some((o) => o.id === p.id)).length === 0 && <p className="text-xs text-zinc-600 px-2">Nenhum offline</p>}
          </div>
          <div className="bg-[#232428] rounded-lg p-3 mt-4">
            <h4 className="font-bold text-sm mb-1">✅ Presença Ativa</h4>
            <p className="text-xs text-zinc-400">Seu status: {statusConfig[status].label}</p>
            <p className="text-xs text-[#23A559] mt-1">● {onlineMembers.length} online agora</p>
            <p className="text-[10px] text-zinc-500 mt-2 font-mono">{APP_VERSION}</p>
          </div>
        </div>
      </div>

      {/* Members - mobile overlay */}
      <div className={`${showMobileMembers ? "translate-x-0" : "translate-x-full"} lg:hidden fixed inset-y-0 right-0 z-50 w-60 bg-[#2B2D31] flex flex-col shrink-0 overflow-y-auto transition-transform duration-200`}>
        <div className="p-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-zinc-400 tracking-wide px-2">ONLINE — {onlineMembers.length}</h3>
            <button onClick={() => setShowMobileMembers(false)} className="p-1 hover:bg-[#404249] rounded"><X className="w-4 h-4" /></button>
          </div>
          {onlineMembers.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-2 py-1 rounded hover:bg-[#35373C] cursor-pointer group">
              <div className="relative"><div className="w-8 h-8 rounded-full bg-[#41434A] flex items-center justify-center text-sm">{m.avatar}</div><div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2B2D31] ${statusConfig[m.status as keyof typeof statusConfig]?.color || "bg-[#23A559]"}`} /></div>
              <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate text-zinc-300 group-hover:text-white">{m.username}</div><div className="text-xs text-zinc-500 truncate">{statusConfig[m.status as keyof typeof statusConfig]?.label || m.status}</div></div>
            </div>
          ))}
          {onlineMembers.length === 0 && <p className="text-xs text-zinc-500 px-2">Ninguém online além de você. Convide amigos!</p>}
          <div className="border-t border-[#3F4147] pt-3 space-y-1">
            <h3 className="text-xs font-semibold text-zinc-400 tracking-wide px-2">OFFLINE — {allProfiles.filter((p) => !onlineMembers.some((o) => o.id === p.id)).length}</h3>
            {allProfiles.filter((p) => !onlineMembers.some((o) => o.id === p.id)).slice(0, 20).map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-2 py-1 rounded opacity-60 hover:opacity-100 hover:bg-[#35373C] cursor-pointer group">
                <div className="relative"><div className="w-8 h-8 rounded-full bg-[#41434A] flex items-center justify-center text-sm grayscale">{m.avatar}</div><div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#2B2D31] bg-zinc-500" /></div>
                <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate text-zinc-500 group-hover:text-zinc-300">{m.username}</div><div className="text-xs text-zinc-600">Offline</div></div>
              </div>
            ))}
            {allProfiles.filter((p) => !onlineMembers.some((o) => o.id === p.id)).length === 0 && <p className="text-xs text-zinc-600 px-2">Nenhum offline</p>}
          </div>
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

      {showCreateServerModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#313338] rounded-lg w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-1">{editingServer ? "Editar servidor" : "Criar servidor"}</h2>
            <p className="text-sm text-zinc-400 mb-4">{editingServer ? `Editando ${editingServer.name}` : "Um novo espaço para seus amigos"}</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase">Nome *</label>
                <input value={newServerName} onChange={(e) => setNewServerName(e.target.value)} placeholder="ex: Casa dos Amigos" className="w-full mt-1 bg-[#2B2D31] border border-[#1E1F22] rounded px-3 py-2 text-white outline-none focus:border-[#5865F2]" autoFocus />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase">Ícone</label>
                <div className="grid grid-cols-8 gap-2 mt-2">
                  {["🏠","🎮","📚","🔥","⭐","🚀","💬","🎵","🎨","💻","📢","🎲","🏆","🌟","💡","⚡","❤️","🍕"].map((ic) => (
                    <button key={ic} onClick={() => { setNewServerIcon(ic); setNewServerImage(null); setNewServerPreview(""); }} className={`w-9 h-9 rounded flex items-center justify-center text-lg border ${newServerIcon === ic && !newServerImage ? "bg-[#5865F2] border-[#5865F2]" : "bg-[#2B2D31] border-[#1E1F22] hover:bg-[#404249]"}`}>{ic}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase">Ou imagem do computador</label>
                <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0] || null; setNewServerImage(f); if (f) setNewServerPreview(URL.createObjectURL(f)); else setNewServerPreview(editingServer?.image_url || ""); }} className="w-full mt-1 text-sm text-zinc-400 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-[#404249] file:text-white hover:file:bg-[#4A4D53]" />
                {newServerPreview && <img src={newServerPreview} alt="preview" className="w-16 h-16 rounded-2xl object-cover mt-2 border border-[#404249]" />}
                {newServerPreview && <button onClick={() => { setNewServerImage(null); setNewServerPreview(""); }} className="text-xs text-red-400 hover:underline ml-2">Remover imagem</button>}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateServerModal(false)} className="px-4 py-2 text-sm hover:underline">Cancelar</button>
              <button onClick={handleServerSave} disabled={!newServerName.trim() || creatingServer} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 rounded text-sm font-medium text-white">{creatingServer ? "Salvando..." : editingServer ? "Salvar" : "Criar"}</button>
            </div>
          </div>
        </div>
      )}

      {showNewDMModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#313338] rounded-lg w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-1">Nova DM</h2>
            <p className="text-sm text-zinc-400 mb-4">Digite o username do amigo</p>
            <input value={newDMUsername} onChange={(e) => setNewDMUsername(e.target.value)} placeholder="ex: wellington" className="w-full bg-[#2B2D31] border border-[#1E1F22] rounded px-3 py-2 text-white outline-none focus:border-[#5865F2]" autoFocus />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowNewDMModal(false)} className="px-4 py-2 text-sm hover:underline">Cancelar</button>
              <button onClick={createDM} disabled={!newDMUsername.trim() || creatingDM} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 rounded text-sm font-medium text-white">{creatingDM ? "Criando..." : "Criar DM"}</button>
            </div>
          </div>
        </div>
      )}

      {showCreateChannelModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#313338] rounded-lg w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-1">Criar canal</h2>
            <p className="text-sm text-zinc-400 mb-4">Em {currentServer?.name}</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase">Nome do canal *</label>
                <input value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="ex: geral" className="w-full mt-1 bg-[#2B2D31] border border-[#1E1F22] rounded px-3 py-2 text-white outline-none focus:border-[#5865F2]" autoFocus />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase">Tipo</label>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setNewChannelType("text")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded border ${newChannelType === "text" ? "bg-[#404249] border-[#5865F2] text-white" : "bg-[#2B2D31] border-[#1E1F22] text-zinc-400"}`}><Hash className="w-4 h-4" /> Texto</button>
                  <button onClick={() => setNewChannelType("voice")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded border ${newChannelType === "voice" ? "bg-[#404249] border-[#5865F2] text-white" : "bg-[#2B2D31] border-[#1E1F22] text-zinc-400"}`}><Volume2 className="w-4 h-4" /> Voz</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase">Ícone predefinido</label>
                <div className="grid grid-cols-8 gap-2 mt-2">
                  {["💬","🔥","🎮","🎵","📚","💡","🚀","😂","❤️","📌","🔒","⭐","🎨","💻","📢","🎲","🎯","📝","🔔","💎"].map((ic) => (
                    <button key={ic} onClick={() => { setNewChannelIcon(ic); setNewChannelImage(null); setNewChannelPreview(""); }} className={`w-9 h-9 rounded flex items-center justify-center text-lg border ${newChannelIcon === ic && !newChannelImage ? "bg-[#5865F2] border-[#5865F2]" : "bg-[#2B2D31] border-[#1E1F22] hover:bg-[#404249]"}`}>{ic}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-300 uppercase">Ou imagem do computador</label>
                <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0] || null; setNewChannelImage(f); if (f) setNewChannelPreview(URL.createObjectURL(f)); else setNewChannelPreview(""); }} className="w-full mt-1 text-sm text-zinc-400 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-[#404249] file:text-white hover:file:bg-[#4A4D53]" />
                {newChannelPreview && <img src={newChannelPreview} alt="preview" className="w-12 h-12 rounded object-cover mt-2 border border-[#404249]" />}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateChannelModal(false)} className="px-4 py-2 text-sm hover:underline">Cancelar</button>
              <button onClick={handleCreateChannel} disabled={!newChannelName.trim() || creatingChannel} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 rounded text-sm font-medium text-white">{creatingChannel ? "Criando..." : "Criar canal"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </VoiceProvider>
  );
}
