"use client";
import { useState, useEffect } from "react";
import { X, Monitor, Moon, Sun, Bell, BellOff, Keyboard, Volume2, VolumeX } from "lucide-react";
import { ModalShell } from "@/components/ModalShell";

type Settings = {
  theme: "dark" | "light" | "system";
  notifications: boolean;
  sounds: boolean;
  compactMode: boolean;
};

const DEFAULT: Settings = { theme: "dark", notifications: true, sounds: true, compactMode: false };

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem("wellcord-settings");
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch { return DEFAULT; }
}

function saveSettings(s: Settings) {
  localStorage.setItem("wellcord-settings", JSON.stringify(s));
  applyTheme(s.theme);
}

function applyTheme(theme: string) {
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.add("light-theme");
    root.classList.remove("dark-theme");
  } else {
    root.classList.add("dark-theme");
    root.classList.remove("light-theme");
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    applyTheme(s.theme);
  }, []);
  return { settings, setSettings: (s: Settings) => { setSettings(s); saveSettings(s); } };
}

type Props = {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
};

export default function SettingsModal({ settings, onChange, onClose }: Props) {
  const [local, setLocal] = useState(settings);

  const update = (patch: Partial<Settings>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
  };

  const shortcuts = [
    { keys: "Enter", desc: "Enviar mensagem" },
    { keys: "Shift + Enter", desc: "Nova linha" },
    { keys: "Escape", desc: "Fechar modal / cancelar" },
    { keys: "Ctrl + K", desc: "Buscar mensagem" },
  ];

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-lg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#3F4147]">
        <h2 className="text-xl font-bold">Configurações</h2>
        <button onClick={onClose} className="p-1 hover:bg-[#35373C] rounded"><X className="w-5 h-5 text-zinc-400" /></button>
      </div>

      <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
        {/* Tema */}
        <section>
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wide mb-3">Aparência</h3>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: "dark", icon: Moon, label: "Escuro" },
              { value: "light", icon: Sun, label: "Claro" },
              { value: "system", icon: Monitor, label: "Sistema" },
            ] as const).map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => update({ theme: value })}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${
                  local.theme === value
                    ? "bg-[#5865F2]/15 border-[#5865F2] text-[#5865F2]"
                    : "bg-[#2B2D31] border-[#3F4147] text-zinc-400 hover:bg-[#35373C]"
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Notificações */}
        <section>
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wide mb-3">Notificações</h3>
          <div className="space-y-3">
            <ToggleRow
              icon={local.notifications ? Bell : BellOff}
              label="Notificações push"
              desc="Receber alertas de menções e DMs"
              checked={local.notifications}
              onChange={(v) => update({ notifications: v })}
            />
            <ToggleRow
              icon={local.sounds ? Volume2 : VolumeX}
              label="Sons"
              desc="Reproduzir sons de notificação"
              checked={local.sounds}
              onChange={(v) => update({ sounds: v })}
            />
          </div>
        </section>

        {/* Atalhos */}
        <section>
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wide mb-3">Atalhos de teclado</h3>
          <div className="space-y-2">
            {shortcuts.map((s) => (
              <div key={s.keys} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#2B2D31]">
                <span className="text-sm text-zinc-300">{s.desc}</span>
                <kbd className="px-2 py-1 rounded bg-[#1E1F22] border border-[#3F4147] text-xs text-zinc-400 font-mono">{s.keys}</kbd>
              </div>
            ))}
          </div>
        </section>

        {/* Info */}
        <section className="text-center text-xs text-zinc-600 pt-2 border-t border-[#3F4147]">
          WellCORD • BETA 0.1.96 • Feito com Next.js + Supabase
        </section>
      </div>
    </ModalShell>
  );
}

function ToggleRow({ icon: Icon, label, desc, checked, onChange }: { icon: any; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-[#2B2D31]">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-zinc-400" />
        <div>
          <p className="text-sm text-zinc-200">{label}</p>
          <p className="text-xs text-zinc-500">{desc}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? "bg-[#5865F2]" : "bg-zinc-600"}`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "left-5" : "left-1"}`} />
      </button>
    </div>
  );
}
