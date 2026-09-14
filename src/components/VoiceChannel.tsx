"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Mic, MicOff, PhoneOff, Headphones, Volume2, Video, VideoOff, Monitor, MonitorOff, Maximize2, X, Waves, Eye, EyeOff } from "lucide-react";
import { useVoice } from "@/context/VoiceContext";
import { hasTurnConfigured } from "@/lib/ice";
import { SCREEN_QUALITIES, qualityLabel, qualityDims, VIDEO_BITRATE, type ScreenQuality, type CodecMode } from "@/lib/video";
import Avatar from "@/components/Avatar";
import ScreenPickerModal from "@/components/modals/ScreenPickerModal";
import { useWebRTC } from "@/hooks/voice/useWebRTC";
import { useScreenShare } from "@/hooks/voice/useScreenShare";
import { useNoiseSuppression } from "@/hooks/voice/useNoiseSuppression";
import { useSpeakingDetection } from "@/hooks/voice/useSpeakingDetection";
import { useVideoQuality } from "@/hooks/voice/useVideoQuality";

type Props = {
  channelId: string;
  username: string;
  status?: string;
  channelName?: string;
  serverName?: string;
  avatar?: string;
};

type Peer = {
  id: string;
  username: string;
  avatar?: string;
  muted?: boolean;
};

export default function VoiceChannel({ channelId, username, status, channelName, serverName, avatar }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { setParticipants, setStatus: setVoiceStatus, controlsRef } = useVoice();
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [error, setError] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [hiddenVideo, setHiddenVideo] = useState<Record<string, boolean>>({});
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [sessionChannel, setSessionChannel] = useState<string | null>(null);

  const expandedVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const channelRef = useRef<any>(null);
  const leaveRef = useRef<() => void>(() => {});
  const sessionChannelRef = useRef<string | null>(null);
  const myIdRef = useRef<string>("");
  const joiningRef = useRef(false);
  const mutedRef = useRef(false);
  const cleanedUpRef = useRef(false);

  const {
    speaking,
    setupAnalyser: setupSpeakingAnalyser,
    startSpeakingLoop,
    stopSpeakingLoop,
  } = useSpeakingDetection();

  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const renegotiateRef = useRef<() => Promise<void>>(async () => {});

  const webrtc = useWebRTC({
    myIdRef,
    localStreamRef,
    screenOn: false,
    screenQualityRef: { current: "auto" } as React.MutableRefObject<any>,
    codecModeRef: { current: "sharp" } as React.MutableRefObject<any>,
    channelRef,
    remoteAudiosRef: useRef(new Map<string, HTMLAudioElement>()),
    remoteVideosRef: useRef(new Map<string, HTMLVideoElement>()),
    analysersRef,
    prevSpeakingRef: useRef<Record<string, boolean>>({}),
    audioContextRef,
    deafened,
    setError,
    setPeers,
    setRemoteStreams,
    setupAnalyser: setupSpeakingAnalyser,
    channelId,
    setParticipants,
    peersRef,
  });

  const { createPeer, renegotiate, swapAudioTrack, cleanupPeers } = webrtc;
  renegotiateRef.current = renegotiate;

  const screenShare = useScreenShare({
    localStreamRef,
    peersRef,
    localVideoRef,
    renegotiate: useCallback(async () => renegotiateRef.current(), []),
    setError,
  });

  const { peerQuality } = useVideoQuality({
    screenOn: screenShare.screenOn,
    joined,
    peers,
    peersRef,
    localStreamRef,
  });

  const { denoise, denoiseActive, toggleDenoise: toggleDenoiseHook, initDenoise, cleanupDenoise } = useNoiseSuppression({
    localStreamRef,
    rawStreamRef,
    swapAudioTrack,
  });

  useEffect(() => {
    if (!myIdRef.current) myIdRef.current = `${username}-${Math.random().toString(36).slice(2, 7)}`;
  }, []);

  useEffect(() => {
    const v = localVideoRef.current;
    if (!v) return;
    if (cameraOn || screenShare.screenOn) {
      const vt = localStreamRef.current?.getVideoTracks()[0];
      if (vt && (v.srcObject as MediaStream | null)?.getVideoTracks()[0] !== vt) {
        v.srcObject = new MediaStream([vt]);
        v.play().catch(() => {});
      }
    } else {
      if (v.srcObject) v.srcObject = null;
    }
  }, [cameraOn, screenShare.screenOn, joined]);

  useEffect(() => {
    if (!expanded) return;
    const v = expandedVideoRef.current;
    if (!v) return;
    const src = expanded === "local"
      ? localVideoRef.current?.srcObject as MediaStream | null
      : remoteStreams[expanded] || null;
    if (src && v.srcObject !== src) {
      v.srcObject = src;
      v.play().catch(() => {});
    }
  }, [expanded, remoteStreams, cameraOn, screenShare.screenOn]);

  const maybeEndCall = (cid?: string | null) => {
    const target = cid || sessionChannelRef.current || channelId;
    supabase
      .from("voice_sessions")
      .select("user_id", { count: "exact", head: true })
      .eq("channel_id", target)
      .then(({ count }) => {
        if (!count) supabase.from("voice_calls").delete().eq("channel_id", target).then(() => {});
      });
  };

  const cleanup = () => {
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;
    stopSpeakingLoop();
    cleanupDenoise();
    if (rawStreamRef.current) {
      rawStreamRef.current.getTracks().forEach((t) => t.stop());
      rawStreamRef.current = null;
    }
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }
    cleanupPeers();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setRemoteStreams({});
    setParticipants(sessionChannelRef.current || channelId, []);
  };

  const cleanupAndLeave = async () => {
    const cid = sessionChannelRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (user && cid) {
      await supabase.from("voice_sessions").delete().eq("channel_id", cid).eq("user_id", user.id);
      maybeEndCall(cid);
    }
    cleanup();
  };

  useEffect(() => {
    return () => { cleanupAndLeave(); cleanedUpRef.current = false; };
  }, []);

  useEffect(() => {
    const handleOffline = () => {
      if (joined) {
        leaveRef.current();
        setError("Desconectado da voz porque ficou sem internet");
      }
    };
    const handleBeforeUnload = () => {
      if (!joined) return;
      cleanupPeers();
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [joined, channelId, supabase]);

  const testMic = async () => {
    setError("Testando microfone...");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Seu navegador não suporta microfone ou não está em HTTPS. Use Chrome/Firefox no https://wellcord.vercel.app");
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
      setError("✅ Microfone OK! Agora clique em Entrar na voz.");
    } catch (e: any) {
      console.error(e);
      if (e.name === "NotFoundError") setError(`Nenhum microfone no PC. Plugue um headset ou teste no celular. Você ainda pode Entrar na voz como ouvinte.`);
      else setError(`Teste falhou: ${e.name}: ${e.message}. Veja o cadeado 🔒 > Microfone > Permitir ou teste no celular.`);
    }
  };

  const join = async (asListener = false) => {
    if (joiningRef.current) return;
    joiningRef.current = true;
    if (joined && sessionChannelRef.current && sessionChannelRef.current !== channelId) {
      await leave();
    }
    if ((joined && sessionChannelRef.current === channelId) || channelRef.current) { joiningRef.current = false; return; }
    sessionChannelRef.current = channelId;
    setSessionChannel(channelId);
    if (!myIdRef.current) myIdRef.current = `${username}-${Math.random().toString(36).slice(2, 7)}`;
    setError("");
    let stream: MediaStream | null = null;
    try {
      if (!asListener) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Navegador sem suporte a microfone. Use Chrome/Edge/Firefox em HTTPS.");
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: !denoise, autoGainControl: true }, video: false });
        } catch (e: any) {
          if (e.name === "NotFoundError") {
            setError("Sem microfone, entrando como ouvinte. Voce ouve mas nao fala. Plugue um mic para falar.");
          } else throw e;
        }
      }
      localStreamRef.current = stream;
      rawStreamRef.current = stream;
      if (stream) await initDenoise(stream);
      else {
        // denoise state managed by hook
      }
      if (localStreamRef.current) setupSpeakingAnalyser("local", localStreamRef.current, audioContextRef, analysersRef);
      if (channelRef.current) { try { supabase.removeChannel(channelRef.current); } catch {} channelRef.current = null; }
      const ch = supabase.channel(`voice:${channelId}`, { config: { presence: { key: myIdRef.current }, broadcast: { self: false } } });
      channelRef.current = ch;

      ch.on("broadcast", { event: "offer" }, async ({ payload }: any) => {
        if (payload.to !== myIdRef.current) return;
        const pc = createPeer(payload.from, false);
        const polite = myIdRef.current < payload.from;
        try {
          if (pc!.signalingState !== "stable") {
            if (!polite) return;
            if (screenShare.screenOn) return;
            await pc!.setLocalDescription({ type: "rollback" });
          }
          await pc!.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc!.createAnswer();
          await pc!.setLocalDescription(answer);
          ch.send({ type: "broadcast", event: "answer", payload: { from: myIdRef.current, to: payload.from, sdp: answer } });
        } catch (e) {
          console.warn(`[voz] oferta de ${payload.from} ignorada (glare resolvido pelo outro lado)`);
        }
      });

      ch.on("broadcast", { event: "answer" }, async ({ payload }: any) => {
        if (payload.to !== myIdRef.current) return;
        const pc = peersRef.current.get(payload.from);
        if (!pc) return;
        if (pc.signalingState !== "have-local-offer") return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        } catch (e) {
          console.warn(`[voz] resposta de ${payload.from} ignorada (fora de hora)`);
        }
      });

      ch.on("broadcast", { event: "ice" }, async ({ payload }: any) => {
        if (payload.to !== myIdRef.current) return;
        const pc = peersRef.current.get(payload.from);
        if (!pc || !payload.candidate) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch {}
      });

      ch.on("presence", { event: "sync" }, () => {
        if (cleanedUpRef.current) return;
        const state: any = ch.presenceState();
        const seen = new Map<string, { username: string; avatar: string }>();
        Object.values(state).forEach((arr: any) =>
          (arr as any[]).forEach((p: any) => {
            const pid = p.id || p.user_id;
            if (pid && !seen.has(pid)) seen.set(pid, { username: p.username || pid.split("-")[0], avatar: p.avatar || "😎" });
          })
        );
        const ids = [...seen.keys()];
        ids.forEach((id) => {
          if (id === myIdRef.current) return;
          if (!peersRef.current.has(id)) createPeer(id, true);
        });
        peersRef.current.forEach((_, id) => {
          if (!ids.includes(id)) {
            peersRef.current.get(id)?.close();
            peersRef.current.delete(id);
          }
        });
        const peerList = ids.map((id) => ({ id, username: seen.get(id)?.username || id.split("-")[0], avatar: seen.get(id)?.avatar || "😎" }));
        setPeers(peerList.filter((p) => p.id !== myIdRef.current));
        setParticipants(channelId, peerList);
      });

      ch.subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ id: myIdRef.current, username, avatar: avatar || "😎" });
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("voice_sessions").delete().eq("channel_id", channelId).eq("user_id", user.id);
            const { count } = await supabase.from("voice_sessions").select("user_id", { count: "exact", head: true }).eq("channel_id", channelId);
            if (!count) {
              await supabase.from("voice_calls").upsert({ channel_id: channelId, started_at: new Date().toISOString() }, { onConflict: "channel_id" });
            }
            await supabase.from("voice_sessions").upsert({ channel_id: channelId, user_id: user.id, username, joined_at: new Date().toISOString() }, { onConflict: "channel_id,user_id" });
          }
          setJoined(true);
          startSpeakingLoop(analysersRef, channelRef);
        }
      });
    } catch (e: any) {
      sessionChannelRef.current = null;
      setSessionChannel(null);
      if (e.name === "NotFoundError" || e.message?.includes("Requested device")) {
        setError("Microfone não encontrado. Verifique: 1) Windows > Configurações > Privacidade > Microfone > Permitir 2) Chrome > cadeado na barra de endereço > Microfone > Permitir 3) Nenhum outro app usando o mic. Tente no celular!");
      } else if (e.name === "NotAllowedError") {
        setError("Permissão negada. Clique no cadeado 🔒 ao lado da URL > Microfone > Permitir e recarregue.");
      } else {
        setError(e.message || "Erro ao acessar microfone");
      }
    } finally {
      joiningRef.current = false;
    }
  };

  const leave = async () => {
    await cleanupAndLeave();
    cleanedUpRef.current = false;
    sessionChannelRef.current = null;
    setSessionChannel(null);
    setJoined(false);
    setPeers([]);
    setExpanded(null);
    setCameraOn(false);
    screenShare.cleanupScreen();
    setMuted(false);
    setDeafened(false);
  };

  useEffect(() => { leaveRef.current = leave; mutedRef.current = muted; });

  useEffect(() => {
    if (!window.wellcord) return;
    const offPtt = window.wellcord.ptt.onPress(() => {
      try {
        const raw = localStorage.getItem("wellcord-ptt");
        const enabled = raw ? JSON.parse(raw).enabled : false;
        if (enabled && channelRef.current) toggleMute();
      } catch {}
    });
    const offCtl = window.wellcord.voice.onControl((action) => {
      if (action === "leave") leaveRef.current();
    });
    return () => { offPtt(); offCtl(); };
  }, []);

  const toggleHideVideo = (peerId: string) => {
    setHiddenVideo((prev) => {
      const next = { ...prev, [peerId]: !prev[peerId] };
      if (next[peerId] && expanded === peerId) setExpanded(null);
      return next;
    });
  };

  const toggleFullscreen = () => {
    if (!expandedRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else expandedRef.current.requestFullscreen().catch(() => {});
  };

  const toggleMute = () => {
    const enabled = !mutedRef.current;
    if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !enabled));
    mutedRef.current = enabled;
    setMuted(enabled);
    if (channelRef.current) channelRef.current.track({ id: myIdRef.current, username, avatar: avatar || "😎", muted: enabled });
  };

  const toggleDeafen = () => {
    const v = !deafened;
    setDeafened(v);
    if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = v ? false : !mutedRef.current));
    if (v && !mutedRef.current) { mutedRef.current = true; setMuted(true); }
  };

  useEffect(() => {
    controlsRef.current = { toggleMute, toggleDeafen, leave };
  });
  useEffect(() => {
    setVoiceStatus({
      joined,
      channelId: sessionChannel || channelId,
      ...(channelName ? { channelName } : {}),
      ...(serverName ? { serverName } : {}),
      muted,
      deafened,
    } as any);
  }, [joined, muted, deafened, sessionChannel, channelId]);

  const toggleCamera = async () => {
    if (cameraOn) {
      localStreamRef.current?.getVideoTracks().forEach((t) => { t.stop(); try { localStreamRef.current?.removeTrack(t); } catch {} });
      peersRef.current.forEach((pc) => {
        pc.getSenders().filter((s) => s.track?.kind === "video").forEach((s) => { try { pc.removeTrack(s); } catch {} });
      });
      if (localVideoRef.current && !screenShare.screenOn) { localVideoRef.current.srcObject = null; localVideoRef.current.pause(); }
      setCameraOn(false);
      await renegotiate();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 }, audio: false });
      const track = stream.getVideoTracks()[0];
      if (!localStreamRef.current) localStreamRef.current = new MediaStream();
      localStreamRef.current.addTrack(track);
      if (localVideoRef.current && !screenShare.screenOn) {
        localVideoRef.current.srcObject = new MediaStream([track]);
        await localVideoRef.current.play().catch(() => {});
      }
      peersRef.current.forEach((pc) => {
        pc.addTrack(track, localStreamRef.current!);
      });
      setCameraOn(true);
      await renegotiate();
    } catch (e: any) { setError(e.message); }
  };

  const toggleDenoiseUI = () => toggleDenoiseHook(joined, setError);

  if (joined && sessionChannel && sessionChannel !== channelId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Volume2 className="w-16 h-16 text-[#23A559] animate-pulse" />
        <div>
          <h2 className="text-xl font-bold">Você está em outra chamada</h2>
          <p className="text-zinc-400 mt-2 max-w-md">Sua voz continua ativa. Para entrar em #{channelName || "este canal"}, saia da atual primeiro.</p>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>
        <button onClick={() => join(false)} className="bg-accent hover:bg-accent-hover text-white px-8 py-3 rounded-full font-bold">
          Sair e entrar aqui
        </button>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
        <Volume2 className="w-20 h-20 text-zinc-400" />
        <div>
          <h2 className="text-2xl font-bold">Canal de voz</h2>
          <p className="text-zinc-400 mt-2 max-w-md">Converse por voz com seus amigos. Áudio P2P via WebRTC com sinalização pelo Supabase Realtime.</p>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>
        <button onClick={() => join(false)} className="bg-[#23A559] hover:bg-[#1A7F44] text-white px-8 py-3 rounded-full font-bold flex items-center gap-2">
          <PhoneOff className="w-5 h-5 rotate-[-135deg]" /> Entrar na voz
        </button>
        <button onClick={() => join(true)} className="bg-accent hover:bg-accent-hover text-white px-6 py-2 rounded-full text-sm">Entrar como ouvinte</button>
        <button onClick={testMic} className="bg-surface-hover hover:bg-surface-active text-white px-6 py-2 rounded-full text-sm">Testar microfone</button>
        <p className="text-xs text-zinc-400">Seu navegador vai pedir permissao do microfone - Abra F12 para ver logs</p>
        {!hasTurnConfigured() && <p className="text-[11px] text-amber-400/80 max-w-md">Modo STUN: voz direta funciona na maioria das redes. Atrás de NAT restrito pode falhar — TURN será ativado pelo admin em breve.</p>}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-bold flex items-center gap-2"><Volume2 className="w-5 h-5" /> Conectado — {peers.length + 1} no canal</h2>
        <div className="flex items-center gap-2">
          {screenShare.screenOn && (
            <div className="flex items-center gap-1 bg-[#232428] rounded-full p-1 flex-wrap justify-end" title="Qualidade da transmissão de tela (aplica ao vivo)">
              {SCREEN_QUALITIES.map((q) => (
                <button
                  key={q}
                  onClick={() => screenShare.changeScreenQuality(q)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${screenShare.screenQuality === q ? "bg-accent text-white" : "text-zinc-400 hover:text-white"}`}
                >
                  {qualityLabel(q)}
                </button>
              ))}
              <span className="w-px h-4 bg-[#3F4147] mx-1" />
              <button
                onClick={() => screenShare.changeCodecMode(screenShare.codecMode === "sharp" ? "smooth" : "sharp")}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${screenShare.codecMode === "smooth" ? "bg-[#23A559] text-white" : "bg-surface text-zinc-400 hover:text-white"}`}
                title={screenShare.codecMode === "sharp" ? "VP9 nítido (CPU). Clique p/ H264 fluido (GPU)." : "H264 fluido via hardware. Clique p/ VP9 nítido."}
              >
                {screenShare.codecMode === "sharp" ? "Nítido" : "Fluido"}
              </button>
            </div>
          )}
          <button onClick={leave} className="bg-[#DA373C] hover:bg-[#A12828] text-white px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2"><PhoneOff className="w-4 h-4" /> Sair</button>
        </div>
      </div>

      {expanded && (() => {
        const isLocal = expanded === "local";
        const remote = !isLocal ? remoteStreams[expanded] : null;
        const hasRemoteVideo = !!remote && remote.getVideoTracks().some((t) => t.readyState === "live") && !hiddenVideo[expanded];
        const showVideo = isLocal ? (cameraOn || screenShare.screenOn) : hasRemoteVideo;
        const peer = !isLocal ? peers.find((p) => p.id === expanded) : null;
        return (
          <div ref={expandedRef} className="w-full h-[48vh] min-h-[300px] bg-black rounded-lg overflow-hidden relative group shrink-0">
            {showVideo ? (
              <video ref={expandedVideoRef} autoPlay playsInline muted={isLocal} className="w-full h-full object-contain bg-black" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface">
                <Avatar src={isLocal ? avatar : peer?.avatar} name={isLocal ? username : peer?.username} className="w-24 h-24 rounded-full text-4xl" />
              </div>
            )}
            <span className="absolute bottom-3 left-3 bg-black/60 text-white text-sm px-2 py-1 rounded">{isLocal ? `${username} (você)` : peer?.username || "Usuário"}</span>
            <button onClick={() => setExpanded(null)} className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full" title="Fechar ampliado"><X className="w-4 h-4" /></button>
            <div className="absolute top-3 left-3 flex gap-2">
              {!isLocal && hasRemoteVideo && (
                <button onClick={() => toggleHideVideo(expanded)} className="bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-full text-xs font-semibold" title="Parar de visualizar (áudio continua)">Parar de ver</button>
              )}
            </div>
            <button onClick={toggleFullscreen} className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full"><Maximize2 className="w-4 h-4" /></button>
          </div>
        );
      })()}

      {(() => {
        const count = peers.length + 1;
        const gridClass = count <= 1 ? "grid-cols-1" : count <= 2 ? "grid-cols-1 md:grid-cols-2" : count <= 4 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3";
        return <div className={`grid ${gridClass} gap-3`}>
        <div onClick={() => setExpanded("local")} className={`bg-[#232428] rounded-lg p-3 flex flex-col items-center gap-2 border-2 cursor-pointer hover:brightness-110 ${speaking["local"] && !muted ? "border-[#23A559] shadow-lg shadow-[#23A559]/30" : "border-[#23A559]/30"} ${expanded === "local" ? "ring-2 ring-accent" : ""}`}>
          <div className="w-full aspect-video bg-black rounded overflow-hidden relative group">
            {screenShare.screenOn ? (
              <>
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {cameraOn && <video ref={(el) => {
                  if (el) {
                    const camTrack = localStreamRef.current?.getVideoTracks().find(t => t !== screenShare.screenTrackRef.current);
                    if (camTrack && (!el.srcObject || (el.srcObject as MediaStream).getVideoTracks()[0] !== camTrack)) {
                      el.srcObject = new MediaStream([camTrack]);
                      el.play().catch(() => {});
                    }
                  }
                }} autoPlay playsInline muted className="absolute bottom-2 right-2 w-1/4 aspect-video rounded border border-white/20 object-cover bg-black" />}
              </>
            ) : cameraOn ? (
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${speaking["local"] && !muted ? "ring-4 ring-[#23A559] animate-pulse" : ""} bg-accent`}>
                <Avatar src={avatar} name={username} className="w-16 h-16 rounded-full text-3xl" />
              </div>
            )}
            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">{username} (você) {screenShare.screenOn && cameraOn ? "• Tela + Câmera" : screenShare.screenOn ? "• Tela" : cameraOn ? "• Câmera" : ""}</span>
            <Maximize2 className="absolute top-1 right-1 w-3 h-3 text-white opacity-0 group-hover:opacity-100" />
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${muted ? "bg-[#DA373C]" : speaking["local"] ? "bg-[#23A559] animate-pulse" : "bg-zinc-600"} text-white`}>{muted ? "Mutado" : speaking["local"] ? "Falando..." : "Conectado"}</span>
        </div>
        {peers.map((p) => {
          const stream = remoteStreams[p.id];
          const hasVideo = !!stream && stream.getVideoTracks().some((t) => t.readyState === "live" && t.enabled) && !hiddenVideo[p.id];
          return (
            <div key={p.id} onClick={() => setExpanded(p.id)} className={`bg-surface rounded-lg p-3 flex flex-col items-center gap-2 border-2 cursor-pointer hover:brightness-110 ${speaking[p.id] ? "border-[#23A559] shadow-lg shadow-[#23A559]/30" : "border-transparent"} ${expanded === p.id ? "ring-2 ring-accent" : ""}`}>
              <div className="w-full aspect-video bg-black rounded overflow-hidden relative group">
                {hasVideo ? (
                  <video
                    ref={(el) => {
                      if (el && stream) {
                        if (el.srcObject !== stream) el.srcObject = stream;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${speaking[p.id] ? "ring-4 ring-[#23A559] animate-pulse" : ""} bg-[#41434A]`}><Avatar src={p.avatar} name={p.username} className="w-16 h-16 rounded-full text-3xl" /></div>
                )}
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">{p.username}</span>
                {peerQuality[p.id] && (
                  <span className="absolute top-1 left-1 bg-black/60 text-zinc-300 text-[10px] px-1 py-0.5 rounded font-mono" title={`Recebendo: ${peerQuality[p.id].fps}fps, ${peerQuality[p.id].bytes}Mbps`}>
                    {peerQuality[p.id].fps > 0 ? `${peerQuality[p.id].fps}fps` : "audio"}
                    {peerQuality[p.id].limitation && ` • ${peerQuality[p.id].limitation}`}
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleHideVideo(p.id); }}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100"
                  title={hiddenVideo[p.id] ? "Voltar a visualizar" : "Parar de visualizar (áudio continua)"}
                >
                  {hiddenVideo[p.id] ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${speaking[p.id] ? "bg-[#23A559] animate-pulse text-white" : "bg-zinc-700 text-zinc-400"}`}>{speaking[p.id] ? "Falando..." : hiddenVideo[p.id] ? "Somente áudio" : "Conectado"}</span>
            </div>
          );
        })}
        {peers.length === 0 && <div className="col-span-full text-zinc-400 text-sm flex items-center justify-center py-8">Nenhum amigo na voz ainda. Compartilhe o link!</div>}
      </div>;
      })()}

      <div className="mt-auto flex items-center justify-center gap-2 p-3 bg-[#232428] rounded-lg flex-wrap">
        <button onClick={toggleMute} className={`w-11 h-11 rounded-full flex items-center justify-center ${muted ? "bg-[#DA373C] text-white" : "bg-surface hover:bg-surface-hover text-zinc-200"}`} title={muted ? "Ativar microfone" : "Mutar"}>
          {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <button onClick={toggleCamera} className={`w-11 h-11 rounded-full flex items-center justify-center ${cameraOn ? "bg-[#23A559] text-white" : "bg-surface hover:bg-surface-hover text-zinc-200"}`} title={cameraOn ? "Desligar câmera" : "Ligar câmera"}>
          {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        <button onClick={() => screenShare.toggleScreen(cameraOn)} className={`w-11 h-11 rounded-full flex items-center justify-center ${screenShare.screenOn ? "bg-[#23A559] text-white" : "bg-surface hover:bg-surface-hover text-zinc-200"}`} title={screenShare.screenOn ? "Parar tela" : "Compartilhar tela"}>
          {screenShare.screenOn ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </button>
        <button onClick={toggleDeafen} className={`w-11 h-11 rounded-full flex items-center justify-center ${deafened ? "bg-[#DA373C] text-white" : "bg-surface hover:bg-surface-hover text-zinc-200"}`} title="Surdo">
          <Headphones className="w-5 h-5" />
        </button>
        <button onClick={toggleDenoiseUI} className={`w-11 h-11 rounded-full flex items-center justify-center ${denoiseActive ? "bg-[#23A559] text-white" : "bg-surface hover:bg-surface-hover text-zinc-200"}`} title={denoiseActive ? "Supressão de ruído RNNoise ATIVADA (clique p/ desligar)" : "Supressão de ruído desligada (clique p/ ativar RNNoise)"}>
          <Waves className="w-5 h-5" />
        </button>
        <button onClick={leave} className="w-11 h-11 rounded-full bg-[#DA373C] hover:bg-[#A12828] text-white flex items-center justify-center"><PhoneOff className="w-5 h-5" /></button>
      </div>
      <p className="text-xs text-zinc-400 text-center">Dica: mutar/desmutar rápido. P2P mesh — funciona melhor com até 4 pessoas sem servidor TURN.{denoiseActive ? " RNNoise ligado: fundo suprimido por IA local." : ""}</p>
      {screenShare.showScreenPicker && (
        <ScreenPickerModal
          sources={screenShare.screenSources}
          onPick={(id) => screenShare.pickAndShare(id, cameraOn)}
          onClose={() => screenShare.setShowScreenPicker(false)}
        />
      )}
    </div>
  );
}
