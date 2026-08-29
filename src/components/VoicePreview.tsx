"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Props = { channelId: string };

export default function VoicePreview({ channelId }: Props) {
  const [peers, setPeers] = useState<{ id: string; username: string }[]>([]);
  const [duration, setDuration] = useState("0:00");

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel(`voice:global`, { config: { presence: { key: `preview-${channelId}-${Math.random()}` } } });
    const update = () => {
      const state: any = ch.presenceState();
      const ids: { id: string; username: string; channelId: string }[] = [];
      Object.values(state).forEach((arr: any) => (arr as any[]).forEach((p: any) => ids.push(p)));
      const filtered = ids.filter((p) => p.channelId === channelId);
      const uniq = Array.from(new Map(filtered.map((m) => [m.id, m])).values());
      setPeers(uniq);
    };
    ch.on("presence", { event: "sync" }, update);
    ch.on("presence", { event: "join" }, update);
    ch.on("presence", { event: "leave" }, update);
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channelId]);

  useEffect(() => {
    if (peers.length === 0) return;
    const start = Date.now();
    const iv = setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      setDuration(h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`);
    }, 1000);
    return () => clearInterval(iv);
  }, [peers.length]);

  if (peers.length === 0) return null;

  return (
    <div className="ml-6 mt-1 mb-1 space-y-1">
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span className="w-2 h-2 rounded-full bg-[#23A559] animate-pulse" />
        <span>{duration}</span>
      </div>
      {peers.map((p) => (
        <div key={p.id} className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-[#35373C]">
          <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.username)}`} alt="" className="w-5 h-5 rounded-full bg-[#41434A]" />
          <span className="text-xs text-zinc-300 truncate">{p.username}</span>
          <span className="ml-auto text-[10px] text-zinc-500">🔊</span>
        </div>
      ))}
    </div>
  );
}
