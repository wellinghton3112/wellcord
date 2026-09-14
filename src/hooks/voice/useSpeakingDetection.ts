"use client";
import { useRef, useState, useCallback } from "react";

export function useSpeakingDetection() {
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});
  const prevSpeakingRef = useRef<Record<string, boolean>>({});
  const speakingLoopRef = useRef(false);

  const setupAnalyser = useCallback((
    id: string,
    stream: MediaStream,
    audioContextRef?: React.MutableRefObject<AudioContext | null>,
    analysersRef?: React.MutableRefObject<Map<string, AnalyserNode>>,
  ) => {
    try {
      if (!audioContextRef?.current) audioContextRef!.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioContextRef!.current;
      if (ctx.state === "suspended") ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analysersRef?.current.set(id, analyser);
    } catch {}
  }, []);

  const startSpeakingLoop = useCallback((
    analysersRef: React.MutableRefObject<Map<string, AnalyserNode>>,
    channelRef: React.MutableRefObject<any>,
  ) => {
    speakingLoopRef.current = true;
    const checkSpeaking = () => {
      if (!speakingLoopRef.current || !channelRef.current) return;
      const next: Record<string, boolean> = {};
      analysersRef.current.forEach((analyser, id) => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const wasSpeaking = prevSpeakingRef.current[id] || false;
        next[id] = wasSpeaking ? avg > 8 : avg > 14;
      });
      const changed = Object.keys(next).some((k) => next[k] !== prevSpeakingRef.current[k]) || Object.keys(prevSpeakingRef.current).some((k) => !(k in next));
      if (changed) {
        prevSpeakingRef.current = next;
        setSpeaking(next);
      }
      setTimeout(() => requestAnimationFrame(checkSpeaking), 80);
    };
    requestAnimationFrame(checkSpeaking);
  }, []);

  const stopSpeakingLoop = useCallback(() => {
    speakingLoopRef.current = false;
    prevSpeakingRef.current = {};
    setSpeaking({});
  }, []);

  return {
    speaking,
    setupAnalyser,
    startSpeakingLoop,
    stopSpeakingLoop,
  };
}
