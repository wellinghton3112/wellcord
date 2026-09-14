"use client";
import { useState, useEffect } from "react";
import { ExternalLink, Globe } from "lucide-react";
import { useLightbox } from "@/components/ImageLightbox";

type EmbedData = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
};

const embedCache = new Map<string, { data: EmbedData | null; ts: number }>();
const FAILED_KEY = "__failed__";

export function useLinkEmbed(url: string | null): EmbedData | null {
  const [data, setData] = useState<EmbedData | null>(null);

  useEffect(() => {
    if (!url) { setData(null); return; }
    const cached = embedCache.get(url);
    if (cached) {
      setData(cached.data);
      return;
    }
    let cancelled = false;
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: EmbedData | null) => {
        if (cancelled) return;
        embedCache.set(url, { data: d, ts: Date.now() });
        setData(d);
      })
      .catch(() => {
        if (!cancelled) embedCache.set(url, { data: null, ts: Date.now() });
      });
    return () => { cancelled = true; };
  }, [url]);

  return data;
}

export function LinkEmbed({ url }: { url: string }) {
  const data = useLinkEmbed(url);
  const openLightbox = useLightbox((s) => s.open);
  if (!data || (!data.title && !data.description && !data.image)) return null;

  const hostname = (() => { try { return new URL(url).hostname; } catch { return url; } })();

  return (
    <div className="mt-1.5 max-w-md rounded-lg border border-[#4A4D53] bg-[var(--surface)] overflow-hidden group">
      {data.image && (
        <button
          type="button"
          onClick={() => openLightbox([data.image!], 0)}
          className="h-36 w-full overflow-hidden bg-[var(--input-bg)] block cursor-pointer"
        >
          <img
            src={data.image}
            alt={data.title || hostname}
            className="w-full h-full object-cover group-hover:brightness-110 transition"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </button>
      )}
      <a href={url} target="_blank" rel="noreferrer" className="block px-3 py-2 hover:bg-[var(--surface-hover)] transition-colors">
        {data.siteName && (
          <div className="flex items-center gap-1.5 mb-1">
            {data.favicon ? (
              <img src={data.favicon} alt="" className="w-3.5 h-3.5 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <Globe className="w-3.5 h-3.5 text-zinc-400" />
            )}
            <span className="text-[11px] text-zinc-400 truncate">{data.siteName}</span>
          </div>
        )}
        {data.title && (
          <div className="text-sm font-semibold text-zinc-200 truncate group-hover:text-white">{data.title}</div>
        )}
        {data.description && (
          <div className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{data.description}</div>
        )}
        <div className="flex items-center gap-1 mt-1.5 text-[11px] text-zinc-400">
          <ExternalLink className="w-3 h-3" />
          <span className="truncate">{hostname}</span>
        </div>
      </a>
    </div>
  );
}
