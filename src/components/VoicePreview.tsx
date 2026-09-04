"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type Props = { channelId: string };

export default function VoicePreview({ channelId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [peers, setPeers] = useState<{ id: string; username: string; joined_at: string }[]>([]);
  const [callStart, setCallStart] = useState<string | null>(null);
  const [duration, setDuration] = useState("0:00");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("voice_sessions").select("user_id, username, joined_at").eq("channel_id", channelId).order("joined_at", { ascending: true });
      if (data) setPeers(data.map((r: any) => ({ id: r.user_id, username: r.username, joined_at: r.joined_at })));
      const { data: call } = await supabase.from("voice_calls").select("started_at").eq("channel_id", channelId).maybeSingle();
      setCallStart(call?.started_at || null);
    };
    load();
    // Canais separados: se a tabela voice_calls não existir/publicada (migration
    // pendente), só o canal da chamada falha — a lista de presentes segue viva.
    const chSessions = supabase
      .channel(`voice-sessions-${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_sessions", filter: `channel_id=eq.${channelId}` }, () => load())
      .subscribe();
    const chCall = supabase
      .channel(`voice-call-${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_calls", filter: `channel_id=eq.${channelId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(chSessions); supabase.removeChannel(chCall); };
  }, [channelId]);

  // Timer da CHAMADA: início gravado quando o primeiro entrou; só zera quando
  // o último sai (a linha some). Fallback: mais antigo da lista (banco pré-migration).
  useEffect(() => {
    if (peers.length === 0) { setDuration("0:00"); return; }
    const ref = callStart || peers[0].joined_at;
    const start = new Date(ref).getTime();
    if (Number.isNaN(start)) { setDuration("0:00"); return; }
    const tick = () => {
      const s = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      setDuration(h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [peers, callStart]);

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
