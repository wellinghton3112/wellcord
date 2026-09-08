"use client";
import { useState } from "react";
import type { Server } from "@/lib/chat-types";
import { toast, confirmDialog } from "@/lib/ui";

// Ações de servidor/canal: modais, CRUD e upload de ícones.
// Extraído de page.tsx sem mudança de comportamento.
export function useServerActions(
  supabase: any,
  userId: string | undefined,
  servers: Server[],
  currentServer: Server | undefined,
  selectedChannel: string,
  setSelectedServer: (id: string) => void,
  setSelectedChannel: (id: string) => void,
  setShowCreateServerModal: (v: boolean) => void,
  setShowCreateChannelModal: (v: boolean) => void,
) {
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"text" | "voice">("text");
  const [newChannelIcon, setNewChannelIcon] = useState("💬");
  const [newChannelImage, setNewChannelImage] = useState<File | null>(null);
  const [newChannelPreview, setNewChannelPreview] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [newServerIcon, setNewServerIcon] = useState("🏠");
  const [newServerImage, setNewServerImage] = useState<File | null>(null);
  const [newServerPreview, setNewServerPreview] = useState("");
  const [creatingServer, setCreatingServer] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);

  const openCreateServer = () => {
    setEditingServer(null);
    setNewServerName("");
    setNewServerIcon("🏠");
    setNewServerImage(null);
    setNewServerPreview("");
    setShowCreateServerModal(true);
  };
  const canManage = (s: Server) => !s.owner_id || s.owner_id === userId;

  const openEditServer = (s: Server) => {
    if (!canManage(s)) { toast("Só o dono do servidor pode editar."); return; }
    setEditingServer(s);
    setNewServerName(s.name);
    setNewServerIcon(s.icon);
    setNewServerImage(null);
    setNewServerPreview(s.image_url || "");
    setShowCreateServerModal(true);
  };
  const handleServerSave = async () => {
    if (!newServerName.trim()) return;
    if (!userId) { toast("Sessão expirada — faça login de novo antes de criar o servidor."); return; }
    setCreatingServer(true);
    let image_url: string | null = editingServer?.image_url || null;
    if (newServerImage) {
      const ext = newServerImage.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("server-icons").upload(path, newServerImage);
      if (upErr) { toast("Erro ao subir imagem: " + upErr.message); setCreatingServer(false); return; }
      const { data } = supabase.storage.from("server-icons").getPublicUrl(path);
      image_url = data.publicUrl;
    } else if (!newServerPreview && editingServer?.image_url) {
      image_url = null;
    }
    if (editingServer) {
      const { error } = await supabase.from("servers").update({ name: newServerName, icon: newServerIcon, image_url }).eq("id", editingServer.id);
      if (error) toast(error.message);
    } else {
      const { data, error } = await supabase.from("servers").insert({ name: newServerName, icon: newServerIcon, image_url, owner_id: userId }).select().single();
      if (error) { toast(error.message); setCreatingServer(false); return; }
      await supabase.from("channels").insert({ server_id: data.id, name: "geral", type: "text", icon: "💬" });
      // Dono entra como primeiro membro: servidor nasce privado (erro aqui não pode passar batido)
      const { error: memErr } = await supabase.from("server_members").insert({ server_id: data.id, user_id: userId, role: "owner" });
      if (memErr) { toast("Servidor criado, mas falhou ao te registrar como dono: " + memErr.message); setCreatingServer(false); return; }
      setSelectedServer(data.id);
      setTimeout(async () => {
        const { data: ch } = await supabase.from("channels").select("*").eq("server_id", data.id).limit(1).single();
        if (ch) setSelectedChannel(ch.id);
      }, 500);
    }
    setCreatingServer(false);
    setShowCreateServerModal(false);
  };

  const deleteServer = async () => {    if (!currentServer) return;
    if (!(await confirmDialog(`Excluir servidor "${currentServer.name}" e todos os canais?`, { confirmLabel: "Excluir" }))) return;
    const { error } = await supabase.from("servers").delete().eq("id", currentServer.id);
    if (error) return toast(error.message);
    // seleciona outro servidor
    const remaining = servers.filter((s) => s.id !== currentServer.id);
    if (remaining.length > 0) {
      setSelectedServer(remaining[0].id);
      setSelectedChannel(remaining[0].channels[0]?.id || "");
    } else {
      setSelectedServer("");
      setSelectedChannel("");
    }
  };

  // Sair do servidor (membro comum). Dono precisa excluir em vez de sair.
  const leaveServer = async (userIdSelf: string | undefined) => {
    if (!currentServer || !userIdSelf) return;
    if (currentServer.owner_id && currentServer.owner_id === userIdSelf) {
      toast("Você é o dono — transfira ou exclua o servidor em vez de sair.");
      return;
    }
    if (!(await confirmDialog(`Sair de "${currentServer.name}"?`, { confirmLabel: "Sair", danger: false }))) return;
    const { error } = await supabase.from("server_members").delete().eq("server_id", currentServer.id).eq("user_id", userIdSelf);
    if (error) return toast(error.message);
    const remaining = servers.filter((s) => s.id !== currentServer.id);
    if (remaining.length > 0) {
      setSelectedServer(remaining[0].id);
      setSelectedChannel(remaining[0].channels[0]?.id || "");
    } else {
      setSelectedServer("");
      setSelectedChannel("");
    }
  };

  const deleteChannel = async (channelId: string, channelName: string) => {
    if (!(await confirmDialog(`Excluir canal #${channelName}? Mensagens serão perdidas.`, { confirmLabel: "Excluir" }))) return;
    const { error } = await supabase.from("channels").delete().eq("id", channelId);
    if (error) toast(error.message);
    else if (selectedChannel === channelId) {
      const next = currentServer?.channels.find((c) => c.id !== channelId);
      if (next) setSelectedChannel(next.id);
    }
  };

  const createChannel = () => {
    if (!currentServer) return;
    setNewChannelName("");
    setNewChannelType("text");
    setNewChannelIcon("💬");
    setNewChannelImage(null);
    setNewChannelPreview("");
    setShowCreateChannelModal(true);
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !currentServer) return;
    setCreatingChannel(true);
    let image_url: string | null = null;
    if (newChannelImage) {
      const ext = newChannelImage.name.split(".").pop();
      const path = `${userId}/${currentServer.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("channel-icons").upload(path, newChannelImage);
      if (upErr) { toast("Erro ao subir imagem: " + upErr.message); setCreatingChannel(false); return; }
      const { data } = supabase.storage.from("channel-icons").getPublicUrl(path);
      image_url = data.publicUrl;
    }
    const { error } = await supabase.from("channels").insert({
      server_id: currentServer.id,
      name: newChannelName.toLowerCase().replace(/\s+/g, "-"),
      type: newChannelType,
      icon: newChannelIcon,
      image_url,
    });
    setCreatingChannel(false);
    if (error) toast(error.message);
    else setShowCreateChannelModal(false);
  };

  return {
    newChannelName, setNewChannelName, newChannelType, setNewChannelType,
    newChannelIcon, setNewChannelIcon, newChannelImage, setNewChannelImage,
    newChannelPreview, setNewChannelPreview, creatingChannel,
    newServerName, setNewServerName, newServerIcon, setNewServerIcon,
    newServerImage, setNewServerImage, newServerPreview, setNewServerPreview,
    creatingServer, editingServer,
    openCreateServer, openEditServer, handleServerSave,
    deleteServer, leaveServer, deleteChannel, createChannel, handleCreateChannel,
  };
}
