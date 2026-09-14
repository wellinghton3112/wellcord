import { NextResponse } from "next/server";

type LogEntry = {
  level: string;
  message: string;
  context?: string;
  data?: any;
  timestamp: string;
  url?: string;
  userAgent?: string;
};

// Armazena logs em memória (últimas 200 entradas)
// Em produção, integrar com Datadog/Sentry/etc
const logs: LogEntry[] = [];
const MAX_LOGS = 200;

export async function POST(req: Request) {
  try {
    const entry: LogEntry = await req.json();

    if (!entry.message || !entry.level) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Store em memória
    logs.push(entry);
    if (logs.length > MAX_LOGS) logs.shift();

    // Console no servidor
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const ctx = entry.context ? ` [${entry.context}]` : "";
    const msg = `${prefix}${ctx} ${entry.message}`;

    if (entry.level === "error") {
      console.error(msg, entry.data || "");
    } else if (entry.level === "warn") {
      console.warn(msg, entry.data || "");
    } else {
      console.log(msg, entry.data || "");
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// GET para ver logs (protegido por token)
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.LOG_VIEWER_TOKEN || "wellcord-logs-2026"}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const level = url.searchParams.get("level");
  const limit = parseInt(url.searchParams.get("limit") || "50");

  let filtered = logs;
  if (level) filtered = filtered.filter((l) => l.level === level);

  return NextResponse.json({
    total: filtered.length,
    logs: filtered.slice(-limit),
  });
}
