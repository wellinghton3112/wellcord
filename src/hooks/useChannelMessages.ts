"use client";
import { useEffect, useState } from "react";
import type { Message } from "@/lib/chat-types";
import { formatTime } from "@/lib/chat-types";

// Mensagens do canal: carga, realtime e envio.
// Extraído de page.tsx sem mudança de comportamento.
export function useChannelMessages(supabase: any, user: any, username: string, selectedChannel: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

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
  }, [selectedChannel, supabase]);

  const channelMessages = messages.filter((m) => m.channelId === selectedChannel);

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

  return { messages, channelMessages, input, setInput, handleSend };
}
