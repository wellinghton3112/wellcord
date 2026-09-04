"use client";
import { useState } from "react";
import type { Server } from "@/lib/chat-types";

// Ações de servidor/canal: modais, CRUD e upload de ícones.
// Extraído de page.tsx sem mudança de comportamento.
export function useServerActions(
  supabase: any,
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
  const openEditServer = (s: Server) => {
    setEditingServer(s);
    setNewServerName(s.name);
    setNewServerIcon(s.icon);
    setNewServerImage(null);
    setNewServerPreview(s.image_url || "");
    setShowCreateServerModal(true);
  };
  const handleServerSave = async () => {
    if (!newServerName.trim()) return;
    setCreatingServer(true);
    let image_url: string | null = editingServer?.image_url || null;
    if (newServerImage) {
      const ext = newServerImage.name.split(".").pop();
      const path = `servers/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("server-icons").upload(path, newServerImage);
      if (upErr) { alert("Erro ao subir imagem: " + upErr.message); setCreatingServer(false); return; }
      const { data } = supabase.storage.from("server-icons").getPublicUrl(path);
      image_url = data.publicUrl;
    } else if (!newServerPreview && editingServer?.image_url) {
      image_url = null;
    }
    if (editingServer) {
      const { error } = await supabase.from("servers").update({ name: newServerName, icon: newServerIcon, image_url }).eq("id", editingServer.id);
      if (error) alert(error.message);
    } else {
      const { data, error } = await supabase.from("servers").insert({ name: newServerName, icon: newServerIcon, image_url }).select().single();
      if (error) { alert(error.message); setCreatingServer(false); return; }
      await supabase.from("channels").insert({ server_id: data.id, name: "geral", type: "text", icon: "💬" });
      setSelectedServer(data.id);
      setTimeout(async () => {
        const { data: ch } = await supabase.from("channels").select("*").eq("server_id", data.id).limit(1).single();
        if (ch) setSelectedChannel(ch.id);
      }, 500);
    }
    setCreatingServer(false);
    setShowCreateServerModal(false);
  };

  const deleteServer = async () => {
    if (!currentServer) return;
    if (!confirm(`Excluir servidor "${currentServer.name}" e todos os canais?`)) return;
    const { error } = await supabase.from("servers").delete().eq("id", currentServer.id);
    if (error) return alert(error.message);
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

  const deleteChannel = async (channelId: string, channelName: string) => {
    if (!confirm(`Excluir canal #${channelName}? Mensagens serão perdidas.`)) return;
    const { error } = await supabase.from("channels").delete().eq("id", channelId);
    if (error) alert(error.message);
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
      const path = `${currentServer.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("channel-icons").upload(path, newChannelImage);
      if (upErr) { alert("Erro ao subir imagem: " + upErr.message); setCreatingChannel(false); return; }
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
    if (error) alert(error.message);
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
    deleteServer, deleteChannel, createChannel, handleCreateChannel,
  };
}
