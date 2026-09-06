"use client";
import { useEffect, useState } from "react";
import type { Poll } from "@/lib/chat-types";

// Enquetes do canal: criar, votar (troca liberada) e realtime. Novo (feature polls).
export function usePolls(supabase: any, user: any, username: string, selectedChannel: string) {
  const [polls, setPolls] = useState<Poll[]>([]);

  const load = async () => {
    if (!selectedChannel || selectedChannel.startsWith("fallback")) { setPolls([]); return; }
    const { data } = await supabase.from("polls").select("*").eq("channel_id", selectedChannel).order("created_at");
    if (!data || data.length === 0) { setPolls([]); return; }
    const ids = data.map((p: any) => p.id);
    const { data: opts } = await supabase.from("poll_options").select("*").in("poll_id", ids).order("position");
    const { data: votes } = await supabase.from("poll_votes").select("poll_id, option_id, user_id").in("poll_id", ids);
    setPolls(
      data.map((p: any) => {
        const po = (opts || []).filter((o: any) => o.poll_id === p.id);
        const pv = (votes || []).filter((v: any) => v.poll_id === p.id);
        const options = po.map((o: any) => ({
          id: o.id,
          label: o.label,
          position: o.position,
          votes: pv.filter((v: any) => v.option_id === o.id).length,
          mine: pv.some((v: any) => v.option_id === o.id && v.user_id === user?.id),
        }));
        return {
          id: p.id,
          question: p.question,
          username: p.username,
          user_id: p.user_id,
          created_at: p.created_at,
          options,
          totalVotes: pv.length,
        };
      })
    );
  };

  useEffect(() => { load(); }, [selectedChannel]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedChannel || selectedChannel.startsWith("fallback")) return;
    const ch = supabase
      .channel(`polls-${selectedChannel}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "polls", filter: `channel_id=eq.${selectedChannel}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_options" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannel, supabase]);

  const createPoll = async (question: string, labels: string[]) => {
    if (!user || !question.trim() || labels.filter((l) => l.trim()).length < 2) return null;
    const clean = labels.map((l) => l.trim()).filter(Boolean).slice(0, 8);
    const { data: poll, error } = await supabase
      .from("polls")
      .insert({ channel_id: selectedChannel, user_id: user.id, username, question: question.trim() })
      .select()
      .single();
    if (error || !poll) { alert("Erro ao criar enquete: " + (error?.message || "")); return null; }
    const { error: optErr } = await supabase.from("poll_options").insert(
      clean.map((label, i) => ({ poll_id: poll.id, label, position: i }))
    );
    if (optErr) alert("Enquete criada, mas falhou opções: " + optErr.message);
    await load();
    return poll.id as string;
  };

  const toggleVote = async (pollId: string, optionId: string) => {
    if (!user) return;
    const poll = polls.find((p) => p.id === pollId);
    const mine = poll?.options.find((o) => o.id === optionId)?.mine;
    if (mine) {
      const { error } = await supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("user_id", user.id);
      if (error) alert("Erro ao tirar voto: " + error.message);
    } else {
      const { error } = await supabase
        .from("poll_votes")
        .upsert({ poll_id: pollId, option_id: optionId, user_id: user.id }, { onConflict: "poll_id,user_id" });
      if (error) alert("Erro ao votar: " + error.message);
    }
  };

  const deletePoll = async (pollId: string) => {
    if (!confirm("Apagar esta enquete?")) return;
    const { error } = await supabase.from("polls").delete().eq("id", pollId);
    if (error) alert("Erro ao apagar: " + error.message);
  };

  return { polls, createPoll, toggleVote, deletePoll };
}
