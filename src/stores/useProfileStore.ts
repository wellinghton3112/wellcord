"use client";
import { create } from "zustand";
import type { PresenceStatus } from "@/lib/chat-types";

type ProfileState = {
  user: any | null;
  setUser: (user: any | null) => void;

  username: string;
  setUsername: (name: string) => void;

  avatar: string;
  setAvatar: (avatar: string) => void;
  avatarFile: File | null;
  setAvatarFile: (file: File | null) => void;
  avatarRemoved: boolean;
  setAvatarRemoved: (v: boolean) => void;

  bio: string;
  setBio: (bio: string) => void;
  statusText: string;
  setStatusText: (status: string) => void;

  status: PresenceStatus;
  setStatus: (status: PresenceStatus) => void;
};

export const useProfileStore = create<ProfileState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  username: "Voce",
  setUsername: (name) => set({ username: name }),

  avatar: "😎",
  setAvatar: (avatar) => set({ avatar }),
  avatarFile: null,
  setAvatarFile: (file) => set({ avatarFile: file }),
  avatarRemoved: false,
  setAvatarRemoved: (v) => set({ avatarRemoved: v }),

  bio: "",
  setBio: (bio) => set({ bio }),
  statusText: "",
  setStatusText: (status) => set({ statusText: status }),

  status: "online",
  setStatus: (status) => set({ status }),
}));
