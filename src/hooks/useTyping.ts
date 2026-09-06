"use client";
import { useEffect, useRef, useState } from "react";

export type TypingUser = { id: string; username: string };

const IDLE_MS = 2500; // paro de avisar após esse tempo sem digitar
const EXPIRE_MS = 4000; // esqueço quem não atualiza

// "X está digitando..." via Supabase broadcast (efêmero, sem tabela).
export function useTyping(supabase: any, user: any, username: string, scope: string | null) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const timers = useRef<Map<string, any>>(new Map());
  const idleTimer = useRef<any>(null);
  const sentRef = useRef(false);
  const chRef = useRef<any>(null);

  // Assina o canal da conversa atual
  useEffect(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current.clear();
    setTypingUsers([]);
    sentRef.current = false;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (!user || !scope) return;
    const ch = supabase.channel(`typing:${scope}`, { config: { broadcast: { self: false } } });
    chRef.current = ch;
    ch.on("broadcast", { event: "typing" }, ({ payload }: any) => {
      if (!payload || payload.user_id === user.id) return;
      const { user_id, username: uname, typing } = payload;
      const old = timers.current.get(user_id);
      if (old) clearTimeout(old);
      if (typing === false) {
        timers.current.delete(user_id);
        setTypingUsers((prev) => prev.filter((u) => u.id !== user_id));
        return;
      }
      setTypingUsers((prev) => {
        if (prev.some((u) => u.id === user_id)) {
          return prev.map((u) => (u.id === user_id ? { ...u, username: uname || u.username } : u));
        }
        return [...prev, { id: user_id, username: uname || "alguém" }];
      });
      timers.current.set(
        user_id,
        setTimeout(() => {
          timers.current.delete(user_id);
          setTypingUsers((prev) => prev.filter((u) => u.id !== user_id));
        }, EXPIRE_MS)
      );
    }).subscribe();
    return () => {
      try { ch.send({ type: "broadcast", event: "typing", payload: { user_id: user.id, username, typing: false } }); } catch {}
      supabase.removeChannel(ch);
      if (chRef.current === ch) chRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, scope, supabase]);

  const sendState = (typing: boolean) => {
    if (!user || !chRef.current) return;
    try {
      chRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: user.id, username, typing } });
    } catch {}
    sentRef.current = typing;
  };

  // Chamar a cada onChange do input
  const notifyTyping = () => {
    if (!sentRef.current) sendState(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => sendState(false), IDLE_MS);
  };

  // Chamar ao enviar, trocar de conversa ou blur
  const notifyStop = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (sentRef.current) sendState(false);
  };

  return { typingUsers, notifyTyping, notifyStop };
}
