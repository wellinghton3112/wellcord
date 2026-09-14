"use client";
import { useRef, useState, useCallback } from "react";

type NoiseSuppressionOptions = {
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  rawStreamRef: React.MutableRefObject<MediaStream | null>;
  swapAudioTrack: (track: MediaStreamTrack | null) => Promise<void>;
};

export function useNoiseSuppression(options: NoiseSuppressionOptions) {
  const { localStreamRef, rawStreamRef, swapAudioTrack } = options;

  const [denoise, setDenoise] = useState(true);
  const [denoiseActive, setDenoiseActive] = useState(false);
  const denoiseRef = useRef<{ stop: () => void } | null>(null);

  const toggleDenoise = useCallback(async (joined: boolean, setError: (msg: string) => void) => {
    if (!joined || !rawStreamRef.current) {
      setError("Entre na voz com microfone para usar a supressão de ruído.");
      return;
    }
    if (denoiseRef.current) {
      try { denoiseRef.current.stop(); } catch {}
      denoiseRef.current = null;
      const track = rawStreamRef.current.getAudioTracks()[0] || null;
      if (localStreamRef.current && track) {
        localStreamRef.current.getAudioTracks().forEach((t) => { try { localStreamRef.current?.removeTrack(t); } catch {} });
        localStreamRef.current.addTrack(track);
      }
      await swapAudioTrack(track);
      setDenoise(false);
      setDenoiseActive(false);
      console.log("[voz] RNNoise desativado (mic cru)");
      return;
    }
    setDenoise(true);
    try {
      const { createDenoiser } = await import("@/lib/noise");
      const d = await createDenoiser(rawStreamRef.current);
      denoiseRef.current = d;
      const track = d.output.getAudioTracks()[0] || null;
      if (localStreamRef.current && track) {
        localStreamRef.current.getAudioTracks().forEach((t) => { try { localStreamRef.current?.removeTrack(t); } catch {} });
        localStreamRef.current.addTrack(track);
      }
      await swapAudioTrack(track);
      setDenoiseActive(true);
      console.log("[voz] RNNoise ativado");
    } catch (e: any) {
      console.warn("[voz] falha ao ativar RNNoise, mantendo mic cru", e);
      setDenoise(false);
      setDenoiseActive(false);
      setError("RNNoise falhou (" + (e?.message || e) + "). Mic do navegador em uso.");
    }
  }, [localStreamRef, rawStreamRef, swapAudioTrack]);

  const initDenoise = useCallback(async (stream: MediaStream) => {
    if (denoise) {
      try {
        const { createDenoiser } = await import("@/lib/noise");
        const d = await createDenoiser(stream);
        denoiseRef.current = d;
        const clean = d.output.getAudioTracks()[0];
        if (clean) {
          localStreamRef.current = d.output;
          setDenoiseActive(true);
          console.log("[voz] RNNoise ativado");
        }
      } catch (e) {
        console.warn("[voz] RNNoise indisponível, usando mic do navegador", e);
        setDenoise(false);
        setDenoiseActive(false);
      }
    } else {
      setDenoiseActive(false);
    }
  }, [denoise, localStreamRef]);

  const cleanupDenoise = useCallback(() => {
    if (denoiseRef.current) {
      try { denoiseRef.current.stop(); } catch {}
      denoiseRef.current = null;
    }
    setDenoiseActive(false);
  }, []);

  return {
    denoise,
    denoiseActive,
    toggleDenoise,
    initDenoise,
    cleanupDenoise,
  };
}
