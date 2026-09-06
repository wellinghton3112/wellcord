"use client";
import { useEffect, useState } from "react";

export type Friend = {
  user_id: string;
  username: string;
  avatar: string;
};

export type FriendRequest = {
  from_user: string;
  to_user: string;
  username: string;
  avatar: string;
  created_at: string;
};

// Amigos: pedidos, aceite e lista. Novo (feature amigos).
export function useFriends(supabase: any, user: any) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [sending, setSending] = useState(false);

  const load = async () => {
    if (!user) { setFriends([]); setIncoming([]); setOutgoing([]); return; }
    const { data: rows } = await supabase
      .from("friend_requests")
      .select("from_user, to_user, status, created_at")
      .or(`from_user.eq.${user.id},to_user.eq.${user.id}`);
    if (!rows) return;
    const otherIds = [...new Set(rows.map((r: any) => (r.from_user === user.id ? r.to_user : r.from_user)))];
    let profMap = new Map<string, any>();
    if (otherIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, username, avatar").in("id", otherIds);
      profMap = new Map((profs || []).map((p: any) => [p.id, p]));
    }
    const info = (id: string) => {
      const p = profMap.get(id);
      return { username: p?.username || id.slice(0, 6), avatar: p?.avatar || "😎" };
    };
    setFriends(
      rows
        .filter((r: any) => r.status === "accepted")
        .map((r: any) => {
          const id = r.from_user === user.id ? r.to_user : r.from_user;
          return { user_id: id, ...info(id) };
        })
    );
    setIncoming(
      rows
        .filter((r: any) => r.status === "pending" && r.to_user === user.id)
        .map((r: any) => ({ from_user: r.from_user, to_user: r.to_user, created_at: r.created_at, ...info(r.from_user) }))
    );
    setOutgoing(
      rows
        .filter((r: any) => r.status === "pending" && r.from_user === user.id)
        .map((r: any) => ({ from_user: r.from_user, to_user: r.to_user, created_at: r.created_at, ...info(r.to_user) }))
    );
  };

  useEffect(() => { load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("friends")
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, supabase]);

  const sendRequest = async (username: string) => {
    if (!user || !username.trim()) return false;
    setSending(true);
    try {
      const { data: prof } = await supabase.from("profiles").select("id, username").ilike("username", username.trim()).limit(1).maybeSingle();
      if (!prof) { alert("Usuário não encontrado"); return false; }
      if (prof.id === user.id) { alert("Não dá para adicionar você mesmo."); return false; }
      const { error } = await supabase.from("friend_requests").insert({ from_user: user.id, to_user: prof.id });
      if (error) {
        if (/duplicate|conflict|unique/i.test(error.message)) alert("Pedido já existe (ou já são amigos).");
        else alert(error.message);
        return false;
      }
      // Se o outro já tinha pedido pra mim, vira amizade na hora
      const { data: mutual } = await supabase.from("friend_requests").select("from_user").eq("from_user", prof.id).eq("to_user", user.id).eq("status", "pending").maybeSingle();
      if (mutual) {
        await supabase.from("friend_requests").update({ status: "accepted" }).eq("from_user", prof.id).eq("to_user", user.id).eq("status", "pending");
        await supabase.from("friend_requests").delete().eq("from_user", user.id).eq("to_user", prof.id);
      }
      await load();
      return true;
    } finally {
      setSending(false);
    }
  };

  const accept = async (fromId: string) => {
    // Aceita o pedido dele + garante o meu lado como aceito (amizade mútua visível)
    const { error } = await supabase.from("friend_requests").update({ status: "accepted" }).eq("from_user", fromId).eq("to_user", user.id);
    if (error) { alert(error.message); return; }
    await supabase.from("friend_requests").upsert({ from_user: user.id, to_user: fromId, status: "accepted" }, { onConflict: "from_user,to_user" });
    await load();
  };

  const reject = async (fromId: string) => {
    if (!confirm("Recusar o pedido?")) return;
    const { error } = await supabase.from("friend_requests").delete().eq("from_user", fromId).eq("to_user", user.id);
    if (error) alert(error.message);
    else load();
  };

  const cancelOutgoing = async (toId: string) => {
    const { error } = await supabase.from("friend_requests").delete().eq("from_user", user.id).eq("to_user", toId);
    if (error) alert(error.message);
    else load();
  };

  const removeFriend = async (friendId: string, username: string) => {
    if (!confirm(`Remover ${username} dos amigos? (DMs existentes continuam)`)) return;
    await supabase.from("friend_requests").delete().eq("from_user", user.id).eq("to_user", friendId);
    await supabase.from("friend_requests").delete().eq("from_user", friendId).eq("to_user", user.id);
    load();
  };

  return { friends, incoming, outgoing, sending, sendRequest, accept, reject, cancelOutgoing, removeFriend, reloadFriends: load };
}
