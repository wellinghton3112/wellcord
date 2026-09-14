import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./useAppStore";

describe("useAppStore", () => {
  beforeEach(() => {
    useAppStore.setState({
      viewMode: "server",
      selectedServer: undefined,
      selectedChannel: undefined,
      selectedDM: undefined,
      servers: [],
      showMobileSidebar: false,
      connected: false,
    });
  });

  it("has default state", () => {
    const state = useAppStore.getState();
    expect(state.viewMode).toBe("server");
    expect(state.selectedServer).toBeUndefined();
    expect(state.selectedChannel).toBeUndefined();
    expect(state.selectedDM).toBeUndefined();
    expect(state.showMobileSidebar).toBe(false);
  });

  it("setViewMode updates viewMode", () => {
    useAppStore.getState().setViewMode("dm");
    expect(useAppStore.getState().viewMode).toBe("dm");
  });

  it("setSelectedServer updates selectedServer", () => {
    useAppStore.getState().setSelectedServer("srv-1");
    expect(useAppStore.getState().selectedServer).toBe("srv-1");
  });

  it("setSelectedChannel updates selectedChannel", () => {
    useAppStore.getState().setSelectedChannel("ch-1");
    expect(useAppStore.getState().selectedChannel).toBe("ch-1");
  });

  it("setSelectedDM updates selectedDM", () => {
    useAppStore.getState().setSelectedDM("dm-1");
    expect(useAppStore.getState().selectedDM).toBe("dm-1");
  });

  it("setShowMobileSidebar toggles sidebar", () => {
    useAppStore.getState().setShowMobileSidebar(true);
    expect(useAppStore.getState().showMobileSidebar).toBe(true);
    useAppStore.getState().setShowMobileSidebar(false);
    expect(useAppStore.getState().showMobileSidebar).toBe(false);
  });

  it("setConnected updates connected", () => {
    useAppStore.getState().setConnected(true);
    expect(useAppStore.getState().connected).toBe(true);
  });

  it("setServers updates servers", () => {
    const servers = [{ id: "s1", name: "Test", icon: "T", channels: [] }];
    useAppStore.getState().setServers(servers as any);
    expect(useAppStore.getState().servers).toEqual(servers);
  });
});
