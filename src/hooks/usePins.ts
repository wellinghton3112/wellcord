"use client";
import { useEffect, useState } from "react";

export type PinnedItem = {
  message_id: string;
  pinned_at: string;
  content: string;
  username: string;
  created_at: string;
};

// Pins do canal: fixar (dono ou autor), listar e pular. Novo (feature pins).
export function usePins(supabase: any, user: any, selectedChannel: string, isOwner: boolean) {
  const [pins, setPins] = useState<PinnedItem[]>([]);
  const pinnedIds = new Set(pins.map((p) => p.message_id));

  const load = async () => {
    if (!selectedChannel || selectedChannel.startsWith("fallback")) { setPins([]); return; }
    const { data } = await supabase
      .from("pinned_messages")
      .select("message_id, pinned_at")
      .eq("channel_id", selectedChannel)
      .order("pinned_at", { ascending: false });
    if (!data || data.length === 0) { setPins([]); return; }
    const ids = data.map((r: any) => r.message_id);
    const { data: msgs } = await supabase.from("messages").select("id, content, username, created_at").in("id", ids);
    const byId = new Map<string, any>((msgs || []).map((m: any) => [m.id, m]));
    setPins(
      data.flatMap((r: any) => {
        const m = byId.get(r.message_id);
        return m ? [{ message_id: r.message_id, pinned_at: r.pinned_at, content: m.content, username: m.username, created_at: m.created_at }] : [];
      })
    );
  };

  useEffect(() => { load(); }, [selectedChannel]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedChannel || selectedChannel.startsWith("fallback")) return;
    const ch = supabase
      .channel(`pins-${selectedChannel}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pinned_messages", filter: `channel_id=eq.${selectedChannel}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannel, supabase]);

  const canPin = (messageUserId?: string | null) =>
    !!user && (isOwner || (!!messageUserId && messageUserId === user.id));

  const togglePin = async (messageId: string) => {
    if (!user) return;
    if (pinnedIds.has(messageId)) {
      const { error } = await supabase.from("pinned_messages").delete().eq("channel_id", selectedChannel).eq("message_id", messageId);
      if (error) alert("Erro ao desafixar: " + error.message);
    } else {
      const { error } = await supabase.from("pinned_messages").insert({ channel_id: selectedChannel, message_id: messageId, pinned_by: user.id });
      if (error) alert("Erro ao fixar: " + error.message);
    }
  };

  return { pins, pinnedIds, canPin, togglePin };
}
