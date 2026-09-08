"use client";
import { useCallback, useEffect, useState } from "react";
import type { NotifyPayload } from "@/lib/notify";
import { playPop, unlockAudio } from "@/lib/sound";

export type Toast = NotifyPayload & { key: number; notifId: string };

// Escuta minhas notificações (tabela + realtime) e toca som.
// Dispensar apaga a linha (não volta no próximo login).
export function useNotify(supabase: any, user: any) {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    unlockAudio();
    if (!user) return;
    // Pendentes que chegaram com o app fechado — só se forem recentes (<2min),
    // resto é passado e apaga silencioso para não ressuscitar
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!data) return;
        const ageMs = Date.now() - new Date(data.created_at).getTime();
        if (ageMs > 2 * 60 * 1000) {
          supabase.from("notifications").delete().eq("user_id", user.id).then(() => {});
          return;
        }
        playPop();
        setToast({
          key: Date.now(),
          notifId: data.id,
          kind: data.kind,
          from: data.sender,
          snippet: data.snippet,
          serverId: data.server_id || undefined,
          channelId: data.channel_id || undefined,
          conversationId: data.conversation_id || undefined,
        });
      });
    const ch = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const r = payload.new;
          if (!r) return;
          playPop();
          setToast({
            key: Date.now(),
            notifId: r.id,
            kind: r.kind,
            from: r.sender,
            snippet: r.snippet,
            serverId: r.server_id || undefined,
            channelId: r.channel_id || undefined,
            conversationId: r.conversation_id || undefined,
          });
        }
      )
      .subscribe((status: string) => {
        if (status !== "SUBSCRIBED") console.warn("[notify] canal status:", status);
      });
    return () => { supabase.removeChannel(ch); };
  }, [user, supabase]);

  const dismiss = useCallback(() => {
    setToast((cur) => {
      if (cur) supabase.from("notifications").delete().eq("id", cur.notifId).then(() => {});
      return null;
    });
  }, [supabase]);

  // Sumir sozinho também apaga (senão volta no próximo login)
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => dismiss(), 12000);
    return () => clearTimeout(t);
  }, [toast, dismiss]);

  return { toast, dismiss };
}
