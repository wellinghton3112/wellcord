"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Hash, MessageCircle, X } from "lucide-react";
import { ModalShell } from "@/components/ModalShell";

type SearchResult = {
  id: string;
  content: string;
  user: string;
  avatar: string;
  channel_name: string;
  channel_id: string;
  server_id: string;
  created_at: string;
};

type Props = {
  supabase: any;
  servers: { id: string; channels: { id: string; name: string }[] }[];
  onJump: (serverId: string, channelId: string, messageId: string) => void;
  onClose: () => void;
};

export default function GlobalSearch({ supabase, servers, onJump, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const channelIds = servers.flatMap((s) => s.channels.map((c) => c.id));
      if (channelIds.length === 0) { setLoading(false); return; }

      const { data } = await supabase
        .from("messages")
        .select("id, content, user, avatar, channel_id, created_at")
        .in("channel_id", channelIds)
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(30);

      if (data) {
        const enriched = data.map((m: any) => {
          let channelName = "canal";
          let serverId = "";
          for (const s of servers) {
            const ch = s.channels.find((c) => c.id === m.channel_id);
            if (ch) { channelName = ch.name; serverId = s.id; break; }
          }
          return { ...m, channel_name: channelName, server_id: serverId };
        });
        setResults(enriched);
        setSelectedIdx(0);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, servers, supabase]);

  const handleSelect = (r: SearchResult) => {
    onJump(r.server_id, r.channel_id, r.id);
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && results[selectedIdx]) { handleSelect(results[selectedIdx]); }
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-xl">
      <div className="p-4">
        <div className="flex items-center gap-3 bg-input-bg rounded-lg px-3 py-2">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Buscar mensagens em todos os canais..."
            className="flex-1 bg-transparent outline-none text-zinc-100 placeholder:text-zinc-400"
          />
          {query && (
            <button onClick={() => setQuery("")} className="p-1 hover:bg-surface-hover rounded">
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          )}
        </div>

        <div className="mt-3 max-h-[50vh] overflow-y-auto">
          {loading && (
            <div className="py-8 text-center text-zinc-400 text-sm">Buscando...</div>
          )}
          {!loading && query && results.length === 0 && (
            <div className="py-8 text-center text-zinc-400 text-sm">Nenhuma mensagem encontrada</div>
          )}
          {!loading && results.length > 0 && (
            <div className="space-y-0.5">
              {results.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    i === selectedIdx ? "bg-accent/15 border border-accent/30" : "hover:bg-surface"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                    <Hash className="w-3 h-3" />
                    <span>{r.channel_name}</span>
                    <span>•</span>
                    <span>{r.user}</span>
                    <span className="ml-auto">{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-2">{r.content}</p>
                </button>
              ))}
            </div>
          )}
          {!loading && !query && (
            <div className="py-8 text-center text-zinc-600 text-sm">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
              Digite para buscar mensagens
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
