// Qualidade de vídeo WebRTC: bitrate alto + VP9 + nitidez.
// Sem isso o navegador economiza banda e o vídeo fica borrado/quadriculado.

export type ScreenQuality =
  | "auto"
  | "720p30" | "720p60"
  | "1080p30" | "1080p60"
  | "1440p30" | "1440p60" | "1440p120";

export const SCREEN_QUALITIES: ScreenQuality[] = [
  "auto", "720p30", "720p60", "1080p30", "1080p60", "1440p30", "1440p60", "1440p120",
];

export function qualityLabel(q: ScreenQuality): string {
  return q === "auto" ? "Auto" : q.replace("p", "p ");
}

// [largura, altura, fps, bitrate]
const SPECS: Record<Exclude<ScreenQuality, "auto">, [number, number, number, number]> = {
  "720p30": [1280, 720, 30, 2_500_000],
  "720p60": [1280, 720, 60, 4_000_000],
  "1080p30": [1920, 1080, 30, 5_000_000],
  "1080p60": [1920, 1080, 60, 8_000_000],
  "1440p30": [2560, 1440, 30, 8_000_000],
  "1440p60": [2560, 1440, 60, 12_000_000],
  "1440p120": [2560, 1440, 120, 16_000_000],
};

export const VIDEO_BITRATE: Record<string, number> = {
  camera: 1_500_000, // 1.5 Mbps
  auto: 5_000_000,
  ...Object.fromEntries(Object.entries(SPECS).map(([k, [, , , b]]) => [k, b])),
};

// Prefere codecs na ordem dada (ex: H264 p/ fluidez via hardware, VP9 p/ nitidez)
export function preferCodecs(pc: RTCPeerConnection, track: MediaStreamTrack, wants: RegExp[]) {
  try {
    const recv = (RTCRtpReceiver as any).getCapabilities?.("video");
    const codecs: any[] = recv?.codecs || [];
    if (codecs.length === 0) return false;
    const ordered: any[] = [];
    for (const w of wants) {
      for (const c of codecs) {
        if (w.test(c.mimeType) && !ordered.includes(c)) ordered.push(c);
      }
    }
    for (const c of codecs) if (!ordered.includes(c)) ordered.push(c);
    if (ordered.length === 0) return false;
    const transceiver = pc
      .getTransceivers()
      .find((t) => t.sender.track === track && (t as any).currentDirection !== "stopped");
    (transceiver as any)?.setCodecPreferences?.(ordered);
    return true;
  } catch {
    return false;
  }
}

// H264 Baseline primeiro: é o perfil que toda GPU (Intel/NVIDIA/AMD) acelera.
// Constrained-Baseline (42e0) > Baseline (4200) > resto, para máxima chance de HW.
export function preferHardwareH264(pc: RTCPeerConnection, track: MediaStreamTrack) {
  try {
    const recv = (RTCRtpReceiver as any).getCapabilities?.("video");
    const codecs: any[] = recv?.codecs || [];
    const h264 = codecs.filter((c) => /h264/i.test(c.mimeType || ""));
    if (h264.length === 0) return preferCodecs(pc, track, [/h264/i]);
    const rank = (c: any) => {
      const fmtp = String(c.sdpFmtpLine || "").toLowerCase();
      if (/42e0/.test(fmtp)) return 0;
      if (/4200/.test(fmtp) || /4d00/.test(fmtp)) return 1;
      return 2;
    };
    const ordered = [...h264].sort((a, b) => rank(a) - rank(b));
    for (const c of codecs) if (!ordered.includes(c)) ordered.push(c);
    const transceiver = pc
      .getTransceivers()
      .find((t) => t.sender.track === track && (t as any).currentDirection !== "stopped");
    (transceiver as any)?.setCodecPreferences?.(ordered);
    console.log("[voz] codecs H264 ordenados (baseline primeiro):", ordered.slice(0, 3).map((c) => c.sdpFmtpLine).join(" | "));
    return true;
  } catch {
    return false;
  }
}

// Prefere VP9 (mais nítido por bit que VP8) mantendo os demais como fallback
function preferVP9(pc: RTCPeerConnection, track: MediaStreamTrack) {
  preferCodecs(pc, track, [/vp9/i]);
}

export type CodecMode = "sharp" | "smooth"; // VP9 software nítido | H264 hardware fluido

// Aplica nitidez + bitrate no sender da trilha de vídeo
export async function tuneVideoSender(
  pc: RTCPeerConnection,
  track: MediaStreamTrack,
  opts: { screen: boolean; maxBitrate?: number; codec?: CodecMode; fps?: number }
) {
  try {
    // Tela: prioriza detalhe (texto nítido). Câmera: prioriza fluidez.
    (track as any).contentHint = opts.screen ? "detail" : "motion";
  } catch {}
  if (opts.codec === "smooth") preferHardwareH264(pc, track);
  else preferVP9(pc, track);
  try {
    const sender = pc.getSenders().find((s) => s.track === track);
    if (!sender) return;
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
    params.encodings[0].maxBitrate = opts.maxBitrate ?? VIDEO_BITRATE.auto;
    if (opts.fps && opts.fps > 0) {
      (params.encodings[0] as any).maxFramerate = opts.fps;
      // Camadas temporais: mantém fluidez quando a rede oscila
      (params.encodings[0] as any).scalabilityMode = "L1T3";
    }
    // Tela nítida: segura resolução (cai fps). Tela fluida: segura fps (cai resolução).
    // Câmera: equilibrado.
    (params as any).degradationPreference = !opts.screen
      ? "balanced"
      : opts.codec === "smooth"
        ? "maintain-framerate"
        : "maintain-resolution";
    await sender.setParameters(params);
  } catch (e) {
    console.warn("[voz] navegador recusou tuning de vídeo, seguindo padrão", e);
  }
}

// Leitura real do que está sendo enviado (prova do que mudou).
// mbps calculado pelo chamador via delta de bytesSent/timestamp.
export async function getVideoStats(
  pc: RTCPeerConnection,
  track: MediaStreamTrack
): Promise<{ fps: number; bytesSent: number; ts: number; width: number; height: number; limitation: string } | null> {
  try {
    const sender = pc.getSenders().find((s) => s.track === track);
    if (!sender) return null;
    const stats: any = await sender.getStats();
    let out: any = null;
    let remote: any = null;
    stats.forEach((r: any) => {
      if (r.type === "outbound-rtp" && !r.isRemote) out = r;
      if (r.type === "remote-inbound-rtp") remote = r;
    });
    if (!out) return null;
    return {
      fps: Math.round(out.framesPerSecond || 0),
      bytesSent: out.bytesSent || 0,
      ts: out.timestamp || 0,
      width: out.frameWidth || 0,
      height: out.frameHeight || 0,
      limitation: remote?.qualityLimitationReason || (out as any).qualityLimitationReason || "?",
    };
  } catch {
    return null;
  }
}

export function videoBitrateFor(quality: ScreenQuality): number {
  return VIDEO_BITRATE[quality] ?? VIDEO_BITRATE.auto;
}

export function qualityDims(quality: ScreenQuality): [number, number, number] | null {
  if (quality === "auto") return null;
  const [w, h, fps] = SPECS[quality];
  return [w, h, fps];
}
