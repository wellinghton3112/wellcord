"use client";
import { useEffect, useState } from "react";
import type { Server } from "@/lib/chat-types";

// Servidores + canais: carga inicial, seleção e realtime.
// Extraído de page.tsx sem mudança de comportamento.
export function useServers(supabase: any, user: any) {
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>("");
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  // Carregar servidores e canais do Supabase (só após login)
  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      const { data: srvData, error: srvErr } = await supabase.from("servers").select("*").order("created_at");
      if (srvErr) {
        console.error("load servers", srvErr);
        setLoading(false);
        return;
      }
      if (!srvData || srvData.length === 0) {
        setServers([]);
        setLoading(false);
        setConnected(true);
        return;
      }
      // buscar canais
      const { data: chData } = await supabase.from("channels").select("*").order("created_at");
      const mapped: Server[] = srvData.map((s: any) => ({
        id: s.id,
        name: s.name,
        icon: s.icon,
        image_url: s.image_url,
        owner_id: s.owner_id ?? null,
        channels: (chData || []).filter((c: any) => c.server_id === s.id).map((c: any) => ({ id: c.id, server_id: c.server_id, name: c.name, type: c.type, icon: c.icon, image_url: c.image_url })),
      }));
      setServers(mapped);
      if (!selectedServer && mapped.length > 0) {
        setSelectedServer(mapped[0].id);
        setSelectedChannel(mapped[0].channels[0]?.id || "");
      }
      setLoading(false);
      setConnected(true);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Realtime para novos servidores/canais
  useEffect(() => {
    const srvSub = supabase.channel("servers-realtime").on("postgres_changes", { event: "*", schema: "public", table: "servers" }, async () => {
      const { data: srvData } = await supabase.from("servers").select("*").order("created_at");
      const { data: chData } = await supabase.from("channels").select("*").order("created_at");
      if (srvData) {
        const mapped: Server[] = srvData.map((s: any) => ({
          id: s.id, name: s.name, icon: s.icon, image_url: (s as any).image_url, owner_id: (s as any).owner_id ?? null,
          channels: (chData || []).filter((c: any) => c.server_id === s.id).map((c: any) => ({ id: c.id, server_id: c.server_id, name: c.name, type: c.type, icon: c.icon, image_url: c.image_url })),
        }));
        setServers(mapped);
      }
    }).subscribe();
    const chSub = supabase.channel("channels-realtime").on("postgres_changes", { event: "*", schema: "public", table: "channels" }, async () => {
      const { data: chData } = await supabase.from("channels").select("*").order("created_at");
      const { data: srvData } = await supabase.from("servers").select("*").order("created_at");
      if (srvData && chData) {
        const mapped: Server[] = srvData.map((s: any) => ({
          id: s.id, name: s.name, icon: s.icon, image_url: (s as any).image_url, owner_id: (s as any).owner_id ?? null,
          channels: chData.filter((c: any) => c.server_id === s.id).map((c: any) => ({ id: c.id, server_id: c.server_id, name: c.name, type: c.type, icon: c.icon, image_url: c.image_url })),
        }));
        setServers(mapped);
      }
    }).subscribe();
    return () => { supabase.removeChannel(srvSub); supabase.removeChannel(chSub); };
  }, [supabase]);

  const currentServer = servers.find((s) => s.id === selectedServer);
  const currentChannel = currentServer?.channels.find((c) => c.id === selectedChannel);

  return {
    servers, setServers,
    selectedServer, setSelectedServer,
    selectedChannel, setSelectedChannel,
    currentServer, currentChannel,
    loading, connected,
  };
}
