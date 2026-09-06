"use client";
import { useCallback, useEffect, useState } from "react";
import type { NotifyPayload } from "@/lib/notify";
import { playPop } from "@/lib/sound";

export type Toast = NotifyPayload & { key: number };

// Escuta notificações direcionadas a mim (menções + DMs) e toca som.
export function useNotify(supabase: any, user: any) {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notify:${user.id}`)
      .on("broadcast", { event: `notify:${user.id}` }, ({ payload }: any) => {
        if (!payload) return;
        playPop();
        setToast({ ...(payload as NotifyPayload), key: Date.now() });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, supabase]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  const dismiss = useCallback(() => setToast(null), []);

  return { toast, dismiss };
}
