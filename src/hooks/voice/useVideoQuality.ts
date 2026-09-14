"use client";
import { useEffect, useState, useRef } from "react";
import { getVideoStats } from "@/lib/video";

type Peer = {
  id: string;
  username: string;
  avatar?: string;
  muted?: boolean;
};

type VideoQualityOptions = {
  screenOn: boolean;
  joined: boolean;
  peers: Peer[];
  peersRef: React.MutableRefObject<Map<string, RTCPeerConnection>>;
  localStreamRef: React.MutableRefObject<MediaStream | null>;
};

export function useVideoQuality(options: VideoQualityOptions) {
  const { screenOn, joined, peers, peersRef, localStreamRef } = options;

  const [peerQuality, setPeerQuality] = useState<Record<string, { fps: number; bytes: number; limitation?: string }>>({});
  const peerQualityPrevRef = useRef<Map<string, { bytes: number; ts: number }>>(new Map());

  // Leitura real do envio (1/s) enquanto transmite tela
  useEffect(() => {
    if (!screenOn) return;
    const iv = setInterval(async () => {
      try {
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (!track) return;
        let targetPc: RTCPeerConnection | undefined;
        for (const pc of peersRef.current.values()) {
          if (pc.getSenders().some((s) => s.track?.kind === "video")) {
            targetPc = pc;
            break;
          }
        }
        if (!targetPc) return;
        const s = await getVideoStats(targetPc, track);
        if (!s) return;
      } catch {}
    }, 1000);
    return () => clearInterval(iv);
  }, [screenOn]);

  // Stats de qualidade por peer (2/s)
  useEffect(() => {
    if (!joined || peers.length === 0) { setPeerQuality({}); return; }
    const iv = setInterval(async () => {
      const next: Record<string, { fps: number; bytes: number; limitation?: string }> = {};
      for (const [peerId, pc] of peersRef.current) {
        try {
          const stats = await pc.getStats();
          stats.forEach((report: any) => {
            if (report.type === "inbound-rtp" && report.kind === "video") {
              const prev = peerQualityPrevRef.current.get(peerId);
              const now = { bytes: report.bytesReceived || 0, ts: report.timestamp };
              peerQualityPrevRef.current.set(peerId, now);
              let fps = report.framesPerSecond || 0;
              let limitation = report.qualityLimitationReason || undefined;
              if (prev && now.ts > prev.ts && now.bytes >= prev.bytes) {
                const mbps = ((now.bytes - prev.bytes) * 8 / ((now.ts - prev.ts) / 1000) / 1e6);
                next[peerId] = { fps, bytes: Math.round(mbps * 100) / 100, limitation };
              } else {
                next[peerId] = { fps, bytes: 0, limitation };
              }
            }
          });
        } catch {}
      }
      setPeerQuality(next);
    }, 2000);
    return () => clearInterval(iv);
  }, [joined, peers.length]);

  return {
    peerQuality,
  };
}
