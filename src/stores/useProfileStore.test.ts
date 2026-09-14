import { describe, it, expect, beforeEach } from "vitest";
import { useProfileStore } from "./useProfileStore";

describe("useProfileStore", () => {
  beforeEach(() => {
    useProfileStore.setState({
      user: null,
      username: "",
      avatar: "",
      status: "online",
      bio: "",
    });
  });

  it("has default state", () => {
    const state = useProfileStore.getState();
    expect(state.user).toBeNull();
    expect(state.username).toBe("");
    expect(state.avatar).toBe("");
    expect(state.status).toBe("online");
    expect(state.bio).toBe("");
  });

  it("setUser updates user and username", () => {
    useProfileStore.getState().setUser({ id: "u1" } as any);
    expect(useProfileStore.getState().user).toEqual({ id: "u1" });
  });

  it("setUsername updates username", () => {
    useProfileStore.getState().setUsername("alice");
    expect(useProfileStore.getState().username).toBe("alice");
  });

  it("setAvatar updates avatar", () => {
    useProfileStore.getState().setAvatar("😎");
    expect(useProfileStore.getState().avatar).toBe("😎");
  });

  it("setStatus updates status", () => {
    useProfileStore.getState().setStatus("idle");
    expect(useProfileStore.getState().status).toBe("idle");
  });

  it("setBio updates bio", () => {
    useProfileStore.getState().setBio("Hello world");
    expect(useProfileStore.getState().bio).toBe("Hello world");
  });

  it("setAvatarFile updates avatarFile", () => {
    const file = new File(["test"], "avatar.png", { type: "image/png" });
    useProfileStore.getState().setAvatarFile(file);
    expect(useProfileStore.getState().avatarFile).toBe(file);
  });

  it("setAvatarRemoved updates avatarRemoved", () => {
    useProfileStore.getState().setAvatarRemoved(true);
    expect(useProfileStore.getState().avatarRemoved).toBe(true);
  });

  it("setStatusText updates statusText", () => {
    useProfileStore.getState().setStatusText("🎮 Playing games");
    expect(useProfileStore.getState().statusText).toBe("🎮 Playing games");
  });
});
