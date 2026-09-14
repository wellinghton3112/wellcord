import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST /api/webhooks/[token] — envia mensagem via webhook
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.content && !body?.embeds) {
    return NextResponse.json({ error: "content or embeds required" }, { status: 400 });
  }

  // Valida webhook
  const { data: webhook, error: whErr } = await supabase
    .from("channel_webhooks")
    .select("id, channel_id, name, avatar_url")
    .eq("token", token)
    .single();

  if (whErr || !webhook) {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 404 });
  }

  // Content com embeds
  const content = body.content || "";
  const embeds = body.embeds || [];

  // Insere mensagem como "bot"
  const { data: msg, error: msgErr } = await supabase
    .from("messages")
    .insert({
      channel_id: webhook.channel_id,
      user_id: "00000000-0000-0000-0000-000000000000",
      username: webhook.name,
      avatar: webhook.avatar_url || "🤖",
      color: "#5865F2",
      content,
      embeds: embeds.length > 0 ? embeds : null,
      metadata: {
        webhook_id: webhook.id,
        webhook_name: webhook.name,
        webhook_avatar: webhook.avatar_url,
      },
    })
    .select("id, created_at")
    .single();

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: msg.id, created_at: msg.created_at });
}

// GET /api/webhooks/[token] — info do webhook (para teste)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data, error } = await supabase
    .from("channel_webhooks")
    .select("id, name, channel_id, created_at")
    .eq("token", token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 404 });
  }

  return NextResponse.json(data);
}
