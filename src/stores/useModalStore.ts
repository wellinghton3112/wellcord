"use client";
import { create } from "zustand";
import type { Server } from "@/lib/chat-types";
import type { CardProfile } from "@/components/ProfileCard";

type ModalState = {
  showCreateServerModal: boolean;
  showCreateChannelModal: boolean;
  editingServer: Server | null;

  showNewDMModal: boolean;
  showJoinModal: boolean;
  joinCode: string;
  setJoinCode: (code: string) => void;
  joining: boolean;
  setJoining: (v: boolean) => void;

  showUsernameModal: boolean;
  viewProfile: CardProfile | null;
  setViewProfile: (profile: CardProfile | null) => void;

  showMembersModal: boolean;
  showRolesModal: boolean;
  showWebhooksModal: boolean;
  showPinsModal: boolean;
  showPollModal: boolean;

  showStatusMenu: boolean;
  setShowStatusMenu: (v: boolean) => void;

  openCreateServer: () => void;
  openEditServer: (server: Server) => void;
  openModal: (modalName: string) => void;
  closeModal: (modalName: string) => void;
  closeAllModals: () => void;
};

export const useModalStore = create<ModalState>((set) => ({
  showCreateServerModal: false,
  showCreateChannelModal: false,
  editingServer: null,

  showNewDMModal: false,
  showJoinModal: false,
  joinCode: "",
  setJoinCode: (code) => set({ joinCode: code }),
  joining: false,
  setJoining: (v) => set({ joining: v }),

  showUsernameModal: false,
  viewProfile: null,
  setViewProfile: (profile) => set({ viewProfile: profile }),

  showMembersModal: false,
  showRolesModal: false,
  showWebhooksModal: false,
  showPinsModal: false,
  showPollModal: false,

  showStatusMenu: false,
  setShowStatusMenu: (v) => set({ showStatusMenu: v }),

  openCreateServer: () =>
    set({
      editingServer: null,
      showCreateServerModal: true,
    }),
  openEditServer: (server) =>
    set({
      editingServer: server,
      showCreateServerModal: true,
    }),
  openModal: (modalName) =>
    set({ [modalName]: true } as any),
  closeModal: (modalName) =>
    set({ [modalName]: false } as any),
  closeAllModals: () =>
    set({
      showCreateServerModal: false,
      showCreateChannelModal: false,
      showNewDMModal: false,
      showJoinModal: false,
      showUsernameModal: false,
      showMembersModal: false,
      showRolesModal: false,
      showWebhooksModal: false,
      showPinsModal: false,
      showPollModal: false,
      showStatusMenu: false,
      viewProfile: null,
      editingServer: null,
    }),
}));
