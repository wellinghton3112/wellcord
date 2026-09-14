"use client";

type Props = {
  newDMUsername: string;
  setNewDMUsername: (v: string) => void;
  creatingDM: boolean;
  onClose: () => void;
  onCreate: () => void;
};

// Modal nova DM. Extraído de page.tsx sem mudança visual.
export default function NewDMModal({ newDMUsername, setNewDMUsername, creatingDM, onClose, onCreate }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold mb-1">Nova DM</h2>
        <p className="text-sm text-zinc-400 mb-4">Digite o username do amigo</p>
        <input value={newDMUsername} onChange={(e) => setNewDMUsername(e.target.value)} placeholder="ex: wellington" className="w-full bg-surface border border-input-bg rounded px-3 py-2 text-white outline-none focus:border-accent" autoFocus />
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm hover:underline">Cancelar</button>
          <button onClick={onCreate} disabled={!newDMUsername.trim() || creatingDM} className="px-6 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded text-sm font-medium text-white">{creatingDM ? "Criando..." : "Criar DM"}</button>
        </div>
      </div>
    </div>
  );
}
