"use client";
import type { Server } from "@/lib/chat-types";

type Props = {
  editingServer: Server | null;
  newServerName: string;
  setNewServerName: (v: string) => void;
  newServerIcon: string;
  setNewServerIcon: (v: string) => void;
  newServerImage: File | null;
  newServerPreview: string;
  setNewServerPreview: (v: string) => void;
  setNewServerImage: (f: File | null) => void;
  creatingServer: boolean;
  onClose: () => void;
  onSave: () => void;
};

const ICONS = ["🏠","🎮","📚","🔥","⭐","🚀","💬","🎵","🎨","💻","📢","🎲","🏆","🌟","💡","⚡","❤️","🍕"];

// Modal criar/editar servidor. Extraído de page.tsx sem mudança visual.
export default function ServerModal(props: Props) {
  const { editingServer, newServerName, setNewServerName, newServerIcon, setNewServerIcon, newServerImage, newServerPreview, setNewServerPreview, setNewServerImage, creatingServer, onClose, onSave } = props;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#313338] rounded-lg w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold mb-1">{editingServer ? "Editar servidor" : "Criar servidor"}</h2>
        <p className="text-sm text-zinc-400 mb-4">{editingServer ? `Editando ${editingServer.name}` : "Um novo espaço para seus amigos"}</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase">Nome *</label>
            <input value={newServerName} onChange={(e) => setNewServerName(e.target.value)} placeholder="ex: Casa dos Amigos" className="w-full mt-1 bg-[#2B2D31] border border-[#1E1F22] rounded px-3 py-2 text-white outline-none focus:border-[#5865F2]" autoFocus />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase">Ícone</label>
            <div className="grid grid-cols-8 gap-2 mt-2">
              {ICONS.map((ic) => (
                <button key={ic} onClick={() => { setNewServerIcon(ic); setNewServerImage(null); setNewServerPreview(""); }} className={`w-9 h-9 rounded flex items-center justify-center text-lg border ${newServerIcon === ic && !newServerImage ? "bg-[#5865F2] border-[#5865F2]" : "bg-[#2B2D31] border-[#1E1F22] hover:bg-[#404249]"}`}>{ic}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase">Ou imagem do computador</label>
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0] || null; setNewServerImage(f); if (f) setNewServerPreview(URL.createObjectURL(f)); else setNewServerPreview(editingServer?.image_url || ""); }} className="w-full mt-1 text-sm text-zinc-400 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-[#404249] file:text-white hover:file:bg-[#4A4D53]" />
            {newServerPreview && <img src={newServerPreview} alt="preview" className="w-16 h-16 rounded-2xl object-cover mt-2 border border-[#404249]" />}
            {newServerPreview && <button onClick={() => { setNewServerImage(null); setNewServerPreview(""); }} className="text-xs text-red-400 hover:underline ml-2">Remover imagem</button>}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm hover:underline">Cancelar</button>
          <button onClick={onSave} disabled={!newServerName.trim() || creatingServer} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 rounded text-sm font-medium text-white">{creatingServer ? "Salvando..." : editingServer ? "Salvar" : "Criar"}</button>
        </div>
      </div>
    </div>
  );
}
