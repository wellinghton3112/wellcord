// Qualidade de vídeo WebRTC: bitrate alto + VP9 + nitidez.
// Sem isso o navegador economiza banda e o vídeo fica borrado/quadriculado.

export const VIDEO_BITRATE: Record<string, number> = {
  camera: 1_500_000, // 1.5 Mbps
  "720": 2_500_000, // 2.5 Mbps
  "1080": 5_000_000, // 5 Mbps
  "1440": 8_000_000, // 8 Mbps
  auto: 5_000_000,
};

// Prefere VP9 (mais nítido por bit que VP8) mantendo os demais como fallback
function preferVP9(pc: RTCPeerConnection, track: MediaStreamTrack) {
  try {
    const recv = (RTCRtpReceiver as any).getCapabilities?.("video");
    const codecs: any[] = recv?.codecs || [];
    if (codecs.length === 0) return;
    const vp9 = codecs.filter((c) => /vp9/i.test(c.mimeType));
    const rest = codecs.filter((c) => !/vp9/i.test(c.mimeType));
    if (vp9.length === 0) return;
    const transceiver = pc
      .getTransceivers()
      .find((t) => t.sender.track === track && (t as any).currentDirection !== "stopped");
    (transceiver as any)?.setCodecPreferences?.([...vp9, ...rest]);
  } catch {}
}

// Aplica nitidez + bitrate no sender da trilha de vídeo
export async function tuneVideoSender(
  pc: RTCPeerConnection,
  track: MediaStreamTrack,
  opts: { screen: boolean; maxBitrate?: number }
) {
  try {
    // Tela: prioriza detalhe (texto nítido). Câmera: prioriza fluidez.
    (track as any).contentHint = opts.screen ? "detail" : "motion";
  } catch {}
  preferVP9(pc, track);
  try {
    const sender = pc.getSenders().find((s) => s.track === track);
    if (!sender) return;
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
    params.encodings[0].maxBitrate = opts.maxBitrate ?? VIDEO_BITRATE.auto;
    (params as any).degradationPreference = opts.screen ? "maintain-resolution" : "balanced";
    await sender.setParameters(params);
  } catch (e) {
    console.warn("[voz] navegador recusou tuning de vídeo, seguindo padrão", e);
  }
}

export function videoBitrateFor(quality: "auto" | "720" | "1080" | "1440"): number {
  return VIDEO_BITRATE[quality] ?? VIDEO_BITRATE.auto;
}
