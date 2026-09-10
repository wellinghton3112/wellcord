"use client";
import { useEffect, useRef, useState } from "react";
import type { PresenceUser } from "@/lib/chat-types";

// Presença realtime + lista de perfis para offline.
export function usePresence(supabase: any, user: any, username: string, avatar: string = "😎") {
  const [status, setStatus] = useState<"online" | "idle" | "dnd" | "invisible">("online");
  const [onlineMembers, setOnlineMembers] = useState<PresenceUser[]>([]);
  const [allProfiles, setAllProfiles] = useState<PresenceUser[]>([]);
  const channelRef = useRef<any>(null);
  const statusRef = useRef(status);
  const usernameRef = useRef(username);
  const avatarRef = useRef(avatar);
  statusRef.current = status;
  usernameRef.current = username;
  avatarRef.current = avatar;

  // Subscribe ONCE — never tears down on status/username/avatar changes
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("presence:global", { config: { presence: { key: user.id } } });
    channelRef.current = ch;
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
      if (s === "SUBSCRIBED") {
        await ch.track({ id: user.id, username: usernameRef.current, avatar: avatarRef.current, status: statusRef.current, email: user.email });
      }
    });
    return () => { channelRef.current = null; supabase.removeChannel(ch); };
  }, [user, supabase]); // only depends on user — no re-subscribe on status/username/avatar

  // Re-track presence when status/username/avatar changes (no teardown)
  useEffect(() => {
    const ch = channelRef.current;
    if (!ch || !user) return;
    ch.track({ id: user.id, username, avatar, status, email: user.email }).catch(() => {});
  }, [user, username, avatar, status]);

  // Todos os perfis para lista offline (uma vez por login — sem loop por presença)
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("id, username, avatar").then(({ data }: any) => {
      if (data) setAllProfiles(data.map((p: any) => ({ id: p.id, username: p.username, avatar: p.avatar || "😎", status: "offline" as const })));
    });
  }, [user, supabase]);

  return { status, setStatus, onlineMembers, allProfiles };
}
