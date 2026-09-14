"use client";
import { ModalShell } from "@/components/ModalShell";

type Props = {
  code: string;
  setCode: (v: string) => void;
  joining: boolean;
  onClose: () => void;
  onJoin: () => void;
};

// Modal entrar com código de convite. Novo (feature membership).
export default function JoinModal({ code, setCode, joining, onClose, onJoin }: Props) {
  return (
    <ModalShell onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-1">Entrar em servidor</h2>
        <p className="text-sm text-zinc-400 mb-4">Cole o código do convite que te enviaram</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onJoin()}
          placeholder="ex: a1b2c3d4"
          className="w-full bg-surface border border-input-bg rounded px-3 py-2 text-white outline-none focus:border-accent"
          autoFocus
        />
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm hover:underline">Cancelar</button>
          <button onClick={onJoin} disabled={!code.trim() || joining} className="px-6 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded text-sm font-medium text-white">{joining ? "Entrando..." : "Entrar"}</button>
        </div>
      </div>
    </ModalShell>
  );
}
