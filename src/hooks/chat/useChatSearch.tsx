"use client";
import { useEffect, useState } from "react";
import type { Message, DMMessage } from "@/lib/chat-types";

type MessageLike = { id: string; content?: string };

type ChatSearchOptions = {
  messages: MessageLike[];
  selectedDM: string | null;
  selectedChannel: string | null;
  viewMode: string;
};

export function useChatSearch({ messages, selectedDM, selectedChannel, viewMode }: ChatSearchOptions) {
  const [search, setSearch] = useState("");
  const [matchIdx, setMatchIdx] = useState(0);

  const q = search.trim().toLowerCase();
  const matchIds = q
    ? messages.filter((m) => (m.content || "").toLowerCase().includes(q)).map((m) => m.id)
    : [];
  const activeMatchId = matchIds.length > 0 ? matchIds[matchIdx % matchIds.length] : null;

  const runSearch = (v: string) => { setSearch(v); setMatchIdx(0); };
  const stepMatch = (dir: 1 | -1) => {
    if (matchIds.length === 0) return;
    setMatchIdx((i) => (i + dir + matchIds.length) % matchIds.length);
  };

  useEffect(() => { setSearch(""); setMatchIdx(0); }, [selectedDM, selectedChannel, viewMode]);

  const highlight = (text: string) => {
    if (!q) return text;
    const out: React.ReactNode[] = [];
    const lower = text.toLowerCase();
    let i = 0, k = 0;
    while (true) {
      const j = lower.indexOf(q, i);
      if (j < 0) { out.push(text.slice(i)); break; }
      if (j > i) out.push(text.slice(i, j));
      out.push(<mark key={k++} className="bg-[#F0B132] text-black rounded-sm px-0.5">{text.slice(j, j + q.length)}</mark>);
      i = j + q.length;
    }
    return out;
  };

  return { search, q, matchIds, activeMatchId, matchIdx, runSearch, stepMatch, highlight };
}
