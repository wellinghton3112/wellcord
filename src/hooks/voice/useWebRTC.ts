"use client";
import { useRef, useCallback } from "react";
import { buildIceServers, hasTurnConfigured } from "@/lib/ice";
import { tuneVideoSender, videoBitrateFor } from "@/lib/video";
import type { ScreenQuality, CodecMode } from "@/lib/video";

type Peer = {
  id: string;
  username: string;
  avatar?: string;
  muted?: boolean;
};

type WebRTCOptions = {
  myIdRef: React.MutableRefObject<string>;
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  screenOn: boolean;
  screenQualityRef: React.MutableRefObject<ScreenQuality>;
  codecModeRef: React.MutableRefObject<CodecMode>;
  channelRef: React.MutableRefObject<any>;
  remoteAudiosRef: React.MutableRefObject<Map<string, HTMLAudioElement>>;
  remoteVideosRef: React.MutableRefObject<Map<string, HTMLVideoElement>>;
  analysersRef: React.MutableRefObject<Map<string, AnalyserNode>>;
  prevSpeakingRef: React.MutableRefObject<Record<string, boolean>>;
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  deafened: boolean;
  setError: (msg: string) => void;
  setPeers: React.Dispatch<React.SetStateAction<Peer[]>>;
  setRemoteStreams: React.Dispatch<React.SetStateAction<Record<string, MediaStream>>>;
  setupAnalyser: (id: string, stream: MediaStream) => void;
  channelId: string;
  setParticipants: (channelId: string, peers: Peer[]) => void;
  peersRef?: React.MutableRefObject<Map<string, RTCPeerConnection>>;
};

export function useWebRTC(options: WebRTCOptions) {
  const {
    myIdRef,
    localStreamRef,
    screenOn,
    screenQualityRef,
    codecModeRef,
    channelRef,
    remoteAudiosRef,
    remoteVideosRef,
    analysersRef,
    prevSpeakingRef,
    audioContextRef,
    deafened,
    setError,
    setPeers,
    setRemoteStreams,
    setupAnalyser,
    channelId,
    setParticipants,
    peersRef: externalPeersRef,
  } = options;

  const internalPeersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const peersRef = externalPeersRef || internalPeersRef;

  const createPeer = useCallback((peerId: string, isInitiator: boolean) => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)!;
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
    peersRef.current.set(peerId, pc);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, localStreamRef.current!);
        } catch {}
        if (track.kind === "video") {
          tuneVideoSender(pc, track, { screen: screenOn, maxBitrate: videoBitrateFor(screenQualityRef.current) }).catch(() => {});
        }
      });
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "ice",
          payload: { from: myIdRef.current, to: peerId, candidate: e.candidate },
        });
      }
    };

    pc.ontrack = (e) => {
      if (e.track.kind === "audio") {
        let audio = remoteAudiosRef.current.get(peerId);
        if (!audio) {
          audio = document.createElement("audio");
          (audio as any).playsInline = true;
          document.body.appendChild(audio);
          remoteAudiosRef.current.set(peerId, audio);
        }
        audio.srcObject = e.streams[0];
        audio.muted = deafened;
        audio.play().catch(() => {
          setError("Clique em qualquer lugar para ativar o áudio");
        });
        setupAnalyser(peerId, e.streams[0]);
      }
      if (e.track.kind === "video") {
        setRemoteStreams((prev) => ({ ...prev, [peerId]: e.streams[0] }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        pc.getStats().then((stats) => {
          stats.forEach((r: any) => {
            if (r.type === "candidate-pair" && (r.state === "succeeded" || r.nominated)) {
              const local = (stats as any).get?.(r.localCandidateId);
              console.log(`[voz] peer ${peerId} conectado via ${local?.candidateType || "?"}`);
            }
          });
        }).catch(() => {});
        return;
      }
      if (pc.connectionState === "failed") {
        const retries = Number((pc as any).__iceRestarts || 0);
        if (retries < 1) {
          (pc as any).__iceRestarts = retries + 1;
          pc.restartIce();
          if (peersRef.current.has(peerId)) {
            pc.createOffer({ iceRestart: true }).then(async (offer) => {
              await pc.setLocalDescription(offer);
              channelRef.current?.send({ type: "broadcast", event: "offer", payload: { from: myIdRef.current, to: peerId, sdp: offer } });
            }).catch(() => {});
          }
          return;
        }
        if (!hasTurnConfigured()) {
          setError("Conexão de voz falhou (NAT restrito?). Sem TURN configurado, alguns pares não conectam — avise o admin.");
        }
        pc.close();
        peersRef.current.delete(peerId);
        remoteAudiosRef.current.get(peerId)?.remove();
        remoteAudiosRef.current.delete(peerId);
        remoteVideosRef.current.get(peerId)?.remove();
        remoteVideosRef.current.delete(peerId);
        setRemoteStreams((prev) => {
          const n = { ...prev };
          delete n[peerId];
          return n;
        });
        setPeers((p) => p.filter((x) => x.id !== peerId));
      }
    };

    if (isInitiator) {
      pc.createOffer().then(async (offer) => {
        await pc.setLocalDescription(offer);
        channelRef.current?.send({ type: "broadcast", event: "offer", payload: { from: myIdRef.current, to: peerId, sdp: offer } });
      });
    }
    return pc;
  }, [screenOn, deafened, setError, setPeers, setRemoteStreams, setupAnalyser, channelId, setParticipants]);

  const renegotiate = useCallback(async () => {
    for (const [peerId, pc] of peersRef.current) {
      if (pc.signalingState !== "stable") continue;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channelRef.current?.send({ type: "broadcast", event: "offer", payload: { from: myIdRef.current, to: peerId, sdp: offer } });
      } catch (e) {
        console.warn(`[voz] renegotiation with ${peerId} failed:`, e);
      }
    }
  }, []);

  const swapAudioTrack = useCallback(async (track: MediaStreamTrack | null) => {
    if (!track) return;
    const mutedRef = { current: false };
    track.enabled = !mutedRef.current;
    for (const pc of peersRef.current.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
      if (sender) {
        try { await sender.replaceTrack(track); } catch {}
      }
    }
  }, []);

  const cleanupPeers = useCallback(() => {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    remoteAudiosRef.current.forEach((a) => a.remove());
    remoteAudiosRef.current.clear();
    remoteVideosRef.current.forEach((v) => v.remove());
    remoteVideosRef.current.clear();
    analysersRef.current.clear();
    prevSpeakingRef.current = {};
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
  }, []);

  return {
    peersRef,
    createPeer,
    renegotiate,
    swapAudioTrack,
    cleanupPeers,
  };
}
