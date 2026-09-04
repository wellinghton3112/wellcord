"use client";
import { useEffect, useRef, useState } from "react";
import type { DMConversation, DMMessage, ReactionMap, ReplyTarget } from "@/lib/chat-types";
import { groupReactions } from "@/lib/chat-types";

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
  const [dmReplyTo, setDmReplyTo] = useState<ReplyTarget | null>(null);
  const [dmReactions, setDmReactions] = useState<ReactionMap>({});
  const [newDMUsername, setNewDMUsername] = useState("");
  const [creatingDM, setCreatingDM] = useState(false);
  const [unread, setUnread] = useState<Record<string, number>>({});
  // Refs para usar estado atual dentro de subscriptions estáveis
  const convIdsRef = useRef<Set<string>>(new Set());
  const selectedDMRef = useRef<string | null>(null);
  convIdsRef.current = new Set(dmConversations.map((c) => c.id));
  selectedDMRef.current = selectedDM;

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

  // Inbox global: pega msg de QUALQUER conversa (RLS filtra só as minhas).
  // Sem isso, DM criada por outro depois do meu login nunca chega sem F5.
  useEffect(() => {
    if (!user) return;
    const inbox = supabase
      .channel("dm-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, (payload: any) => {
        const r = payload.new;
        if (!r?.conversation_id || r.sender_id === user.id) return;
        if (!convIdsRef.current.has(r.conversation_id)) {
          loadDMs(); // conversa nova vinda de outro: atualiza a lista
        }
        if (selectedDMRef.current !== r.conversation_id) {
          setUnread((prev) => ({ ...prev, [r.conversation_id]: (prev[r.conversation_id] || 0) + 1 }));
        }
      })
      .subscribe((status: string) => {
        if (status !== "SUBSCRIBED") console.warn("[dm] inbox status:", status);
      });
    return () => { supabase.removeChannel(inbox); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, supabase]);

  // Abrir a conversa zera as não-lidas dela
  useEffect(() => {
    if (!selectedDM) return;
    setUnread((prev) => {
      if (!prev[selectedDM]) return prev;
      const next = { ...prev };
      delete next[selectedDM];
      return next;
    });
  }, [selectedDM]);

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
          reply_to: r.reply_to || null,
          reply_user: r.reply_user || null,
          reply_content: r.reply_content || null,
        }))
      );
      const ids = data.map((r: any) => r.id);
      if (ids.length > 0) {
        const { data: reacts } = await supabase.from("dm_reactions").select("message_id, user_id, emoji").in("message_id", ids);
        if (!cancelled) setDmReactions(groupReactions((reacts || []) as any[], user?.id));
      } else if (!cancelled) {
        setDmReactions({});
      }
    };
    load();
    // Um canal por conversa: INSERT (filtrado) + UPDATE/DELETE (sem filtro, old só tem id)
    const ch = supabase.channel(`dm-${selectedDM}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${selectedDM}` }, async (payload: any) => {
      const r = payload.new;
      setDmMessages((prev) => {
        if (prev.some((m) => m.id === r.id)) return prev;
        // Reusa nome já conhecido; senão insere temporário e resolve async (1 query só quando necessário)
        const known = prev.find((m) => m.sender_id === r.sender_id)?.username;
        if (known) return [...prev, { id: r.id, conversation_id: r.conversation_id, sender_id: r.sender_id, username: known, content: r.content, created_at: r.created_at, reply_to: r.reply_to || null, reply_user: r.reply_user || null, reply_content: r.reply_content || null }];
        supabase.from("profiles").select("username").eq("id", r.sender_id).single().then(({ data: prof }: any) => {
          setDmMessages((cur) => cur.map((m) => (m.id === r.id ? { ...m, username: prof?.username || r.sender_id.slice(0, 6) } : m)));
        });
        return [...prev, { id: r.id, conversation_id: r.conversation_id, sender_id: r.sender_id, username: r.sender_id.slice(0, 6), content: r.content, created_at: r.created_at, reply_to: r.reply_to || null, reply_user: r.reply_user || null, reply_content: r.reply_content || null }];
      });
    }).on("postgres_changes", { event: "UPDATE", schema: "public", table: "dm_messages" }, (payload: any) => {
      const r = payload.new;
      if (!r?.id || r.conversation_id !== selectedDM) return;
      setDmMessages((prev) => prev.map((m) => (m.id === r.id ? { ...m, content: r.content } : m)));
    }).on("postgres_changes", { event: "DELETE", schema: "public", table: "dm_messages" }, (payload: any) => {
      const old = payload.old;
      if (!old?.id) return;
      setDmMessages((prev) => prev.filter((m) => m.id !== old.id));
    }).subscribe((status: string) => {
      if (status !== "SUBSCRIBED") console.warn(`[dm] canal ${selectedDM} status:`, status);
    });
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [selectedDM, supabase]);

  // Reações da DM em canal separado (fault isolation se a migration estiver pendente)
  useEffect(() => {
    if (!selectedDM) return;
    const refresh = async () => {
      const { data } = await supabase.from("dm_messages").select("id").eq("conversation_id", selectedDM).limit(100);
      const ids = (data || []).map((r: any) => r.id);
      if (ids.length === 0) { setDmReactions({}); return; }
      const { data: reacts } = await supabase.from("dm_reactions").select("message_id, user_id, emoji").in("message_id", ids);
      setDmReactions(groupReactions((reacts || []) as any[], user?.id));
    };
    const rc = supabase
      .channel(`dm-reactions-${selectedDM}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_reactions" }, () => refresh())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "dm_reactions" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(rc); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDM, supabase]);

  const handleDMSend = async () => {
    if (!dmInput.trim() || !selectedDM || !user) return;
    const content = dmInput;
    const reply = dmReplyTo;
    setDmInput("");
    setDmReplyTo(null);
    const { error } = await supabase.from("dm_messages").insert({
      conversation_id: selectedDM,
      sender_id: user.id,
      content,
      reply_to: reply?.id || null,
      reply_user: reply?.user || null,
      reply_content: reply?.content || null,
    });
    if (error) { alert(error.message); setDmInput(content); setDmReplyTo(reply); }
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

  const toggleDMReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const mine = dmReactions[messageId]?.find((r) => r.emoji === emoji)?.mine;
    if (mine) {
      const { error } = await supabase.from("dm_reactions").delete().eq("message_id", messageId).eq("user_id", user.id).eq("emoji", emoji);
      if (error) alert("Erro ao remover reação: " + error.message);
    } else {
      const { error } = await supabase.from("dm_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
      if (error) alert("Erro ao reagir: " + error.message);
    }
  };

  return {
    dmConversations, selectedDM, setSelectedDM,
    dmMessages, dmInput, setDmInput, handleDMSend, editDMMessage, deleteDMMessage,
    dmReactions, toggleDMReaction, unread,
    dmReplyTo, setDmReplyTo,
    newDMUsername, setNewDMUsername, creatingDM, createDM,
  };
}
