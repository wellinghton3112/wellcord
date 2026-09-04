"use client";
import { useState } from "react";

// Convites de servidor: criar/copiar e resgatar.
// Extraído como hook novo (feature membership).
export function useInvites(supabase: any, user: any) {
  const [inviteCode, setInviteCode] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);

  const makeCode = () =>
    Math.random().toString(36).slice(2, 10).replace(/[^a-z0-9]/g, "x");

  // Um convite ativo por servidor (reusa o existente)
  const openInvite = async (serverId: string) => {
    if (!user) return "";
    setCreatingInvite(true);
    const { data: existing } = await supabase
      .from("server_invites")
      .select("code")
      .eq("server_id", serverId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.code) {
      setInviteCode(existing.code);
      setCreatingInvite(false);
      return existing.code as string;
    }
    for (let i = 0; i < 3; i++) {
      const code = makeCode();
      const { error } = await supabase.from("server_invites").insert({
        code,
        server_id: serverId,
        created_by: user.id,
      });
      if (!error) {
        setInviteCode(code);
        setCreatingInvite(false);
        return code;
      }
    }
    alert("Não foi possível criar o convite.");
    setCreatingInvite(false);
    return "";
  };

  // Entra no servidor via código (validação/expiração no banco)
  const redeemInvite = async (code: string): Promise<string | null> => {
    const clean = code.trim().toLowerCase();
    if (!clean || !user) return null;
    const { data, error } = await supabase.rpc("redeem_invite", { p_code: clean });
    if (error) {
      alert(error.message);
      return null;
    }
    return data as string;
  };

  return { inviteCode, creatingInvite, openInvite, redeemInvite };
}
