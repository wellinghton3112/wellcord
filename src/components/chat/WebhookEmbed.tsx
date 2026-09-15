"use client";
import type { WebhookEmbed } from "@/lib/chat-types";

function embedColor(color: unknown): string {
  if (typeof color === "number" && Number.isFinite(color)) {
    const c = Math.max(0, Math.min(0xffffff, Math.floor(color)));
    return `#${c.toString(16).padStart(6, "0")}`;
  }
  return "var(--accent)";
}

function asText(v: unknown, max = 2000): string {
  if (typeof v !== "string") return "";
  return v.length > max ? v.slice(0, max) + "…" : v;
}

function EmbedCard({ embed }: { embed: WebhookEmbed }) {
  if (!embed || typeof embed !== "object") return null;
  const title = asText(embed.title, 256);
  const description = asText(embed.description, 4000);
  const url = asText(embed.url, 500);
  const authorName = asText(embed.author?.name, 256);
  const authorUrl = asText(embed.author?.url, 500);
  const footerText = asText(embed.footer?.text, 500);
  const fields = Array.isArray(embed.fields) ? embed.fields.slice(0, 25) : [];
  if (!title && !description && !authorName && fields.length === 0 && !footerText) return null;

  const titleNode = title ? (
    url && /^https?:\/\//i.test(url) ? (
      <a href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-accent hover:underline break-words">{title}</a>
    ) : (
      <div className="text-sm font-semibold text-foreground break-words">{title}</div>
    )
  ) : null;

  const authorNode = authorName ? (
    authorUrl && /^https?:\/\//i.test(authorUrl) ? (
      <a href={authorUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-foreground hover:underline break-words">{authorName}</a>
    ) : (
      <div className="text-xs font-semibold text-foreground break-words">{authorName}</div>
    )
  ) : null;

  return (
    <div className="mt-1 max-w-md rounded-lg bg-surface border border-border overflow-hidden flex">
      <div className="w-1 shrink-0" style={{ background: embedColor(embed.color) }} />
      <div className="px-3 py-2 min-w-0 flex-1 space-y-1">
        {authorNode}
        {titleNode}
        {description && <p className="text-[13px] text-foreground break-words whitespace-pre-wrap">{description}</p>}
        {fields.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
            {fields.map((f, i) => (
              <div key={i} className={f.inline === false ? "col-span-2" : ""}>
                <div className="text-xs font-semibold text-foreground break-words">{asText(f.name, 256)}</div>
                <div className="text-xs text-zinc-400 break-words whitespace-pre-wrap">{asText(f.value, 1000)}</div>
              </div>
            ))}
          </div>
        )}
        {footerText && <div className="text-[11px] text-zinc-500 break-words pt-1">{footerText}</div>}
      </div>
    </div>
  );
}

export function EmbedList({ embeds }: { embeds: WebhookEmbed[] | null | undefined }) {
  if (!Array.isArray(embeds) || embeds.length === 0) return null;
  return (
    <>
      {embeds.slice(0, 10).map((e, i) => <EmbedCard key={i} embed={e} />)}
    </>
  );
}
