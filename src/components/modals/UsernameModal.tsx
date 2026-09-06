"use client";
import { useRef, useState } from "react";
import Avatar from "@/components/Avatar";

type Props = {
  userEmail?: string;
  username: string;
  setUsername: (v: string) => void;
  avatar: string;
  onFile: (f: File | null) => void;
  onRemovePhoto: () => void;
  bio: string;
  setBio: (v: string) => void;
  statusText: string;
  setStatusText: (v: string) => void;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
};

// Modal de edição de perfil (nome + foto + bio + recado). Extraído de page.tsx + foto.
export default function UsernameModal({ userEmail, username, setUsername, avatar, onFile, onRemovePhoto, bio, setBio, statusText, setStatusText, saving, onClose, onSave }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | null) => {
    onFile(f);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  };

  const remove = () => {
    pick(null);
    onRemovePhoto();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#313338] rounded-lg w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-xl font-bold mb-2">Editar perfil</h2>
        <p className="text-sm text-zinc-400 mb-4">Este nome e foto aparecem nas mensagens. Logado como {userEmail}</p>
        <div className="flex items-center gap-4 mb-4">
          <Avatar src={preview || avatar} name={username} className="w-16 h-16 rounded-full bg-[#5865F2] text-2xl" />
          <div className="flex flex-col gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0] || null); e.target.value = ""; }} />
            <button onClick={() => fileRef.current?.click()} className="px-4 py-1.5 bg-[#404249] hover:bg-[#4A4D53] rounded text-sm text-white w-fit">Trocar foto</button>
            {(preview || /^https?:\/\//.test(avatar)) && (
              <button onClick={remove} className="text-xs text-red-400 hover:underline w-fit">Remover foto</button>
            )}
          </div>
        </div>
        <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-[#2B2D31] rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#5865F2] text-white" placeholder="Seu nome" autoFocus />
        <input value={statusText} onChange={(e) => setStatusText(e.target.value)} maxLength={60} className="w-full mt-3 bg-[#2B2D31] rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#5865F2] text-white text-sm" placeholder="Recado (ex: Pensamento de chuveiro?)" />
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={3} className="w-full mt-3 bg-[#2B2D31] rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#5865F2] text-white text-sm resize-none" placeholder="Sobre mim" />
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm hover:underline">Cancelar</button>
          <button onClick={onSave} disabled={saving} className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 rounded text-sm font-medium text-white">{saving ? "Salvando..." : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}
