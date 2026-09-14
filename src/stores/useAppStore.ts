"use client";
import { create } from "zustand";
import type { Server } from "@/lib/chat-types";

type AppState = {
  viewMode: "server" | "dm";
  setViewMode: (mode: "server" | "dm") => void;

  servers: Server[];
  setServers: (servers: Server[]) => void;
  selectedServer: string;
  setSelectedServer: (id: string) => void;

  selectedChannel: string;
  setSelectedChannel: (id: string) => void;

  selectedDM: string | null;
  setSelectedDM: (id: string | null) => void;

  showMobileSidebar: boolean;
  setShowMobileSidebar: (v: boolean) => void;
  showMobileMembers: boolean;
  setShowMobileMembers: (v: boolean) => void;

  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;

  connected: boolean;
  setConnected: (v: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  viewMode: "server",
  setViewMode: (mode) => set({ viewMode: mode }),

  servers: [],
  setServers: (servers) => set({ servers }),
  selectedServer: "",
  setSelectedServer: (id) => set({ selectedServer: id }),

  selectedChannel: "",
  setSelectedChannel: (id) => set({ selectedChannel: id }),

  selectedDM: null,
  setSelectedDM: (id) => set({ selectedDM: id }),

  showMobileSidebar: false,
  setShowMobileSidebar: (v) => set({ showMobileSidebar: v }),
  showMobileMembers: false,
  setShowMobileMembers: (v) => set({ showMobileMembers: v }),

  sidebarCollapsed: false,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  connected: false,
  setConnected: (v) => set({ connected: v }),
}));
