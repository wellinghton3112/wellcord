"use client";
import { Monitor, AppWindow, X, Loader2 } from "lucide-react";

export type ScreenSource = { id: string; name: string; screen: boolean; thumbnail: string | null };

type Props = {
  sources: ScreenSource[] | null;
  onPick: (id: string) => void;
  onClose: () => void;
};

// Seletor de tela/janela estilo Discord (só no .exe). Novo (screen picker).
export default function ScreenPickerModal({ sources, onPick, onClose }: Props) {
  const screens = (sources || []).filter((s) => s.screen);
  const windows = (sources || []).filter((s) => !s.screen);
  const group = (title: string, list: ScreenSource[]) => (
    <div key={title}>
      <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide px-1 mb-1.5">{title}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {list.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            className="group rounded-lg overflow-hidden border-2 border-transparent hover:border-[#5865F2] bg-[#2B2D31] text-left transition"
            title={s.name}
          >
            <div className="aspect-video bg-black flex items-center justify-center overflow-hidden">
              {s.thumbnail ? (
                <img src={s.thumbnail} alt={s.name} className="w-full h-full object-cover group-hover:brightness-110" />
              ) : s.screen ? (
                <Monitor className="w-8 h-8 text-zinc-600" />
              ) : (
                <AppWindow className="w-8 h-8 text-zinc-600" />
              )}
            </div>
            <div className="px-2 py-1 text-xs text-zinc-300 truncate">{s.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[80] p-4">
      <div className="bg-[#313338] rounded-xl w-full max-w-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">Compartilhar tela</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[#404249] rounded-full"><X className="w-5 h-5 text-zinc-400" /></button>
        </div>
        {sources === null ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Buscando telas e janelas...
          </div>
        ) : sources.length === 0 ? (
          <p className="text-sm text-zinc-400 py-8 text-center">Nenhuma fonte encontrada.</p>
        ) : (
          <div className="space-y-4">
            {screens.length > 0 && group("Telas", screens)}
            {windows.length > 0 && group("Janelas", windows)}
          </div>
        )}
      </div>
    </div>
  );
}
