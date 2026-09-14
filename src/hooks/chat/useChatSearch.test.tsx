import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useChatSearch } from "./useChatSearch";

const messages = [
  { id: "1", content: "Hello world" },
  { id: "2", content: "Foo bar" },
  { id: "3", content: "Hello again" },
  { id: "4", content: "No match" },
];

const defaults = { messages, selectedDM: null, selectedChannel: "ch1", viewMode: "server" };

describe("useChatSearch", () => {
  it("starts with empty search", () => {
    const { result } = renderHook(() => useChatSearch(defaults));
    expect(result.current.search).toBe("");
    expect(result.current.q).toBe("");
    expect(result.current.matchIds).toEqual([]);
    expect(result.current.activeMatchId).toBeNull();
  });

  it("finds matching message ids", () => {
    const { result } = renderHook(() => useChatSearch(defaults));
    act(() => result.current.runSearch("hello"));
    expect(result.current.matchIds).toEqual(["1", "3"]);
    expect(result.current.activeMatchId).toBe("1");
  });

  it("stepMatch cycles through results", () => {
    const { result } = renderHook(() => useChatSearch(defaults));
    act(() => result.current.runSearch("hello"));
    expect(result.current.matchIdx).toBe(0);
    act(() => result.current.stepMatch(1));
    expect(result.current.matchIdx).toBe(1);
    expect(result.current.activeMatchId).toBe("3");
    act(() => result.current.stepMatch(1));
    expect(result.current.matchIdx).toBe(0);
  });

  it("stepMatch(-1) goes backwards", () => {
    const { result } = renderHook(() => useChatSearch(defaults));
    act(() => result.current.runSearch("hello"));
    act(() => result.current.stepMatch(-1));
    expect(result.current.matchIdx).toBe(1);
  });

  it("clears search on channel change", () => {
    const { result, rerender } = renderHook(
      ({ selectedChannel }) => useChatSearch({ ...defaults, selectedChannel }),
      { initialProps: { selectedChannel: "ch1" } }
    );
    act(() => result.current.runSearch("hello"));
    expect(result.current.search).toBe("hello");
    rerender({ selectedChannel: "ch2" });
    expect(result.current.search).toBe("");
  });

  it("highlight returns original text when no query", () => {
    const { result } = renderHook(() => useChatSearch(defaults));
    const highlighted = result.current.highlight("Hello world");
    expect(highlighted).toBe("Hello world");
  });

  it("highlight returns React nodes with marks", () => {
    const { result } = renderHook(() => useChatSearch(defaults));
    act(() => result.current.runSearch("hello"));
    const highlighted = result.current.highlight("Hello world");
    expect(Array.isArray(highlighted)).toBe(true);
    expect((highlighted as any[]).length).toBeGreaterThan(1);
  });

  it("returns no matches for non-existent text", () => {
    const { result } = renderHook(() => useChatSearch(defaults));
    act(() => result.current.runSearch("zzzzz"));
    expect(result.current.matchIds).toEqual([]);
    expect(result.current.activeMatchId).toBeNull();
  });

  it("search is case-insensitive", () => {
    const { result } = renderHook(() => useChatSearch(defaults));
    act(() => result.current.runSearch("HELLO"));
    expect(result.current.matchIds).toEqual(["1", "3"]);
  });
});
