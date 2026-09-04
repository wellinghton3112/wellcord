"use client";
import { useEffect, useState } from "react";
import type { PresenceUser } from "@/lib/chat-types";

// Presença realtime + lista de perfis para offline.
// Extraído de page.tsx sem mudança de comportamento.
export function usePresence(supabase: any, user: any, username: string) {
  const [status, setStatus] = useState<"online" | "idle" | "dnd" | "invisible">("online");
  const [onlineMembers, setOnlineMembers] = useState<PresenceUser[]>([]);
  const [allProfiles, setAllProfiles] = useState<PresenceUser[]>([]);

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
    ch.subscribe(async (s: string) => {
      if (s === "SUBSCRIBED" && status !== "invisible") {
        await ch.track({ id: user.id, username, avatar: "😎", status, email: user.email });
      }
    });
    return () => { supabase.removeChannel(ch); };
  }, [user, username, status, supabase]);

  // Todos os perfis para lista offline (uma vez por login — sem loop por presença)
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("id, username, avatar").then(({ data }: any) => {
      if (data) setAllProfiles(data.map((p: any) => ({ id: p.id, username: p.username, avatar: p.avatar || "😎", status: "offline" as const })));
    });
  }, [user, supabase]);

  return { status, setStatus, onlineMembers, allProfiles };
}
