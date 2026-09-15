"use client";
import { useRef, useState } from "react";
import { Camera, X, ImagePlus } from "lucide-react";
import Avatar from "@/components/Avatar";
import { ModalShell } from "@/components/ModalShell";

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
    <ModalShell onClose={onClose}>
      <div>
        {/* Banner preview */}
        <div className="h-24 relative rounded-t-xl" style={{ background: `linear-gradient(135deg, var(--accent), #1E1F22 130%)` }}>
          <div className="absolute -bottom-8 left-4">
            <div className="relative">
              <Avatar src={preview || avatar} name={username} className="w-20 h-20 rounded-full border-[6px] border-background bg-accent text-3xl" />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center border-4 border-background transition-colors"
                title="Trocar foto"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0] || null); e.target.value = ""; }} />
            </div>
          </div>
        </div>

        <div className="p-6 pt-12 space-y-4">
          <p className="text-xs text-zinc-400">Logado como {userEmail}</p>

          {/* Username */}
          <div>
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">Nome de exibição</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full mt-1 bg-input-bg border border-border rounded-lg px-3 py-2 outline-none focus:border-accent text-white transition-colors"
              placeholder="Seu nome"
              autoFocus
            />
          </div>

          {/* Status text */}
          <div>
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">Recado</label>
            <div className="relative mt-1">
              <input
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                maxLength={60}
                className="w-full bg-input-bg border border-border rounded-lg px-3 py-2 pr-12 outline-none focus:border-accent text-white text-sm transition-colors"
                placeholder="Ex: Pensamento de chuveiro?"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600">{statusText.length}/60</span>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">Sobre mim</label>
            <div className="relative mt-1">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={300}
                rows={3}
                className="w-full bg-input-bg border border-border rounded-lg px-3 py-2 pr-12 outline-none focus:border-accent text-white text-sm resize-none transition-colors"
                placeholder="Conte algo sobre você..."
              />
              <span className="absolute right-3 bottom-2 text-[10px] text-zinc-600">{bio.length}/300</span>
            </div>
          </div>

          {/* Remove photo */}
          {(preview || /^https?:\/\//.test(avatar)) && (
            <button onClick={remove} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
              <X className="w-3.5 h-3.5" /> Remover foto
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm hover:underline text-zinc-300">Cancelar</button>
          <button onClick={onSave} disabled={saving || !username.trim()} className="px-6 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
