export type PttConfig = { enabled: boolean; accelerator: string };

const KEY = "wellcord-ptt";
export const DEFAULT_PTT: PttConfig = { enabled: false, accelerator: "CommandOrControl+Shift+M" };

export function loadPtt(): PttConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_PTT, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PTT;
}

export function savePtt(cfg: PttConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {}
}

// Converte KeyboardEvent para accelerator do Electron
export function eventToAccelerator(e: KeyboardEvent): string | null {
  const mods: string[] = [];
  if (e.ctrlKey) mods.push("CommandOrControl");
  if (e.altKey) mods.push("Alt");
  if (e.shiftKey) mods.push("Shift");
  let key = e.key;
  if (["Control", "Shift", "Alt", "Meta"].includes(key)) return null;
  if (key === " ") key = "Space";
  else if (key.length === 1) key = key.toUpperCase();
  else if (/^F\d{1,2}$/i.test(key)) key = key.toUpperCase();
  else return null;
  return [...mods, key].join("+");
}
