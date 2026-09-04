"use client";
import { Hash, Volume2 } from "lucide-react";

type Props = {
  serverName?: string;
  newChannelName: string;
  setNewChannelName: (v: string) => void;
  newChannelType: "text" | "voice";
  setNewChannelType: (v: "text" | "voice") => void;
  newChannelIcon: string;
  setNewChannelIcon: (v: string) => void;
  newChannelImage: File | null;
  setNewChannelImage: (f: File | null) => void;
  newChannelPreview: string;
  setNewChannelPreview: (v: string) => void;
  creatingChannel: boolean;
  onClose: () => void;
  onCreate: () => void;
};

const ICONS = ["💬","🔥","🎮","🎵","📚","💡","🚀","😂","❤️","📌","🔒","⭐","🎨","💻","📢","🎲","🎯","📝","🔔","💎"];

// Modal criar canal. Extraído de page.tsx sem mudança visual.
export default function ChannelModal(props: Props) {
  const { serverName, newChannelName, setNewChannelName, newChannelType, setNewChannelType, newChannelIcon, setNewChannelIcon, newChannelImage, setNewChannelImage, newChannelPreview, setNewChannelPreview, creatingChannel, onClose, onCreate } = props;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#313338] rounded-lg w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold mb-1">Criar canal</h2>
        <p className="text-sm text-zinc-400 mb-4">Em {serverName}</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase">Nome do canal *</label>
            <input value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="ex: geral" className="w-full mt-1 bg-[#2B2D31] border border-[#1E1F22] rounded px-3 py-2 text-white outline-none focus:border-[#5865F2]" autoFocus />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase">Tipo</label>
            <div className="flex gap-2 mt-1">
              <button onClick={() => setNewChannelType("text")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded border ${newChannelType === "text" ? "bg-[#404249] border-[#5865F2] text-white" : "bg-[#2B2D31] border-[#1E1F22] text-zinc-400"}`}><Hash className="w-4 h-4" /> Texto</button>
              <button onClick={() => setNewChannelType("voice")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded border ${newChannelType === "voice" ? "bg-[#404249] border-[#5865F2] text-white" : "bg-[#2B2D31] border-[#1E1F22] text-zinc-400"}`}><Volume2 className="w-4 h-4" /> Voz</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase">Ícone predefinido</label>
            <div className="grid grid-cols-8 gap-2 mt-2">
              {ICONS.map((ic) => (
                <button key={ic} onClick={() => { setNewChannelIcon(ic); setNewChannelImage(null); setNewChannelPreview(""); }} className={`w-9 h-9 rounded flex items-center justify-center text-lg border ${newChannelIcon === ic && !newChannelImage ? "bg-[#5865F2] border-[#5865F2]" : "bg-[#2B2D31] border-[#1E1F22] hover:bg-[#404249]"}`}>{ic}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase">Ou imagem do computador</label>
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0] || null; setNewChannelImage(f); if (f) setNewChannelPreview(URL.createObjectURL(f)); else setNewChannelPreview(""); }} className="w-full mt-1 text-sm text-zinc-400 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-[#404249] file:text-white hover:file:bg-[#4A4D53]" />
            {newChannelPreview && <img src={newChannelPreview} alt="preview" className="w-12 h-12 rounded object-cover mt-2 border border-[#404249]" />}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm hover:underline">Cancelar</button>
          <button onClick={onCreate} disabled={!newChannelName.trim() || creatingChannel} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 rounded text-sm font-medium text-white">{creatingChannel ? "Criando..." : "Criar canal"}</button>
        </div>
      </div>
    </div>
  );
}
