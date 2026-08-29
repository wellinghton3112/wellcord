"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Mic, MicOff, PhoneOff, Headphones, Volume2, Video, VideoOff, Monitor, MonitorOff } from "lucide-react";
import { useVoice } from "@/context/VoiceContext";

type Props = {
  channelId: string;
  username: string;
};

type Peer = {
  id: string;
  username: string;
  muted?: boolean;
};

export default function VoiceChannel({ channelId, username }: Props) {
  const supabase = createClient();
  const { setParticipants } = useVoice();
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [error, setError] = useState("");
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});
  const [cameraOn, setCameraOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analysersRef = useRef<Map<string, AnalyserNode>>(new Map());

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const channelRef = useRef<any>(null);
  const myIdRef = useRef<string>(`${username}-${Math.random().toString(36).slice(2, 7)}`);

  useEffect(() => {
    myIdRef.current = `${username}-${Math.random().toString(36).slice(2, 7)}`;
  }, [username]);

  const cleanup = () => {
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
    setCameraOn(false);
    setScreenOn(false);
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

  const createPeer = (peerId: string, isInitiator: boolean) => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)!;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
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
        let video = remoteVideosRef.current.get(peerId);
        if (!video) {
          video = document.createElement("video");
          video.autoplay = true;
          (video as any).playsInline = true;
          video.muted = true;
          video.className = "hidden";
          document.body.appendChild(video);
          remoteVideosRef.current.set(peerId, video);
        }
        video.srcObject = e.streams[0];
        // força re-render para mostrar vídeo
        setPeers((prev) => [...prev]);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        pc.close();
        peersRef.current.delete(peerId);
        remoteAudiosRef.current.get(peerId)?.remove();
        remoteAudiosRef.current.delete(peerId);
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

  const join = async (asListener = false) => {
    setError("");
    console.log("join clicked, secureContext:", window.isSecureContext, "mediaDevices:", !!navigator.mediaDevices, "asListener:", asListener);
    let stream: MediaStream | null = null;
    try {
      if (!asListener) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Navegador sem suporte a microfone. Use Chrome/Edge/Firefox em HTTPS.");
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
        } catch (e: any) {
          if (e.name === "NotFoundError") {
            setError("Sem microfone, entrando como ouvinte. Voce ouve mas nao fala. Plugue um mic para falar.");
            // entra como ouvinte sem stream
          } else throw e;
        }
      }
      localStreamRef.current = stream;
      if (stream) setupAnalyser("local", stream);
      const ch = supabase.channel(`voice:${channelId}`, { config: { presence: { key: myIdRef.current }, broadcast: { self: false } } });
      channelRef.current = ch;

      ch.on("broadcast", { event: "offer" }, async ({ payload }: any) => {
        if (payload.to !== myIdRef.current) return;
        const pc = createPeer(payload.from, false);
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ch.send({ type: "broadcast", event: "answer", payload: { from: myIdRef.current, to: payload.from, sdp: answer } });
      });

      ch.on("broadcast", { event: "answer" }, async ({ payload }: any) => {
        if (payload.to !== myIdRef.current) return;
        const pc = peersRef.current.get(payload.from);
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      });

      ch.on("broadcast", { event: "ice" }, async ({ payload }: any) => {
        if (payload.to !== myIdRef.current) return;
        const pc = peersRef.current.get(payload.from);
        if (pc && payload.candidate) await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      });

      ch.on("presence", { event: "sync" }, () => {
        const state: any = ch.presenceState();
        const ids: string[] = [];
        Object.values(state).forEach((arr: any) => (arr as any[]).forEach((p: any) => ids.push(p.id || p.user_id || p.presence?.id)));
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
          }
        });
        const peerList = ids.map((id) => ({ id, username: id.split("-")[0] }));
        setPeers(peerList.filter((p) => p.id !== myIdRef.current));
        setParticipants(channelId, peerList);
      });

      ch.subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ id: myIdRef.current, username });
          setJoined(true);
          // loop de detecção de voz
          const checkSpeaking = () => {
            const next: Record<string, boolean> = {};
            analysersRef.current.forEach((analyser, id) => {
              const data = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(data);
              const avg = data.reduce((a, b) => a + b, 0) / data.length;
              next[id] = avg > 12;
            });
            setSpeaking(next);
            if (channelRef.current) requestAnimationFrame(checkSpeaking);
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

  const leave = () => {
    cleanup();
    setJoined(false);
    setPeers([]);
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
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-2"><Volume2 className="w-5 h-5" /> Conectado — {peers.length + 1} no canal</h2>
        <button onClick={leave} className="bg-[#DA373C] hover:bg-[#A12828] text-white px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2"><PhoneOff className="w-4 h-4" /> Sair</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className={`bg-[#232428] rounded-lg p-3 flex flex-col items-center gap-2 border-2 ${speaking["local"] && !muted ? "border-[#23A559] shadow-lg shadow-[#23A559]/30" : "border-[#23A559]/30"}`}>
          <div className="w-full aspect-video bg-black rounded overflow-hidden relative">
            {cameraOn || screenOn ? <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" /> : <div className={`w-full h-full flex items-center justify-center text-3xl ${speaking["local"] && !muted ? "ring-4 ring-[#23A559] animate-pulse" : ""} bg-[#5865F2]`}>😎</div>}
            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">{username} (você) {screenOn ? "• Tela" : cameraOn ? "• Câmera" : ""}</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${muted ? "bg-[#DA373C]" : speaking["local"] ? "bg-[#23A559] animate-pulse" : "bg-zinc-600"} text-white`}>{muted ? "Mutado" : speaking["local"] ? "Falando..." : "Conectado"}</span>
        </div>
        {peers.map((p) => {
          const hasVideo = remoteVideosRef.current.has(p.id);
          return (
            <div key={p.id} className={`bg-[#2B2D31] rounded-lg p-3 flex flex-col items-center gap-2 border-2 ${speaking[p.id] ? "border-[#23A559] shadow-lg shadow-[#23A559]/30" : "border-transparent"}`}>
              <div className="w-full aspect-video bg-black rounded overflow-hidden relative">
                {hasVideo ? (
                  <video
                    ref={(el) => {
                      if (el) {
                        const v = remoteVideosRef.current.get(p.id);
                        if (v && v.srcObject) el.srcObject = v.srcObject as MediaStream;
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
        <button onClick={leave} className="w-11 h-11 rounded-full bg-[#DA373C] hover:bg-[#A12828] text-white flex items-center justify-center"><PhoneOff className="w-5 h-5" /></button>
      </div>
      <p className="text-xs text-zinc-500 text-center">Dica: mutar/desmutar rápido. P2P mesh — funciona melhor com até 4 pessoas sem servidor TURN.</p>
    </div>
  );
}
