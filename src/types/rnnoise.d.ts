declare module "simple-rnnoise-wasm" {
  export class RNNoiseNode extends AudioWorkletNode {
    static register(
      ctx: AudioContext,
      assets?: [string | URL, Promise<WebAssembly.Module>]
    ): Promise<void>;
    static ready: boolean;
    constructor(ctx: AudioContext);
    onstatus: ((e: any) => void) | null;
    update(keepalive?: boolean | "stat"): void;
  }
  export function rnnoise_loadAssets(options?: {
    scriptSrc?: string | URL;
    moduleSrc?: string | URL | BufferSource | Promise<Response>;
  }): Promise<[string, Promise<WebAssembly.Module>]>;
}
