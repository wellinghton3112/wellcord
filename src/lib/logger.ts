type LogLevel = "info" | "warn" | "error" | "debug";

type LogEntry = {
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  timestamp: string;
  url?: string;
  userAgent?: string;
};

const isBrowser = typeof window !== "undefined";

function formatMessage(entry: LogEntry): string {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
  const ctx = entry.context ? ` [${entry.context}]` : "";
  return `${prefix}${ctx} ${entry.message}`;
}

async function sendToServer(entry: LogEntry) {
  if (!isBrowser) return;
  try {
    await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
      keepalive: true,
    });
  } catch {
    // silently fail — não pode recursar
  }
}

function log(level: LogLevel, message: string, context?: string, data?: any) {
  const entry: LogEntry = {
    level,
    message,
    context,
    data,
    timestamp: new Date().toISOString(),
    url: isBrowser ? window.location.href : undefined,
    userAgent: isBrowser ? navigator.userAgent : undefined,
  };

  // Console local
  const formatted = formatMessage(entry);
  switch (level) {
    case "error": console.error(formatted, data || ""); break;
    case "warn": console.warn(formatted, data || ""); break;
    case "debug": console.debug(formatted, data || ""); break;
    default: console.log(formatted, data || "");
  }

  // Envia pro servidor (só erros e warns pra não spammar)
  if (level === "error" || level === "warn") {
    sendToServer(entry);
  }
}

export const logger = {
  info: (message: string, context?: string, data?: any) => log("info", message, context, data),
  warn: (message: string, context?: string, data?: any) => log("warn", message, context, data),
  error: (message: string, context?: string, data?: any) => log("error", message, context, data),
  debug: (message: string, context?: string, data?: any) => log("debug", message, context, data),
};

// Captura erros globais não tratados
if (isBrowser) {
  window.addEventListener("error", (e) => {
    logger.error("Uncaught error", "global", {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e.error?.stack,
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    logger.error("Unhandled promise rejection", "global", {
      reason: String(e.reason),
      stack: e.reason?.stack,
    });
  });
}
