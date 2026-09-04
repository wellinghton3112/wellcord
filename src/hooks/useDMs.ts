"use client";
import { useEffect, useState } from "react";
import type { DMConversation, DMMessage } from "@/lib/chat-types";

// DMs: conversas, mensagens com batch de profiles, envio e criação.
// Extraído de page.tsx sem mudança de comportamento.
export function useDMs(
  supabase: any,
  user: any,
  setViewMode: (m: "server" | "dm") => void,
  setShowNewDMModal: (v: boolean) => void,
) {
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
  const [selectedDM, setSelectedDM] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<DMMessage[]>([]);
  const [dmInput, setDmInput] = useState("");
  const [newDMUsername, setNewDMUsername] = useState("");
  const [creatingDM, setCreatingDM] = useState(false);

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
      const other = participants.find((x: { id: string }) => x.id !== user.id);
      return { id, participants, otherUser: other };
    });
    setDmConversations(convs);
  };

  useEffect(() => { if (user) loadDMs(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedDM) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from("dm_messages").select("*").eq("conversation_id", selectedDM).order("created_at", { ascending: true }).limit(100);
      if (!data || cancelled) return;
      // Batch: 1 query de profiles para todos os senders (evita N+1)
      const senderIds = [...new Set(data.map((r: any) => r.sender_id))];
      const nameMap = new Map<string, string>();
      if (senderIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, username").in("id", senderIds);
        (profs || []).forEach((p: any) => nameMap.set(p.id, p.username));
      }
      if (cancelled) return;
      setDmMessages(
        data.map((r: any) => ({
          id: r.id,
          conversation_id: r.conversation_id,
          sender_id: r.sender_id,
          username: nameMap.get(r.sender_id) || r.sender_id.slice(0, 6),
          content: r.content,
          created_at: r.created_at,
        }))
      );
    };
    load();
    const ch = supabase.channel(`dm-${selectedDM}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${selectedDM}` }, async (payload: any) => {
      const r = payload.new;
      setDmMessages((prev) => {
        if (prev.some((m) => m.id === r.id)) return prev;
        // Reusa nome já conhecido; senão insere temporário e resolve async (1 query só quando necessário)
        const known = prev.find((m) => m.sender_id === r.sender_id)?.username;
        if (known) return [...prev, { id: r.id, conversation_id: r.conversation_id, sender_id: r.sender_id, username: known, content: r.content, created_at: r.created_at }];
        supabase.from("profiles").select("username").eq("id", r.sender_id).single().then(({ data: prof }: any) => {
          setDmMessages((cur) => cur.map((m) => (m.id === r.id ? { ...m, username: prof?.username || r.sender_id.slice(0, 6) } : m)));
        });
        return [...prev, { id: r.id, conversation_id: r.conversation_id, sender_id: r.sender_id, username: r.sender_id.slice(0, 6), content: r.content, created_at: r.created_at }];
      });
    }).subscribe();
    // Edições/exclusões: sem filtro (old só tem id) — filtra pelo id no handler
    const upd = supabase.channel("dm-updates").on("postgres_changes", { event: "UPDATE", schema: "public", table: "dm_messages" }, (payload: any) => {
      const r = payload.new;
      if (!r?.id) return;
      setDmMessages((prev) => prev.map((m) => (m.id === r.id ? { ...m, content: r.content } : m)));
    }).on("postgres_changes", { event: "DELETE", schema: "public", table: "dm_messages" }, (payload: any) => {
      const old = payload.old;
      if (!old?.id) return;
      setDmMessages((prev) => prev.filter((m) => m.id !== old.id));
    }).subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); supabase.removeChannel(upd); };
  }, [selectedDM, supabase]);

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
    const { data: prof } = await supabase.from("profiles").select("id, username").ilike("username", `%${newDMUsername.trim()}%`).limit(1).maybeSingle();
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
    // ID gerado no client: o insert NÃO usa .select() porque a policy de SELECT
    // só libera para participantes — e no momento do INSERT ainda não somos.
    // (insert().select() exige SELECT na linha nova e dava 403 RLS)
    const convId = crypto.randomUUID();
    const { error } = await supabase.from("dm_conversations").insert({ id: convId });
    if (error) { alert(error?.message || "Erro"); setCreatingDM(false); return; }
    await supabase.from("dm_participants").insert([{ conversation_id: convId, user_id: user.id }, { conversation_id: convId, user_id: prof.id }]);
    await loadDMs();
    setSelectedDM(convId);
    setViewMode("dm");
    setShowNewDMModal(false);
    setCreatingDM(false);
  };

  const editDMMessage = async (id: string, content: string) => {
    if (!content.trim()) return;
    const { error } = await supabase.from("dm_messages").update({ content }).eq("id", id);
    if (error) alert("Erro ao editar: " + error.message);
  };

  const deleteDMMessage = async (id: string) => {
    if (!confirm("Excluir esta mensagem?")) return;
    const { error } = await supabase.from("dm_messages").delete().eq("id", id);
    if (error) alert("Erro ao excluir: " + error.message);
  };

  return {
    dmConversations, selectedDM, setSelectedDM,
    dmMessages, dmInput, setDmInput, handleDMSend, editDMMessage, deleteDMMessage,
    newDMUsername, setNewDMUsername, creatingDM, createDM,
  };
}
