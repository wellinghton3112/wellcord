"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Mic, MicOff, PhoneOff, Headphones, Volume2 } from "lucide-react";

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
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [error, setError] = useState("");

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
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
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
      setError(`Teste falhou: ${e.name}: ${e.message}. Veja o cadeado 🔒 > Microfone > Permitir ou teste no celular.`);
    }
  };

  const join = async () => {
    setError("");
    console.log("join clicked, secureContext:", window.isSecureContext, "mediaDevices:", !!navigator.mediaDevices);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Navegador sem suporte a microfone. Use Chrome/Edge/Firefox em HTTPS.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      localStreamRef.current = stream;
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
        const state = ch.presenceState();
        const ids: string[] = [];
        Object.values(state).forEach((arr: any) => arr.forEach((p: any) => ids.push(p.presence?.id || p.user_id)));
        // adicionar peers novos
        ids.forEach((id) => {
          if (id === myIdRef.current) return;
          if (!peersRef.current.has(id)) createPeer(id, true);
        });
        // remover desconectados
        peersRef.current.forEach((_, id) => {
          if (!ids.includes(id)) {
            peersRef.current.get(id)?.close();
            peersRef.current.delete(id);
            remoteAudiosRef.current.get(id)?.remove();
            remoteAudiosRef.current.delete(id);
          }
        });
        setPeers(ids.filter((id) => id !== myIdRef.current).map((id) => ({ id, username: id.split("-")[0] })));
      });

      ch.subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ id: myIdRef.current, username });
          setJoined(true);
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

  if (!joined) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
        <Volume2 className="w-20 h-20 text-zinc-500" />
        <div>
          <h2 className="text-2xl font-bold">Canal de voz</h2>
          <p className="text-zinc-400 mt-2 max-w-md">Converse por voz com seus amigos. Áudio P2P via WebRTC com sinalização pelo Supabase Realtime.</p>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>
        <button onClick={join} className="bg-[#23A559] hover:bg-[#1A7F44] text-white px-8 py-3 rounded-full font-bold flex items-center gap-2">
          <PhoneOff className="w-5 h-5 rotate-[-135deg]" /> Entrar na voz
        </button>
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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-[#232428] rounded-lg p-4 flex flex-col items-center gap-3 border-2 border-[#23A559]">
          <div className="w-20 h-20 rounded-full bg-[#5865F2] flex items-center justify-center text-3xl">😎</div>
          <span className="font-medium">{username} (você)</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${muted ? "bg-[#DA373C]" : "bg-[#23A559]"} text-white`}>{muted ? "Mutado" : "Falando"}</span>
        </div>
        {peers.map((p) => (
          <div key={p.id} className="bg-[#2B2D31] rounded-lg p-4 flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-[#41434A] flex items-center justify-center text-3xl">🧑</div>
            <span className="font-medium truncate max-w-full">{p.username}</span>
            <span className="text-xs text-zinc-400">Conectado</span>
          </div>
        ))}
        {peers.length === 0 && <div className="col-span-2 md:col-span-2 text-zinc-400 text-sm flex items-center justify-center">Nenhum amigo na voz ainda. Compartilhe o link!</div>}
      </div>

      <div className="mt-auto flex items-center justify-center gap-3 p-4 bg-[#232428] rounded-lg">
        <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center ${muted ? "bg-[#DA373C] text-white" : "bg-[#2B2D31] hover:bg-[#35373C] text-zinc-200"}`} title={muted ? "Ativar microfone" : "Mutar"}>
          {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        <button onClick={toggleDeafen} className={`w-12 h-12 rounded-full flex items-center justify-center ${deafened ? "bg-[#DA373C] text-white" : "bg-[#2B2D31] hover:bg-[#35373C] text-zinc-200"}`} title="Surdo">
          <Headphones className="w-6 h-6" />
        </button>
        <button onClick={leave} className="w-12 h-12 rounded-full bg-[#DA373C] hover:bg-[#A12828] text-white flex items-center justify-center"><PhoneOff className="w-6 h-6" /></button>
      </div>
      <p className="text-xs text-zinc-500 text-center">Dica: mutar/desmutar rápido. P2P mesh — funciona melhor com até 4 pessoas sem servidor TURN.</p>
    </div>
  );
}
