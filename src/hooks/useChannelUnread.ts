"use client";
import { useEffect, useRef, useState } from "react";

// Não-lidas de canais: listener global + última leitura persistida.
export function useChannelUnread(supabase: any, user: any, selectedChannel: string, viewMode: "server" | "dm") {
  const [unread, setUnread] = useState<Record<string, number>>({});
  const selectedRef = useRef(selectedChannel);
  const modeRef = useRef(viewMode);
  selectedRef.current = selectedChannel;
  modeRef.current = viewMode;

  // Marca leitura ao abrir o canal (limpa + persiste)
  useEffect(() => {
    if (!user || !selectedChannel || selectedChannel.startsWith("fallback")) return;
    setUnread((prev) => {
      if (!prev[selectedChannel]) return prev;
      console.log("[ch] limpando badge de", selectedChannel);
      const next = { ...prev };
      delete next[selectedChannel];
      return next;
    });
    supabase
      .from("channel_reads")
      .upsert({ channel_id: selectedChannel, user_id: user.id, last_read_at: new Date().toISOString() }, { onConflict: "channel_id,user_id" })
      .then(() => {});
  }, [user, selectedChannel, supabase]);

  // Inbox global de canais (RLS entrega só o que posso ver)
  useEffect(() => {
    if (!user) return;
    const inbox = supabase
      .channel("channels-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload: any) => {
        const r = payload.new;
        console.log("[ch] inbox evento:", r?.channel_id, (r?.content || "").slice(0, 30));
        if (!r?.channel_id || r.user_id === user.id) return;
        // Só pula se estou OLHANDO o canal (modo server + canal atual)
        if (modeRef.current === "server" && selectedRef.current === r.channel_id) return;
        setUnread((prev) => {
          const next = { ...prev, [r.channel_id]: (prev[r.channel_id] || 0) + 1 };
          console.log("[ch] unread agora:", JSON.stringify(next));
          return next;
        });
      })
      .subscribe((status: string, err?: any) => {
        console.log("[ch] inbox status:", status, err || "");
      });
    return () => { supabase.removeChannel(inbox); };
  }, [user, supabase]);

  return { channelUnread: unread };
}
