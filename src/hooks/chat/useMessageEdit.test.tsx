import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useMessageEdit } from "./useMessageEdit";

describe("useMessageEdit", () => {
  it("starts with no editing state", () => {
    const { result } = renderHook(() => useMessageEdit());
    expect(result.current.editingId).toBeNull();
  });

  it("startEdit sets editingId and draft", () => {
    const { result } = renderHook(() => useMessageEdit());
    act(() => result.current.startEdit("msg-1", "Hello world"));
    expect(result.current.editingId).toBe("msg-1");
  });

  it("cancelEdit clears editing state", () => {
    const { result } = renderHook(() => useMessageEdit());
    act(() => result.current.startEdit("msg-1", "Hello"));
    act(() => result.current.cancelEdit());
    expect(result.current.editingId).toBeNull();
  });

  it("saveEdit calls save function and clears state", () => {
    const { result } = renderHook(() => useMessageEdit());
    const save = vi.fn();
    act(() => result.current.startEdit("msg-1", "Updated content"));
    act(() => result.current.saveEdit(save));
    expect(save).toHaveBeenCalledWith("msg-1", "Updated content");
    expect(result.current.editingId).toBeNull();
  });

  it("saveEdit does not call save if draft is empty", () => {
    const { result } = renderHook(() => useMessageEdit());
    const save = vi.fn();
    act(() => result.current.startEdit("msg-1", "   "));
    act(() => result.current.saveEdit(save));
    expect(save).not.toHaveBeenCalled();
    expect(result.current.editingId).toBeNull();
  });
});
