"use client";
import { createContext, useContext, useRef, useState } from "react";

type VoiceParticipants = Record<string, { id: string; username: string }[]>;

export type VoiceStatus = {
  joined: boolean;
  channelId: string;
  channelName?: string;
  serverName?: string;
  muted: boolean;
  deafened: boolean;
};

export type VoiceControls = {
  toggleMute: () => void;
  toggleDeafen: () => void;
  leave: () => void;
};

const VoiceContext = createContext<{
  participants: VoiceParticipants;
  setParticipants: (channelId: string, peers: { id: string; username: string }[]) => void;
  status: VoiceStatus;
  setStatus: (s: VoiceStatus) => void;
  controlsRef: React.MutableRefObject<VoiceControls | null>;
} | null>(null);

const IDLE: VoiceStatus = { joined: false, channelId: "", muted: false, deafened: false };

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [participants, setParticipantsState] = useState<VoiceParticipants>({});
  const [status, setStatus] = useState<VoiceStatus>(IDLE);
  const controlsRef = useRef<VoiceControls | null>(null);
  const setParticipants = (channelId: string, peers: { id: string; username: string }[]) => {
    setParticipantsState((prev) => ({ ...prev, [channelId]: peers }));
  };
  return <VoiceContext.Provider value={{ participants, setParticipants, status, setStatus, controlsRef }}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be inside VoiceProvider");
  return ctx;
}
