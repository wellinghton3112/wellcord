import { RNNoiseNode, rnnoise_loadAssets } from "simple-rnnoise-wasm";

export type Denoiser = {
  /** Stream com áudio tratado (vai para a chamada). */
  output: MediaStream;
  /** Desmonta grafo + contexto. */
  stop: () => void;
};

// RNNoise (ML) roda num AudioWorklet a 48kHz e devolve o mic sem ruído de fundo.
// Falha (asset/WASM/AudioContext) => throw, e o chamador usa o mic cru.
export async function createDenoiser(raw: MediaStream): Promise<Denoiser> {
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) throw new Error("AudioContext indisponível");
  // RNNoise opera a 48kHz; o browser reamostra o mic sozinho
  const ctx: AudioContext = new AC({ sampleRate: 48000 });
  try {
    await ctx.resume().catch(() => {});
    const assets = await rnnoise_loadAssets({
      scriptSrc: "/rnnoise/rnnoise.worklet.js",
      moduleSrc: fetch("/rnnoise/rnnoise.wasm"),
    });
    await RNNoiseNode.register(ctx, assets as any);
    const src = ctx.createMediaStreamSource(raw);
    const node = new RNNoiseNode(ctx);
    const dest = ctx.createMediaStreamDestination();
    src.connect(node);
    node.connect(dest);
    node.update(true);
    const stop = () => {
      try { node.update(false); } catch {}
      try { src.disconnect(); } catch {}
      try { node.disconnect(); } catch {}
      ctx.close().catch(() => {});
    };
    return { output: dest.stream, stop };
  } catch (e) {
    try { ctx.close().catch(() => {}); } catch {}
    throw e;
  }
}
