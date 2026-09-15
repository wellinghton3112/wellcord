"use client";
import { useState, useEffect } from "react";
import { Bookmark, X, Trash2, ExternalLink } from "lucide-react";
import { ModalShell } from "@/components/ModalShell";
import { useAppStore } from "@/stores/useAppStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { MarkdownText } from "@/lib/markdown";

export type BookmarkEntry = {
  id: string;
  messageId: string;
  content: string;
  username: string;
  channelName: string;
  channelId: string;
  createdAt: number;
};

function loadBookmarks(): BookmarkEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("wellcord-bookmarks") || "[]");
  } catch { return []; }
}

function saveBookmarks(entries: BookmarkEntry[]) {
  localStorage.setItem("wellcord-bookmarks", JSON.stringify(entries));
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  useEffect(() => { setBookmarks(loadBookmarks()); }, []);

  const toggle = (msg: { id: string; content: string; user: string; channelId: string }, channelName: string) => {
    setBookmarks((prev) => {
      const exists = prev.find((b) => b.messageId === msg.id);
      let next: BookmarkEntry[];
      if (exists) {
        next = prev.filter((b) => b.messageId !== msg.id);
      } else {
        next = [{ id: crypto.randomUUID(), messageId: msg.id, content: msg.content, username: msg.user, channelName, channelId: msg.channelId, createdAt: Date.now() }, ...prev];
      }
      saveBookmarks(next);
      return next;
    });
  };

  const remove = (id: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      saveBookmarks(next);
      return next;
    });
  };

  const isBookmarked = (messageId: string) => bookmarks.some((b) => b.messageId === messageId);

  return { bookmarks, toggle, remove, isBookmarked };
}

type Props = {
  bookmarks: BookmarkEntry[];
  onRemove: (id: string) => void;
  onClose: () => void;
};

export function BookmarksModal({ bookmarks, onRemove, onClose }: Props) {
  const { setSelectedChannel, setViewMode } = useAppStore();

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-lg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-xl font-bold flex items-center gap-2"><Bookmark className="w-5 h-5 text-yellow-400" /> Mensagens Favoritas</h2>
        <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded"><X className="w-5 h-5 text-zinc-400" /></button>
      </div>
      <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
        {bookmarks.length === 0 ? (
          <div className="text-center py-12">
            <Bookmark className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Nenhuma mensagem favoritada</p>
            <p className="text-xs text-zinc-600 mt-1">Clique no ícone de bookmark em qualquer mensagem</p>
          </div>
        ) : bookmarks.map((b) => (
          <div key={b.id} className="bg-surface rounded-lg p-3 group hover:bg-surface-hover transition-colors">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{b.username}</span>
                <span className="text-[10px] text-zinc-400">em #{b.channelName}</span>
                <span className="text-[10px] text-zinc-600">{new Date(b.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setSelectedChannel(b.channelId); setViewMode("server"); onClose(); }} className="p-1 hover:bg-surface rounded" title="Ir para o canal"><ExternalLink className="w-3.5 h-3.5 text-zinc-400" /></button>
                <button onClick={() => onRemove(b.id)} className="p-1 hover:bg-danger/20 rounded" title="Remover"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div>
            </div>
            <p className="text-sm text-zinc-300"><MarkdownText text={b.content} /></p>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}
