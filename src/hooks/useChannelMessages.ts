"use client";
import { useEffect, useState } from "react";
import type { Message, PendingFile, ReactionMap, ReplyTarget } from "@/lib/chat-types";
import { formatTime, groupReactions, MAX_FILE_MB } from "@/lib/chat-types";
import { extractMentions, sendNotify } from "@/lib/notify";

// Mensagens do canal: carga, realtime, envio, reações, respostas e anexos.
export function useChannelMessages(supabase: any, user: any, username: string, selectedChannel: string, serverId?: string, avatar: string = "😎") {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [reactions, setReactions] = useState<ReactionMap>({});
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [uploading, setUploading] = useState(false);

  // Carregar mensagens do canal selecionado + Realtime
  useEffect(() => {
    if (!selectedChannel || selectedChannel.startsWith("fallback")) return;
    let channelSub: any;
    setPendingFile(null);
    setReplyTo(null);

    async function loadMessages() {
      const { data } = await supabase.from("messages").select("*").eq("channel_id", selectedChannel).order("created_at", { ascending: true }).limit(100);
      if (data) {
        setMessages((prev) => {
          const others = prev.filter((m) => m.channelId !== selectedChannel);
          const mapped = data.map((r: any) => ({
            id: r.id,
            user: r.username,
            user_id: r.user_id,
            avatar: r.avatar || "😎",
            color: r.color || "#5865F2",
            content: r.content,
            timestamp: formatTime(r.created_at),
            channelId: r.channel_id,
            created_at: r.created_at,
            reply_to: r.reply_to || null,
            reply_user: r.reply_user || null,
            reply_content: r.reply_content || null,
            mentions: r.mentions || [],
            file_url: r.file_url || null,
            file_name: r.file_name || null,
            file_type: r.file_type || null,
          }));
          return [...others, ...mapped];
        });
        const ids = data.map((r: any) => r.id);
        if (ids.length > 0) {
          const { data: reacts } = await supabase.from("message_reactions").select("message_id, user_id, emoji").in("message_id", ids);
          setReactions(groupReactions((reacts || []) as any[], user?.id));
        } else {
          setReactions({});
        }
      }
    }
    loadMessages();

    channelSub = supabase
      .channel(`messages-${selectedChannel}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${selectedChannel}` }, (payload: any) => {
        const r = payload.new;
        setMessages((prev) => {
          if (prev.some((m) => m.id === r.id)) return prev;
          return [...prev, { id: r.id, user: r.username, user_id: r.user_id, avatar: r.avatar || "😎", color: r.color || "#5865F2", content: r.content, timestamp: formatTime(r.created_at), channelId: r.channel_id, created_at: r.created_at, reply_to: r.reply_to || null, reply_user: r.reply_user || null, reply_content: r.reply_content || null, mentions: r.mentions || [], file_url: r.file_url || null, file_name: r.file_name || null, file_type: r.file_type || null }];
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload: any) => {
        const r = payload.new;
        if (!r || r.channel_id !== selectedChannel) return;
        setMessages((prev) => prev.map((m) => (m.id === r.id ? { ...m, content: r.content } : m)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload: any) => {
        const old = payload.old;
        if (!old?.id) return;
        setMessages((prev) => prev.filter((m) => m.id !== old.id));
      })
      .subscribe();

    return () => { if (channelSub) supabase.removeChannel(channelSub); };
  }, [selectedChannel, supabase]);

  const refreshReactions = async () => {
    const { data } = await supabase.from("messages").select("id").eq("channel_id", selectedChannel).limit(100);
    const ids = (data || []).map((r: any) => r.id);
    if (ids.length === 0) { setReactions({}); return; }
    const { data: reacts } = await supabase.from("message_reactions").select("message_id, user_id, emoji").in("message_id", ids);
    setReactions(groupReactions((reacts || []) as any[], user?.id));
  };

  // Reações em canal separado: se a tabela não existir (migration pendente),
  // só esse canal falha — as mensagens seguem vivas
  useEffect(() => {
    if (!selectedChannel || selectedChannel.startsWith("fallback")) return;
    let reactSub: any;
    reactSub = supabase
      .channel(`reactions-${selectedChannel}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reactions" }, () => refreshReactions())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions" }, () => refreshReactions())
      .subscribe();
    return () => { if (reactSub) supabase.removeChannel(reactSub); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannel, supabase]);

  const channelMessages = messages.filter((m) => m.channelId === selectedChannel);

  const attachFile = async (file: File) => {
    if (!user || !serverId) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) { alert(`Arquivo maior que ${MAX_FILE_MB}MB.`); return; }
    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `ch/${serverId}/${selectedChannel}/${user.id}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from("chat-files").upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("chat-files").getPublicUrl(path);
      setPendingFile({ url: data.publicUrl, name: file.name, type: file.type });
    } catch (e: any) {
      alert("Falha no upload: " + (e?.message || e));
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !pendingFile) || !selectedChannel || !user || uploading) return;
    const content = input;
    const reply = replyTo;
    const file = pendingFile;
    setInput("");
    setReplyTo(null);
    setPendingFile(null);
    // @menções -> ids (para notificar)
    const names = extractMentions(content);
    let mentionIds: string[] = [];
    if (names.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, username").in("username", names);
      mentionIds = (profs || []).map((p: any) => p.id).filter((id: string) => id !== user.id);
    }
    const { error } = await supabase.from("messages").insert({
      channel_id: selectedChannel,
      user_id: user.id,
      username,
      content,
      avatar,
      color: "#5865F2",
      reply_to: reply?.id || null,
      reply_user: reply?.user || null,
      reply_content: reply?.content || null,
      mentions: mentionIds,
      file_url: file?.url || null,
      file_name: file?.name || null,
      file_type: file?.type || null,
    });
    if (error) {
      console.error(error);
      alert("Erro ao enviar: " + error.message);
      setInput(content);
      setReplyTo(reply);
      setPendingFile(file);
      return;
    }
    // Notifica mencionados (fire-and-forget)
    if (mentionIds.length > 0) {
      const snippet = content.slice(0, 80);
      mentionIds.forEach((id) => {
        sendNotify(supabase, id, {
          kind: "channel", from: username, snippet,
          serverId: serverId, channelId: selectedChannel,
        }).catch(() => {});
      });
    }
  };

  const editMessage = async (id: string, content: string) => {
    if (!content.trim()) return;
    const { error } = await supabase.from("messages").update({ content }).eq("id", id);
    if (error) alert("Erro ao editar: " + error.message);
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Excluir esta mensagem?")) return;
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) alert("Erro ao excluir: " + error.message);
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const mine = reactions[messageId]?.find((r) => r.emoji === emoji)?.mine;
    if (mine) {
      const { error } = await supabase.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", user.id).eq("emoji", emoji);
      if (error) alert("Erro ao remover reação: " + error.message);
    } else {
      const { error } = await supabase.from("message_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
      if (error) alert("Erro ao reagir: " + error.message);
    }
  };

  return { messages, channelMessages, input, setInput, handleSend, editMessage, deleteMessage, reactions, toggleReaction, replyTo, setReplyTo, pendingFile, setPendingFile, uploading, attachFile };
}
