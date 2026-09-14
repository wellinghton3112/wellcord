"use client";
import { useRef, useState, useCallback } from "react";
import { tuneVideoSender, videoBitrateFor, qualityDims, type ScreenQuality, type CodecMode } from "@/lib/video";

type ScreenShareOptions = {
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  peersRef: React.MutableRefObject<Map<string, RTCPeerConnection>>;
  localVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
  renegotiate: () => Promise<void>;
  setError: (msg: string) => void;
};

export function useScreenShare(options: ScreenShareOptions) {
  const { localStreamRef, peersRef, localVideoRef, renegotiate, setError } = options;

  const [screenOn, setScreenOn] = useState(false);
  const [screenQuality, setScreenQuality] = useState<ScreenQuality>("auto");
  const screenQualityRef = useRef<ScreenQuality>("auto");
  const [codecMode, setCodecMode] = useState<CodecMode>("sharp");
  const codecModeRef = useRef<CodecMode>("sharp");
  const [showScreenPicker, setShowScreenPicker] = useState(false);
  const [screenSources, setScreenSources] = useState<{ id: string; name: string; screen: boolean; thumbnail: string | null }[] | null>(null);
  const pickedRef = useRef(false);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const [sendStats, setSendStats] = useState("");
  const statsPrevRef = useRef<{ bytes: number; ts: number } | null>(null);

  const applyScreenQuality = useCallback(async (track: MediaStreamTrack, q: ScreenQuality) => {
    const dims = qualityDims(q);
    if (!dims) return;
    const [w, h, fps] = dims;
    try {
      await track.applyConstraints({ width: { ideal: w }, height: { ideal: h }, frameRate: { ideal: fps } });
      console.log(`[voz] tela em ~${q}`);
    } catch (e) {
      console.warn("[voz] navegador recusou a qualidade pedida, mantendo original", e);
    }
  }, []);

  const stopScreen = useCallback(async () => {
    const screenTrack = screenTrackRef.current;
    if (screenTrack) {
      screenTrack.stop();
      try { localStreamRef.current?.removeTrack(screenTrack); } catch {}
      peersRef.current.forEach((pc) => {
        pc.getSenders().filter((s) => s.track === screenTrack).forEach((s) => { try { pc.removeTrack(s); } catch {} });
      });
      screenTrackRef.current = null;
    }
    setScreenOn(false);
    await renegotiate();
  }, [localStreamRef, peersRef, renegotiate]);

  const attachScreenTrack = useCallback(async (track: MediaStreamTrack, audioTrack: MediaStreamTrack | null, cameraOn: boolean) => {
    await applyScreenQuality(track, screenQualityRef.current);
    if (!localStreamRef.current) localStreamRef.current = new MediaStream();
    screenTrackRef.current = track;
    localStreamRef.current.addTrack(track);
    if (audioTrack) { try { localStreamRef.current.addTrack(audioTrack); } catch {} }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = new MediaStream([track]);
      await localVideoRef.current.play().catch(() => {});
    }
    peersRef.current.forEach((pc) => {
      pc.addTrack(track, localStreamRef.current!);
      tuneVideoSender(pc, track, { screen: true, maxBitrate: videoBitrateFor(screenQualityRef.current), codec: codecModeRef.current, fps: qualityDims(screenQualityRef.current)?.[2] }).catch(() => {});
    });
    if (audioTrack) peersRef.current.forEach((pc) => { try { pc.addTrack(audioTrack, localStreamRef.current!); } catch {} });
    track.onended = () => stopScreen();
    setScreenOn(true);
    await renegotiate();
  }, [localStreamRef, peersRef, localVideoRef, renegotiate, applyScreenQuality, stopScreen]);

  const toggleScreen = useCallback(async (cameraOn: boolean) => {
    if (screenOn) {
      await stopScreen();
      return;
    }
    if (window.wellcord?.screens && !pickedRef.current) {
      setScreenSources(null);
      setShowScreenPicker(true);
      try {
        const list = await window.wellcord.screens.list();
        setScreenSources(list);
      } catch {
        setScreenSources([]);
      }
      return;
    }
    pickedRef.current = false;
    try {
      const dims = qualityDims(screenQualityRef.current);
      const videoReq: any = { displaySurface: "monitor" };
      if (dims) {
        videoReq.width = { ideal: dims[0] };
        videoReq.height = { ideal: dims[1] };
        videoReq.frameRate = { ideal: dims[2], max: dims[2] };
      }
      const stream: any = await (navigator.mediaDevices as any).getDisplayMedia({ video: videoReq, audio: true });
      const track = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      await attachScreenTrack(track, audioTrack || null, cameraOn);
    } catch (e: any) {
      if (e.name !== "NotAllowedError") setError(e.message);
    }
  }, [screenOn, stopScreen, attachScreenTrack, setError]);

  const pickAndShare = useCallback(async (sourceId: string, cameraOn: boolean) => {
    setShowScreenPicker(false);
    try {
      await window.wellcord?.screens?.pick(sourceId);
    } catch {}
    pickedRef.current = true;
    await toggleScreen(cameraOn);
  }, [toggleScreen]);

  const changeScreenQuality = useCallback(async (q: ScreenQuality) => {
    setScreenQuality(q);
    screenQualityRef.current = q;
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (screenOn && track) {
      await applyScreenQuality(track, q);
      const bitrate = videoBitrateFor(q);
      const fps = qualityDims(q)?.[2];
      for (const pc of peersRef.current.values()) {
        const sender = pc.getSenders().find((s) => s.track === track);
        if (sender) {
          try {
            const params = sender.getParameters();
            if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
            params.encodings[0].maxBitrate = bitrate;
            if (fps) {
              (params.encodings[0] as any).maxFramerate = fps;
              (params.encodings[0] as any).scalabilityMode = "L1T3";
            }
            await sender.setParameters(params);
          } catch {}
        }
      }
    }
  }, [screenOn, localStreamRef, peersRef, applyScreenQuality]);

  const changeCodecMode = useCallback(async (mode: CodecMode) => {
    setCodecMode(mode);
    codecModeRef.current = mode;
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!screenOn || !track) return;
    for (const pc of peersRef.current.values()) {
      await tuneVideoSender(pc, track, { screen: true, maxBitrate: videoBitrateFor(screenQualityRef.current), codec: mode, fps: qualityDims(screenQualityRef.current)?.[2] }).catch(() => {});
    }
    await renegotiate();
    console.log(`[voz] codec tela: ${mode}`);
  }, [screenOn, localStreamRef, peersRef, renegotiate]);

  const cleanupScreen = useCallback(() => {
    const screenTrack = screenTrackRef.current;
    if (screenTrack) {
      screenTrack.stop();
      screenTrackRef.current = null;
    }
    setScreenOn(false);
    setScreenQuality("auto");
    screenQualityRef.current = "auto";
    setCodecMode("sharp");
    codecModeRef.current = "sharp";
    setSendStats("");
  }, []);

  return {
    screenOn,
    screenQuality,
    screenQualityRef,
    codecMode,
    codecModeRef,
    showScreenPicker,
    setShowScreenPicker,
    screenSources,
    screenTrackRef,
    sendStats,
    setSendStats,
    statsPrevRef,
    toggleScreen,
    stopScreen,
    pickAndShare,
    changeScreenQuality,
    changeCodecMode,
    cleanupScreen,
  };
}
