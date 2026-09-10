"use client";
import { useEffect, useState } from "react";
import { toast, confirmDialog } from "@/lib/ui";

export type ServerMember = {
  user_id: string;
  role: string;
  username: string;
  avatar: string;
  joined_at: string;
};

export type ServerInvite = {
  code: string;
  uses: number;
  max_uses: number | null;
  expires_at: string | null;
  created_at: string;
};

// Gestão do servidor: membros, kick, convites com limite. Novo (feature membros).
export function useServerManager(supabase: any, serverId: string | undefined, ownerId?: string | null) {
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [invites, setInvites] = useState<ServerInvite[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!serverId) { setMembers([]); setInvites([]); return; }
    setLoading(true);
    const { data: mems } = await supabase
      .from("server_members")
      .select("user_id, role, joined_at")
      .eq("server_id", serverId)
      .order("joined_at");
    if (mems && mems.length > 0) {
      const ids = mems.map((m: any) => m.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, username, avatar").in("id", ids);
      setMembers(
        mems.map((m: any) => {
          const p = (profs || []).find((x: any) => x.id === m.user_id);
          return {
            user_id: m.user_id,
            role: m.role,
            username: p?.username || m.user_id.slice(0, 6),
            avatar: p?.avatar || "😎",
            joined_at: m.joined_at,
          };
        })
      );
    } else {
      setMembers([]);
    }
    const { data: invs } = await supabase
      .from("server_invites")
      .select("code, uses, max_uses, expires_at, created_at")
      .eq("server_id", serverId)
      .order("created_at", { ascending: false });
    setInvites((invs || []) as ServerInvite[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [serverId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: recarrega quando membros/convites mudam
  useEffect(() => {
    if (!serverId) return;
    const ch = supabase
      .channel(`server-manage-${serverId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "server_members", filter: `server_id=eq.${serverId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "server_invites", filter: `server_id=eq.${serverId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId, supabase]);

  const kick = async (target: ServerMember, myId: string | undefined) => {
    if (target.user_id === myId) { toast("Você não pode se remover — use Sair."); return; }
    if (target.user_id === ownerId) { toast("Não dá para remover o dono."); return; }
    if (!(await confirmDialog(`Remover ${target.username} do servidor?`, { confirmLabel: "Remover" }))) return;
    const { error } = await supabase.from("server_members").delete().eq("server_id", serverId).eq("user_id", target.user_id);
    if (error) toast(error.message);
    else load();
  };

  const ban = async (target: ServerMember, myId: string | undefined) => {
    if (target.user_id === myId) { toast("Você não pode se banir."); return; }
    if (target.user_id === ownerId) { toast("Não dá para banir o dono."); return; }
    if (!(await confirmDialog(`Banir ${target.username} do servidor? Eles não poderão entrar novamente.`, { confirmLabel: "Banir", danger: true }))) return;
    const { error: banErr } = await supabase.from("server_bans").insert({ server_id: serverId, user_id: target.user_id, banned_by: myId, reason: "Banido pelo dono" });
    if (banErr) { toast(banErr.message); return; }
    const { error } = await supabase.from("server_members").delete().eq("server_id", serverId).eq("user_id", target.user_id);
    if (error) toast(error.message);
    else { toast(`${target.username} foi banido.`); load(); }
  };

  const unban = async (userId: string) => {
    if (!(await confirmDialog("Desbanir este usuário?", { confirmLabel: "Desbanir" }))) return;
    const { error } = await supabase.from("server_bans").delete().eq("server_id", serverId).eq("user_id", userId);
    if (error) toast(error.message);
    else { toast("Usuário desbanido."); load(); }
  };

  const makeCode = () => Math.random().toString(36).slice(2, 10).replace(/[^a-z0-9]/g, "x");

  const createInvite = async (userId: string | undefined, maxUses: number | null, expiresHours: number | null) => {
    if (!serverId || !userId) return null;
    for (let i = 0; i < 3; i++) {
      const code = makeCode();
      const { error } = await supabase.from("server_invites").insert({
        code,
        server_id: serverId,
        created_by: userId,
        max_uses: maxUses,
        expires_at: expiresHours ? new Date(Date.now() + expiresHours * 3600 * 1000).toISOString() : null,
      });
      if (!error) { load(); return code; }
    }
    toast("Não foi possível criar o convite.");
    return null;
  };

  const revokeInvite = async (code: string) => {
    if (!(await confirmDialog(`Revogar o convite ${code}? Links já enviados param de funcionar.`, { confirmLabel: "Revogar" }))) return;
    const { error } = await supabase.from("server_invites").delete().eq("code", code);
    if (error) toast(error.message);
    else load();
  };

  return { members, invites, loading, reload: load, kick, ban, unban, createInvite, revokeInvite };
}
