"use client";
import { useEffect, useRef, useState } from "react";

type ChatScrollOptions = {
  messages: { id: string }[];
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => Promise<number>;
  selectedKey: string;
};

export function useChatScroll({ messages, hasMore, loadingOlder, onLoadOlder, selectedKey }: ChatScrollOptions) {
  const listRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const holding = useRef(false);
  const prevLastId = useRef<string | null>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  const trackScroll = (el: HTMLDivElement | null) => {
    if (!el || holding.current || loadingOlder) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    nearBottom.current = distFromBottom < 120;
    setShowJumpToBottom(distFromBottom > 400);
    if (el.scrollTop < 200 && hasMore) {
      holding.current = true;
      const h0 = el.scrollHeight;
      onLoadOlder().then(() => {
        requestAnimationFrame(() => {
          const e2 = el;
          if (e2) e2.scrollTop = e2.scrollHeight - h0;
          holding.current = false;
        });
      }).catch(() => { holding.current = false; });
    }
  };

  const jumpToBottom = () => {
    const el = listRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      nearBottom.current = true;
      setShowJumpToBottom(false);
    }
  };

  useEffect(() => {
    const last = messages[messages.length - 1]?.id || null;
    const changed = last !== prevLastId.current;
    prevLastId.current = last;
    if (!changed || holding.current) return;
    if (nearBottom.current) {
      const el = listRef.current;
      if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
  }, [messages]);

  useEffect(() => {
    nearBottom.current = true;
    prevLastId.current = null;
    setShowJumpToBottom(false);
    const el = listRef.current;
    if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [selectedKey]);

  const scrollToMsg = (id: string | null | undefined) => {
    if (!id) return;
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return { listRef, trackScroll, scrollToMsg, showJumpToBottom, jumpToBottom };
}
