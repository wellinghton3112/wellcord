"use client";
import { useEffect, useState } from "react";
import { toast, confirmDialog } from "@/lib/ui";

export type ServerRole = {
  id: string;
  server_id: string;
  name: string;
  color: string;
  position: number;
  permissions: {
    kick: boolean;
    ban: boolean;
    manage_messages: boolean;
    manage_channels: boolean;
    manage_roles: boolean;
  };
  created_at: string;
};

export type MemberRole = {
  server_id: string;
  user_id: string;
  role_id: string;
};

// Sistema de cargos: CRUD de cargos e atribuição a membros.
export function useRoles(supabase: any, serverId: string | undefined) {
  const [roles, setRoles] = useState<ServerRole[]>([]);
  const [memberRoles, setMemberRoles] = useState<MemberRole[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!serverId) { setRoles([]); setMemberRoles([]); return; }
    setLoading(true);
    const { data: r } = await supabase
      .from("server_roles")
      .select("*")
      .eq("server_id", serverId)
      .order("position");
    setRoles((r || []) as ServerRole[]);

    const { data: mr } = await supabase
      .from("server_member_roles")
      .select("*")
      .eq("server_id", serverId);
    setMemberRoles((mr || []) as MemberRole[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [serverId]);

  // Realtime
  useEffect(() => {
    if (!serverId) return;
    const ch = supabase
      .channel(`roles-${serverId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "server_roles", filter: `server_id=eq.${serverId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "server_member_roles", filter: `server_id=eq.${serverId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [serverId, supabase]);

  const createRole = async (name: string, color: string) => {
    if (!serverId || !name.trim()) return null;
    const { data, error } = await supabase.from("server_roles").insert({
      server_id: serverId,
      name: name.trim(),
      color,
      position: roles.length,
    }).select().single();
    if (error) { toast(error.message); return null; }
    load();
    return data as ServerRole;
  };

  const updateRole = async (roleId: string, updates: Partial<Pick<ServerRole, "name" | "color" | "permissions">>) => {
    const { error } = await supabase.from("server_roles").update(updates).eq("id", roleId);
    if (error) toast(error.message);
    else load();
  };

  const deleteRole = async (roleId: string) => {
    if (!(await confirmDialog("Excluir este cargo? Membros perderão as permissões.", { confirmLabel: "Excluir" }))) return;
    const { error } = await supabase.from("server_roles").delete().eq("id", roleId);
    if (error) toast(error.message);
    else load();
  };

  const assignRole = async (userId: string, roleId: string) => {
    const { error } = await supabase.from("server_member_roles").insert({
      server_id: serverId,
      user_id: userId,
      role_id: roleId,
    });
    if (error) toast(error.message);
    else load();
  };

  const removeRole = async (userId: string, roleId: string) => {
    const { error } = await supabase.from("server_member_roles")
      .delete()
      .eq("server_id", serverId)
      .eq("user_id", userId)
      .eq("role_id", roleId);
    if (error) toast(error.message);
    else load();
  };

  const getUserRoles = (userId: string): ServerRole[] => {
    const roleIds = memberRoles.filter(mr => mr.user_id === userId).map(mr => mr.role_id);
    return roles.filter(r => roleIds.includes(r.id));
  };

  const hasPermission = (userId: string, perm: string): boolean => {
    const userRoles = getUserRoles(userId);
    return userRoles.some(r => (r.permissions as any)[perm] === true);
  };

  return {
    roles, memberRoles, loading,
    createRole, updateRole, deleteRole,
    assignRole, removeRole, getUserRoles, hasPermission, reload: load,
  };
}
