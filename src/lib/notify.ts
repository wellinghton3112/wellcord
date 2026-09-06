import type { SupabaseClient } from "@supabase/supabase-js";

export type NotifyPayload = {
  kind: "channel" | "dm";
  from: string;
  snippet: string;
  messageId: string;
  serverId?: string;
  channelId?: string;
  conversationId?: string;
};

// Envia notificação efêmera para um usuário (canal temporário só p/ o envio)
export async function sendNotify(supabase: SupabaseClient, userId: string, payload: NotifyPayload) {
  const ch = supabase.channel(`notify-send-${userId}-${Date.now()}`, {
    config: { broadcast: { self: false } },
  });
  try {
    await new Promise<void>((resolve) => {
      ch.subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          ch.send({ type: "broadcast", event: `notify:${userId}`, payload }).then(() => resolve()).catch(() => resolve());
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          resolve();
        }
      });
      setTimeout(resolve, 3000);
    });
  } finally {
    try { supabase.removeChannel(ch); } catch {}
  }
}

// Extrai @nomes do texto (letras, números, _, ., -)
export function extractMentions(content: string): string[] {
  const out = new Set<string>();
  for (const m of content.matchAll(/@([A-Za-z0-9_.-]+)/g)) out.add(m[1]);
  return [...out];
}
