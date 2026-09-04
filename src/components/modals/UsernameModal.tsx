"use client";

type Props = {
  userEmail?: string;
  username: string;
  setUsername: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
};

// Modal de edição de perfil. Extraído de page.tsx sem mudança visual.
export default function UsernameModal({ userEmail, username, setUsername, onClose, onSave }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#313338] rounded-lg w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold mb-2">Editar perfil</h2>
        <p className="text-sm text-zinc-400 mb-4">Este nome aparece nas mensagens. Logado como {userEmail}</p>
        <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-[#2B2D31] rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#5865F2] text-white" placeholder="Seu nome" autoFocus />
        <div className="flex justify-end gap-3 mt-6"><button onClick={onClose} className="px-4 py-2 text-sm hover:underline">Cancelar</button><button onClick={onSave} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] rounded text-sm font-medium text-white">Salvar</button></div>
      </div>
    </div>
  );
}
