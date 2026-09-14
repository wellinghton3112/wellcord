import { describe, it, expect, beforeEach } from "vitest";
import { useModalStore } from "./useModalStore";

describe("useModalStore", () => {
  beforeEach(() => {
    useModalStore.setState({
      showNewDMModal: false,
      showUsernameModal: false,
      showMembersModal: false,
      showRolesModal: false,
      showPinsModal: false,
      showPollModal: false,
      showStatusMenu: false,
      showEditServerModal: false,
      showWebhooksModal: false,
    });
  });

  it("has all modals closed by default", () => {
    const state = useModalStore.getState();
    expect(state.showNewDMModal).toBe(false);
    expect(state.showUsernameModal).toBe(false);
    expect(state.showMembersModal).toBe(false);
    expect(state.showRolesModal).toBe(false);
    expect(state.showPinsModal).toBe(false);
    expect(state.showPollModal).toBe(false);
    expect(state.showStatusMenu).toBe(false);
    expect(state.showEditServerModal).toBe(false);
    expect(state.showWebhooksModal).toBe(false);
  });

  it("openModal opens the correct modal", () => {
    useModalStore.getState().openModal("showNewDMModal");
    expect(useModalStore.getState().showNewDMModal).toBe(true);
    expect(useModalStore.getState().showMembersModal).toBe(false);
  });

  it("openEditServer sets server data and opens modal", () => {
    const server = { id: "s1", name: "Test", icon: "T", channels: [] };
    useModalStore.getState().openEditServer(server as any);
    expect(useModalStore.getState().showCreateServerModal).toBe(true);
    expect(useModalStore.getState().editingServer).toEqual(server);
  });

  it("closeModal closes the correct modal", () => {
    useModalStore.getState().openModal("showMembersModal");
    expect(useModalStore.getState().showMembersModal).toBe(true);
    useModalStore.getState().closeModal("showMembersModal");
    expect(useModalStore.getState().showMembersModal).toBe(false);
  });

  it("closeAllModals closes everything", () => {
    useModalStore.getState().openModal("showNewDMModal");
    useModalStore.getState().openModal("showMembersModal");
    useModalStore.getState().closeAllModals();
    expect(useModalStore.getState().showNewDMModal).toBe(false);
    expect(useModalStore.getState().showMembersModal).toBe(false);
  });

  it("setShowStatusMenu toggles status menu", () => {
    useModalStore.getState().setShowStatusMenu(true);
    expect(useModalStore.getState().showStatusMenu).toBe(true);
    useModalStore.getState().setShowStatusMenu(false);
    expect(useModalStore.getState().showStatusMenu).toBe(false);
  });
});
