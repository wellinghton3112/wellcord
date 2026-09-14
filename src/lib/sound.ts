// "Pop" de notificação via WebAudio (sem asset). Silencia se o browser bloquear.
let ctx: AudioContext | null = null;

// Browsers bloqueiam áudio até o primeiro gesto: chama uma vez no mount
export function unlockAudio() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const unlock = () => { ctx?.resume().catch(() => {}); };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
  } catch {}
}

export function playPop() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
      if (ctx.state === "suspended") return;
    }
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(1320, t + 0.07);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  } catch {}
}

function ensureCtx(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol: number = 0.12) {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  gain.gain.setValueAtTime(vol, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + dur);
}

export function playDMReceiveSound() {
  tone(660, 0.08);
  setTimeout(() => tone(880, 0.08), 70);
  setTimeout(() => tone(1100, 0.12), 140);
}

export function playMentionSound() {
  tone(784, 0.1);
  setTimeout(() => tone(1047, 0.12), 100);
  setTimeout(() => tone(1319, 0.15), 200);
}

export function playMessageSendSound() {
  tone(440, 0.06, "sine", 0.08);
}

export function playErrorSound() {
  tone(200, 0.15, "square", 0.06);
  setTimeout(() => tone(150, 0.2, "square", 0.05), 100);
}
