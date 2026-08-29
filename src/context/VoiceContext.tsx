"use client";
import { createContext, useContext, useState } from "react";

type VoiceParticipants = Record<string, { id: string; username: string }[]>;

const VoiceContext = createContext<{
  participants: VoiceParticipants;
  setParticipants: (channelId: string, peers: { id: string; username: string }[]) => void;
} | null>(null);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [participants, setParticipantsState] = useState<VoiceParticipants>({});
  const setParticipants = (channelId: string, peers: { id: string; username: string }[]) => {
    setParticipantsState((prev) => ({ ...prev, [channelId]: peers }));
  };
  return <VoiceContext.Provider value={{ participants, setParticipants }}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be inside VoiceProvider");
  return ctx;
}
