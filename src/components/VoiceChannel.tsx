"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Mic, MicOff, PhoneOff, Headphones, Volume2, Video, VideoOff, Monitor, MonitorOff, Maximize2, X, Waves } from "lucide-react";
import { useVoice } from "@/context/VoiceContext";
import { buildIceServers, hasTurnConfigured } from "@/lib/ice";

type Props = {
  channelId: string;
  username: string;
  status?: string;
};

type Peer = {
  id: string;
  username: string;
  muted?: boolean;
};

export default function VoiceChannel({ channelId, username, status }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { setParticipants } = useVoice();
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [error, setError] = useState("");
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});
  const [cameraOn, setCameraOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  // Supressão de ruído RNNoise (ML local). Ligada por padrão; cai p/ navegador se falhar.
  const [denoise, setDenoise] = useState(true);
  const [denoiseActive, setDenoiseActive] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const prevSpeakingRef = useRef<Record<string, boolean>>({});

  const localStreamRef = useRef<MediaStream | null>(null);
  // Mic cru (sempre guardado p/ poder ligar/desligar o denoise ao vivo)
  const rawStreamRef = useRef<MediaStream | null>(null);
  const denoiseRef = useRef<{ stop: () => void } | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const channelRef = useRef<any>(null);
  const leaveRef = useRef<() => void>(() => {});
  // ID estável por montagem: gerado uma vez (sem regenerar ao trocar username — evita peers fantasmas).
  // O nome de exibição vem do payload de presença, não do prefixo do ID.
  const myIdRef = useRef<string>("");

  useEffect(() => {
    if (!myIdRef.current) myIdRef.current = `${username}-${Math.random().toString(36).slice(2, 7)}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Último a sair encerra a chamada (zera o timer). Best-effort: sem await.
  const maybeEndCall = () => {
    supabase
      .from("voice_sessions")
      .select("user_id", { count: "exact", head: true })
      .eq("channel_id", channelId)
      .then(({ count }) => {
        if (!count) supabase.from("voice_calls").delete().eq("channel_id", channelId).then(() => {});
      });
  };

  const cleanup = () => {
    if (denoiseRef.current) { try { denoiseRef.current.stop(); } catch {} denoiseRef.current = null; }
    setDenoiseActive(false);
    if (rawStreamRef.current) {
      rawStreamRef.current.getTracks().forEach((t) => t.stop());
      rawStreamRef.current = null;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("voice_sessions").delete().eq("channel_id", channelId).eq("user_id", user.id).then(() => {
          maybeEndCall();
        });
      }
    });
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    remoteAudiosRef.current.forEach((a) => a.remove());
    remoteAudiosRef.current.clear();
    remoteVideosRef.current.forEach((v) => v.remove());
    remoteVideosRef.current.clear();
    analysersRef.current.clear();
    if (audioContextRef.current) { try { audioContextRef.current.close(); } catch {} audioContextRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setSpeaking({});
    setRemoteStreams({});
    setParticipants(channelId, []);
  };

  const setupAnalyser = (id: string, stream: MediaStream) => {
    try {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analysersRef.current.set(id, analyser);
    } catch {}
  };

  useEffect(() => {
    return () => cleanup();
  }, [channelId]);

  // Só desconecta se ficar sem internet ou fechar o app, NÃO quando ficar invisível
  // (efeito posicionado após `leave` — usa a função já declarada)
  useEffect(() => {
    const handleOffline = () => {
      if (joined) {
        leaveRef.current();
        setError("Desconectado da voz porque ficou sem internet");
      }
    };
    const handleBeforeUnload = () => {
      if (joined) supabase.from("voice_sessions").delete().eq("channel_id", channelId).then(() => {});
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [joined, channelId, supabase]);

  const createPeer = (peerId: string, isInitiator: boolean) => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)!;
    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
    peersRef.current.set(peerId, pc);

    // add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
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
          audio.autoplay = true;
          (audio as any).playsInline = true;
          document.body.appendChild(audio);
          remoteAudiosRef.current.set(peerId, audio);
        }
        audio.srcObject = e.streams[0];
        audio.muted = deafened;
        setupAnalyser(peerId, e.streams[0]);
      }
      if (e.track.kind === "video") {
        setRemoteStreams((prev) => ({ ...prev, [peerId]: e.streams[0] }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        // Diagnóstico (F12): host = direto, srflx = via STUN, relay = via TURN
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
        // 1ª falha: tenta ICE restart (troca de rede, NAT). Só remove o peer se falhar de novo.
        const retries = Number((pc as any).__iceRestarts || 0);
        if (retries < 1) {
          (pc as any).__iceRestarts = retries + 1;
          pc.restartIce();
          if (peersRef.current.has(peerId)) {
            pc.createOffer({ iceRestart: true }).then((offer) => {
              pc.setLocalDescription(offer);
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
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        channelRef.current?.send({ type: "broadcast", event: "offer", payload: { from: myIdRef.current, to: peerId, sdp: offer } });
      });
    }
    return pc;
  };

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

  // Troca a trilha de áudio enviada sem renegociar (usado pelo toggle de denoise)
  const swapAudioTrack = async (track: MediaStreamTrack | null) => {
    if (!track) return;
    track.enabled = !muted;
    for (const pc of peersRef.current.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
      if (sender) {
        try { await sender.replaceTrack(track); } catch {}
      }
    }
  };

  const toggleDenoise = async () => {
    if (!joined || !rawStreamRef.current) {
      setError("Entre na voz com microfone para usar a supressão de ruído.");
      return;
    }
    // Decisão pelo grafo real (denoiseRef), não por estado visual — nunca trava
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
  };

  const join = async (asListener = false) => {
    if (joined || channelRef.current) return;
    if (!myIdRef.current) myIdRef.current = `${username}-${Math.random().toString(36).slice(2, 7)}`;
    setError("");
    let stream: MediaStream | null = null;
    try {
      if (!asListener) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Navegador sem suporte a microfone. Use Chrome/Edge/Firefox em HTTPS.");
        try {
          // Com RNNoise ativo, desliga o supressor do navegador (duplo = áudio ruim)
          stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: !denoise, autoGainControl: true }, video: false });
        } catch (e: any) {
          if (e.name === "NotFoundError") {
            setError("Sem microfone, entrando como ouvinte. Voce ouve mas nao fala. Plugue um mic para falar.");
            // entra como ouvinte sem stream
          } else throw e;
        }
      }
      localStreamRef.current = stream;
      rawStreamRef.current = stream;
      // RNNoise: troca o mic cru pelo tratado antes de negociar com os peers
      if (stream && denoise) {
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
      if (localStreamRef.current) setupAnalyser("local", localStreamRef.current);
      if (channelRef.current) { try { supabase.removeChannel(channelRef.current); } catch {} channelRef.current = null; }
      const ch = supabase.channel(`voice:${channelId}`, { config: { presence: { key: myIdRef.current }, broadcast: { self: false } } });
      channelRef.current = ch;

      ch.on("broadcast", { event: "offer" }, async ({ payload }: any) => {
        if (payload.to !== myIdRef.current) return;
        const pc = createPeer(payload.from, false);
        // Negociação educada: id menor cede (rollback) em caso de oferta simultânea (glare)
        const polite = myIdRef.current < payload.from;
        try {
          if (pc.signalingState !== "stable") {
            if (!polite) return;
            await pc.setLocalDescription({ type: "rollback" });
          }
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ch.send({ type: "broadcast", event: "answer", payload: { from: myIdRef.current, to: payload.from, sdp: answer } });
        } catch (e) {
          console.warn(`[voz] oferta de ${payload.from} ignorada (glare resolvido pelo outro lado)`);
        }
      });

      ch.on("broadcast", { event: "answer" }, async ({ payload }: any) => {
        if (payload.to !== myIdRef.current) return;
        const pc = peersRef.current.get(payload.from);
        if (!pc) return;
        // Resposta tardia/duplicada fora de hora: ignora em vez de estourar
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
        } catch {
          // Candidato chegou antes da descrição remota; o ICE restart cobre a recuperação
        }
      });

      ch.on("presence", { event: "sync" }, () => {
        const state: any = ch.presenceState();
        // Nome de exibição vem do payload de presença (não do prefixo do ID — o ID é estável)
        const seen = new Map<string, string>();
        Object.values(state).forEach((arr: any) =>
          (arr as any[]).forEach((p: any) => {
            const pid = p.id || p.user_id;
            if (pid && !seen.has(pid)) seen.set(pid, p.username || pid.split("-")[0]);
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
            remoteAudiosRef.current.get(id)?.remove();
            remoteAudiosRef.current.delete(id);
            remoteVideosRef.current.get(id)?.remove();
            remoteVideosRef.current.delete(id);
            setRemoteStreams((prev) => {
              const n = { ...prev };
              delete n[id];
              return n;
            });
          }
        });
        const peerList = ids.map((id) => ({ id, username: seen.get(id) || id.split("-")[0] }));
        setPeers(peerList.filter((p) => p.id !== myIdRef.current));
        setParticipants(channelId, peerList);
      });

      ch.subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ id: myIdRef.current, username });
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Remove sessão fantasma anterior
            await supabase.from("voice_sessions").delete().eq("channel_id", channelId).eq("user_id", user.id);
            // Primeiro a entrar abre a chamada (início do timer); quem chega depois não mexe
            const { count } = await supabase.from("voice_sessions").select("user_id", { count: "exact", head: true }).eq("channel_id", channelId);
            if (!count) {
              await supabase.from("voice_calls").upsert({ channel_id: channelId, started_at: new Date().toISOString() }, { onConflict: "channel_id" });
            }
            await supabase.from("voice_sessions").upsert({ channel_id: channelId, user_id: user.id, username, joined_at: new Date().toISOString() }, { onConflict: "channel_id,user_id" });
          }
          setJoined(true);
          // loop de detecção de voz com histerese para não piscar
          const checkSpeaking = () => {
            const next: Record<string, boolean> = {};
            analysersRef.current.forEach((analyser, id) => {
              const data = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(data);
              const avg = data.reduce((a, b) => a + b, 0) / data.length;
              const wasSpeaking = prevSpeakingRef.current[id] || false;
              // histerese: 14 para começar a falar, 8 para parar
              next[id] = wasSpeaking ? avg > 8 : avg > 14;
            });
            const changed = Object.keys(next).some((k) => next[k] !== prevSpeakingRef.current[k]) || Object.keys(prevSpeakingRef.current).some((k) => !(k in next));
            if (changed) {
              prevSpeakingRef.current = next;
              setSpeaking(next);
            }
            if (channelRef.current) setTimeout(() => requestAnimationFrame(checkSpeaking), 80);
          };
          requestAnimationFrame(checkSpeaking);
        }
      });
    } catch (e: any) {
      if (e.name === "NotFoundError" || e.message?.includes("Requested device")) {
        setError("Microfone não encontrado. Verifique: 1) Windows > Configurações > Privacidade > Microfone > Permitir 2) Chrome > cadeado na barra de endereço > Microfone > Permitir 3) Nenhum outro app usando o mic. Tente no celular!");
      } else if (e.name === "NotAllowedError") {
        setError("Permissão negada. Clique no cadeado 🔒 ao lado da URL > Microfone > Permitir e recarregue.");
      } else {
        setError(e.message || "Erro ao acessar microfone");
      }
    }
  };

  const leave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("voice_sessions").delete().eq("channel_id", channelId).eq("user_id", user.id);
      maybeEndCall();
    }
    cleanup();
    setJoined(false);
    setPeers([]);
    setExpanded(null);
  };

  // Mantém a ref sempre apontando para o `leave` mais recente (usada pelo listener offline)
  useEffect(() => { leaveRef.current = leave; });

  const toggleFullscreen = () => {
    if (!expandedRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else expandedRef.current.requestFullscreen().catch(() => {});
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const enabled = !muted;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !enabled));
    setMuted(enabled);
    // notificar via presence update
    if (channelRef.current) channelRef.current.track({ id: myIdRef.current, username, muted: enabled });
  };

  const toggleDeafen = () => {
    const v = !deafened;
    setDeafened(v);
    remoteAudiosRef.current.forEach((a) => (a.muted = v));
    if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = v ? false : !muted));
    if (v && !muted) setMuted(true);
  };

  const renegotiate = async () => {
    for (const [peerId, pc] of peersRef.current) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      channelRef.current?.send({ type: "broadcast", event: "offer", payload: { from: myIdRef.current, to: peerId, sdp: offer } });
    }
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      localStreamRef.current?.getVideoTracks().forEach((t) => { t.stop(); try { localStreamRef.current?.removeTrack(t); } catch {} });
      peersRef.current.forEach((pc) => {
        pc.getSenders().filter((s) => s.track?.kind === "video").forEach((s) => { try { pc.removeTrack(s); } catch {} });
      });
      if (localVideoRef.current) { localVideoRef.current.srcObject = null; localVideoRef.current.pause(); }
      setCameraOn(false);
      await renegotiate();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 }, audio: false });
      const track = stream.getVideoTracks()[0];
      if (!localStreamRef.current) localStreamRef.current = new MediaStream();
      localStreamRef.current.addTrack(track);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = new MediaStream([track]);
        await localVideoRef.current.play().catch(() => {});
      }
      peersRef.current.forEach((pc) => pc.addTrack(track, localStreamRef.current!));
      setCameraOn(true);
      if (screenOn) setScreenOn(false);
      await renegotiate();
    } catch (e: any) { setError(e.message); }
  };

  const toggleScreen = async () => {
    if (screenOn) {
      localStreamRef.current?.getVideoTracks().forEach((t) => { t.stop(); try { localStreamRef.current?.removeTrack(t); } catch {} });
      peersRef.current.forEach((pc) => {
        pc.getSenders().filter((s) => s.track?.kind === "video").forEach((s) => { try { pc.removeTrack(s); } catch {} });
      });
      if (localVideoRef.current) { localVideoRef.current.srcObject = null; localVideoRef.current.pause(); }
      setScreenOn(false);
      await renegotiate();
      return;
    }
    try {
      const stream: any = await (navigator.mediaDevices as any).getDisplayMedia({ video: { displaySurface: "monitor" } as any, audio: true });
      const track = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      if (!localStreamRef.current) localStreamRef.current = new MediaStream();
      // remove câmera
      localStreamRef.current.getVideoTracks().forEach((t) => { t.stop(); try { localStreamRef.current?.removeTrack(t); } catch {} });
      localStreamRef.current.addTrack(track);
      if (audioTrack) { try { localStreamRef.current.addTrack(audioTrack); } catch {} }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = new MediaStream([track]);
        await localVideoRef.current.play().catch(() => {});
      }
      peersRef.current.forEach((pc) => pc.addTrack(track, localStreamRef.current!));
      if (audioTrack) peersRef.current.forEach((pc) => { try { pc.addTrack(audioTrack, localStreamRef.current!); } catch {} });
      track.onended = () => toggleScreen();
      setScreenOn(true);
      setCameraOn(false);
      await renegotiate();
    } catch (e: any) { if (e.name !== "NotAllowedError") setError(e.message); }
  };

  if (!joined) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
        <Volume2 className="w-20 h-20 text-zinc-500" />
        <div>
          <h2 className="text-2xl font-bold">Canal de voz</h2>
          <p className="text-zinc-400 mt-2 max-w-md">Converse por voz com seus amigos. Áudio P2P via WebRTC com sinalização pelo Supabase Realtime.</p>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>
        <button onClick={() => join(false)} className="bg-[#23A559] hover:bg-[#1A7F44] text-white px-8 py-3 rounded-full font-bold flex items-center gap-2">
          <PhoneOff className="w-5 h-5 rotate-[-135deg]" /> Entrar na voz
        </button>
        <button onClick={() => join(true)} className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-2 rounded-full text-sm">Entrar como ouvinte</button>
        <button onClick={testMic} className="bg-[#35373C] hover:bg-[#404249] text-white px-6 py-2 rounded-full text-sm">Testar microfone</button>
        <p className="text-xs text-zinc-500">Seu navegador vai pedir permissao do microfone - Abra F12 para ver logs</p>
        {!hasTurnConfigured() && <p className="text-[11px] text-amber-400/80 max-w-md">Modo STUN: voz direta funciona na maioria das redes. Atrás de NAT restrito pode falhar — TURN será ativado pelo admin em breve.</p>}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-2"><Volume2 className="w-5 h-5" /> Conectado — {peers.length + 1} no canal</h2>
        <button onClick={leave} className="bg-[#DA373C] hover:bg-[#A12828] text-white px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2"><PhoneOff className="w-4 h-4" /> Sair</button>
      </div>

      {expanded && (
        <div ref={expandedRef} className="w-full bg-black rounded-lg overflow-hidden relative aspect-video group">
          {expanded === "local" ? (
            cameraOn || screenOn ? (
              <video ref={(el) => { if (el && localVideoRef.current?.srcObject) el.srcObject = localVideoRef.current.srcObject as MediaStream; }} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl bg-[#5865F2]">😎</div>
            )
          ) : (
            (() => {
              const s = remoteStreams[expanded];
              const hasV = !!s && s.getVideoTracks().some((t) => t.readyState === "live");
              return hasV ? (
                <video ref={(el) => { if (el && s) { if (el.srcObject !== s) el.srcObject = s; el.play().catch(() => {}); } }} autoPlay playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl bg-[#41434A]">🧑</div>
              );
            })()
          )}
          <span className="absolute bottom-3 left-3 bg-black/60 text-white text-sm px-2 py-1 rounded">{expanded === "local" ? `${username} (você)` : peers.find((p) => p.id === expanded)?.username || "Usuário"}</span>
          <button onClick={() => setExpanded(null)} className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full"><X className="w-4 h-4" /></button>
          <button onClick={toggleFullscreen} className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full"><Maximize2 className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div onClick={() => setExpanded("local")} className={`bg-[#232428] rounded-lg p-3 flex flex-col items-center gap-2 border-2 cursor-pointer hover:brightness-110 ${speaking["local"] && !muted ? "border-[#23A559] shadow-lg shadow-[#23A559]/30" : "border-[#23A559]/30"} ${expanded === "local" ? "ring-2 ring-[#5865F2]" : ""}`}>
          <div className="w-full aspect-video bg-black rounded overflow-hidden relative group">
            {cameraOn || screenOn ? <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" /> : <div className={`w-full h-full flex items-center justify-center text-3xl ${speaking["local"] && !muted ? "ring-4 ring-[#23A559] animate-pulse" : ""} bg-[#5865F2]`}>😎</div>}
            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">{username} (você) {screenOn ? "• Tela" : cameraOn ? "• Câmera" : ""}</span>
            <Maximize2 className="absolute top-1 right-1 w-3 h-3 text-white opacity-0 group-hover:opacity-100" />
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${muted ? "bg-[#DA373C]" : speaking["local"] ? "bg-[#23A559] animate-pulse" : "bg-zinc-600"} text-white`}>{muted ? "Mutado" : speaking["local"] ? "Falando..." : "Conectado"}</span>
        </div>
        {peers.map((p) => {
          const stream = remoteStreams[p.id];
          const hasVideo = !!stream && stream.getVideoTracks().some((t) => t.readyState === "live" && t.enabled);
          return (
            <div key={p.id} onClick={() => setExpanded(p.id)} className={`bg-[#2B2D31] rounded-lg p-3 flex flex-col items-center gap-2 border-2 cursor-pointer hover:brightness-110 ${speaking[p.id] ? "border-[#23A559] shadow-lg shadow-[#23A559]/30" : "border-transparent"} ${expanded === p.id ? "ring-2 ring-[#5865F2]" : ""}`}>
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
                  <div className={`w-full h-full flex items-center justify-center text-3xl ${speaking[p.id] ? "ring-4 ring-[#23A559] animate-pulse" : ""} bg-[#41434A]`}>🧑</div>
                )}
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">{p.username}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${speaking[p.id] ? "bg-[#23A559] animate-pulse text-white" : "bg-zinc-700 text-zinc-400"}`}>{speaking[p.id] ? "Falando..." : "Conectado"}</span>
            </div>
          );
        })}
        {peers.length === 0 && <div className="col-span-1 md:col-span-2 text-zinc-400 text-sm flex items-center justify-center py-8">Nenhum amigo na voz ainda. Compartilhe o link!</div>}
      </div>

      <div className="mt-auto flex items-center justify-center gap-2 p-3 bg-[#232428] rounded-lg flex-wrap">
        <button onClick={toggleMute} className={`w-11 h-11 rounded-full flex items-center justify-center ${muted ? "bg-[#DA373C] text-white" : "bg-[#2B2D31] hover:bg-[#35373C] text-zinc-200"}`} title={muted ? "Ativar microfone" : "Mutar"}>
          {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <button onClick={toggleCamera} className={`w-11 h-11 rounded-full flex items-center justify-center ${cameraOn ? "bg-[#23A559] text-white" : "bg-[#2B2D31] hover:bg-[#35373C] text-zinc-200"}`} title={cameraOn ? "Desligar câmera" : "Ligar câmera"}>
          {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        <button onClick={toggleScreen} className={`w-11 h-11 rounded-full flex items-center justify-center ${screenOn ? "bg-[#23A559] text-white" : "bg-[#2B2D31] hover:bg-[#35373C] text-zinc-200"}`} title={screenOn ? "Parar tela" : "Compartilhar tela"}>
          {screenOn ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </button>
        <button onClick={toggleDeafen} className={`w-11 h-11 rounded-full flex items-center justify-center ${deafened ? "bg-[#DA373C] text-white" : "bg-[#2B2D31] hover:bg-[#35373C] text-zinc-200"}`} title="Surdo">
          <Headphones className="w-5 h-5" />
        </button>
        <button onClick={toggleDenoise} className={`w-11 h-11 rounded-full flex items-center justify-center ${denoiseActive ? "bg-[#23A559] text-white" : "bg-[#2B2D31] hover:bg-[#35373C] text-zinc-200"}`} title={denoiseActive ? "Supressão de ruído RNNoise ATIVADA (clique p/ desligar)" : "Supressão de ruído desligada (clique p/ ativar RNNoise)"}>
          <Waves className="w-5 h-5" />
        </button>
        <button onClick={leave} className="w-11 h-11 rounded-full bg-[#DA373C] hover:bg-[#A12828] text-white flex items-center justify-center"><PhoneOff className="w-5 h-5" /></button>
      </div>
      <p className="text-xs text-zinc-500 text-center">Dica: mutar/desmutar rápido. P2P mesh — funciona melhor com até 4 pessoas sem servidor TURN.{denoiseActive ? " RNNoise ligado: fundo suprimido por IA local." : ""}</p>
    </div>
  );
}
