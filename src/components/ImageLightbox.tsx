"use client";
import { useEffect, useCallback } from "react";
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { create } from "zustand";

type LightboxState = {
  images: string[];
  index: number;
  open: (images: string[], index: number) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
};

export const useLightbox = create<LightboxState>((set, get) => ({
  images: [],
  index: 0,
  open: (images, index) => set({ images, index }),
  close: () => set({ images: [], index: 0 }),
  next: () => {
    const { images, index } = get();
    if (index < images.length - 1) set({ index: index + 1 });
  },
  prev: () => {
    const { index } = get();
    if (index > 0) set({ index: index - 1 });
  },
}));

export function ImageLightbox() {
  const { images, index, close, next, prev } = useLightbox();
  const url = images[index];
  const hasMultiple = images.length > 1;

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") close();
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  }, [close, next, prev]);

  useEffect(() => {
    if (!url) return;
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [url, handleKey]);

  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={close}
    >
      <button onClick={close} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10" title="Fechar (Esc)">
        <X className="w-6 h-6" />
      </button>

      {hasMultiple && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            disabled={index === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
            title="Anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            disabled={index === images.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
            title="Próximo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/50 px-3 py-1 rounded-full z-10">
            {index + 1} / {images.length}
          </span>
        </>
      )}

      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <img
          src={url}
          alt=""
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
        <a
          href={url}
          download
          target="_blank"
          rel="noreferrer"
          className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          title="Abrir original"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
