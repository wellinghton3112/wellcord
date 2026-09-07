"use client";
import { useEffect, useState } from "react";

export type ActiveVoice = {
  serverId: string;
  serverName: string;
  channelId: string;
  channelName: string;
  users: { id: string; username: string; avatar: string }[];
};

// Quem está em voz agora, agrupado por canal. Novo (Ativo agora).
export function useActiveNow(supabase: any, user: any, friendIds: string[]) {
  const [active, setActive] = useState<ActiveVoice[]>([]);
  const friendsKey = [...friendIds].sort().join(",");

  const load = async () => {
    if (!user) { setActive([]); return; }
    const { data: sessions } = await supabase.from("voice_sessions").select("channel_id, user_id, username");
    if (!sessions || sessions.length === 0) { setActive([]); return; }
    const channelIds = [...new Set(sessions.map((s: any) => s.channel_id))];
    const { data: channels } = await supabase.from("channels").select("id, name, server_id").in("id", channelIds);
    const serverIds = [...new Set((channels || []).map((c: any) => c.server_id))];
    const { data: servers } = serverIds.length > 0
      ? await supabase.from("servers").select("id, name").in("id", serverIds)
      : { data: [] };
    const userIds = [...new Set(sessions.map((s: any) => s.user_id))];
    const { data: profs } = userIds.length > 0
      ? await supabase.from("profiles").select("id, username, avatar").in("id", userIds)
      : { data: [] };
    const profMap = new Map<string, any>((profs || []).map((p: any) => [p.id, p]));
    const byChannel = new Map<string, ActiveVoice>();
    for (const s of sessions as any[]) {
      const ch = (channels || []).find((c: any) => c.id === s.channel_id);
      if (!ch) continue;
      const srv = (servers || []).find((x: any) => x.id === ch.server_id);
      let g = byChannel.get(ch.id);
      if (!g) {
        g = { serverId: ch.server_id, serverName: srv?.name || "Servidor", channelId: ch.id, channelName: ch.name, users: [] };
        byChannel.set(ch.id, g);
      }
      const pr = profMap.get(s.user_id);
      g.users.push({ id: s.user_id, username: pr?.username || s.username, avatar: pr?.avatar || "😎" });
    }
    // Amigos primeiro
    const friends = new Set(friendIds);
    setActive(
      [...byChannel.values()].sort((a, b) => {
        const fa = a.users.some((u) => friends.has(u.id)) ? 0 : 1;
        const fb = b.users.some((u) => friends.has(u.id)) ? 0 : 1;
        return fa - fb;
      })
    );
  };

  useEffect(() => { load(); }, [user, friendsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("active-now")
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_sessions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, supabase]);

  return { active };
}
