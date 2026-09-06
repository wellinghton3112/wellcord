import type { SupabaseClient } from "@supabase/supabase-js";

export type NotifyPayload = {
  kind: "channel" | "dm";
  from: string;
  snippet: string;
  serverId?: string;
  channelId?: string;
  conversationId?: string;
};

// Notificação persistente (tabela + realtime) — entrega garantida mesmo se o
// destinatário estiver com a conversa fechada; o toast some ao dispensar.
export async function sendNotify(supabase: any, userId: string, payload: NotifyPayload) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    kind: payload.kind,
    sender: payload.from,
    snippet: payload.snippet,
    server_id: payload.serverId || null,
    channel_id: payload.channelId || null,
    conversation_id: payload.conversationId || null,
  });
  if (error) console.warn("[notify] falha ao gravar:", error.message);
}

// Extrai @nomes do texto (letras, números, _, ., -)
export function extractMentions(content: string): string[] {
  const out = new Set<string>();
  for (const m of content.matchAll(/@([A-Za-z0-9_.-]+)/g)) out.add(m[1]);
  return [...out];
}
