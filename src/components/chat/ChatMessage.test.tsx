import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ReactionBar, TypingBar, mentionize } from "./ChatMessage";
import { EmbedList } from "./WebhookEmbed";

describe("ReactionBar", () => {
  it("renders nothing when list is empty", () => {
    const { container } = render(<ReactionBar list={[]} toggle={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when list is undefined", () => {
    const { container } = render(<ReactionBar list={undefined} toggle={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders reaction buttons", () => {
    const toggle = vi.fn();
    render(
      <ReactionBar
        list={[
          { emoji: "👍", count: 3, mine: false },
          { emoji: "❤️", count: 1, mine: true },
        ]}
        toggle={toggle}
      />
    );
    expect(screen.getByText("👍")).toBeInTheDocument();
    expect(screen.getByText("❤️")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("calls toggle with emoji on click", () => {
    const toggle = vi.fn();
    render(<ReactionBar list={[{ emoji: "🔥", count: 2, mine: false }]} toggle={toggle} />);
    fireEvent.click(screen.getByText("🔥"));
    expect(toggle).toHaveBeenCalledWith("🔥");
  });
});

describe("TypingBar", () => {
  it("renders empty spacer when no users", () => {
    const { container } = render(<TypingBar users={[]} />);
    expect(container.querySelector(".h-5")).toBeInTheDocument();
  });

  it("shows single user typing", () => {
    render(<TypingBar users={[{ id: "1", username: "Alice" }]} />);
    expect(screen.getByText(/Alice está digitando/)).toBeInTheDocument();
  });

  it("shows multiple users typing", () => {
    render(
      <TypingBar
        users={[
          { id: "1", username: "Alice" },
          { id: "2", username: "Bob" },
        ]}
      />
    );
    expect(screen.getByText(/Alice, Bob estão digitando/)).toBeInTheDocument();
  });

  it("shows overflow count", () => {
    render(
      <TypingBar
        users={[
          { id: "1", username: "A" },
          { id: "2", username: "B" },
          { id: "3", username: "C" },
          { id: "4", username: "D" },
        ]}
      />
    );
    expect(screen.getByText(/e mais 1 estão digitando/)).toBeInTheDocument();
  });
});

describe("mentionize", () => {
  it("returns plain text when no mentions", () => {
    const result = mentionize("Hello world");
    expect(result).toBe("Hello world");
  });

  it("wraps mentions in styled spans", () => {
    const result = mentionize("Hello @alice world") as any[];
    expect(result.length).toBe(3);
    expect(result[0].props.children).toBe("Hello ");
    expect(result[1].props.className).toContain("bg-accent/40");
    expect(result[1].props.children).toBe("@alice");
    expect(result[2].props.children).toBe(" world");
  });

  it("handles multiple mentions", () => {
    const result = mentionize("@alice and @bob") as any[];
    expect(result.length).toBe(5);
    expect(result[0].props.children).toBe("");
    expect(result[1].props.children).toBe("@alice");
    expect(result[2].props.children).toBe(" and ");
    expect(result[3].props.children).toBe("@bob");
    expect(result[4].props.children).toBe("");
  });
});

describe("EmbedList", () => {
  it("renders nothing when embeds is empty or undefined", () => {
    const { container: c1 } = render(<EmbedList embeds={[]} />);
    expect(c1.firstChild).toBeNull();
    const { container: c2 } = render(<EmbedList embeds={undefined} />);
    expect(c2.firstChild).toBeNull();
  });

  it("renders title, description and color bar", () => {
    const { container } = render(
      <EmbedList embeds={[{ title: "Deploy OK", description: "v1.0 publicado", color: 3066993 }]} />
    );
    expect(screen.getByText("Deploy OK")).toBeInTheDocument();
    expect(screen.getByText("v1.0 publicado")).toBeInTheDocument();
    const bar = container.querySelector('[style*="background"]');
    // 3066993 = 0x2ECC71 = rgb(46, 204, 113) (jsdom normaliza hex para rgb)
    expect(bar?.getAttribute("style")).toContain("rgb(46, 204, 113)");
  });

  it("renders fields and footer", () => {
    render(
      <EmbedList
        embeds={[{
          title: "Build",
          fields: [{ name: "Status", value: "passou" }, { name: "Tempo", value: "42s", inline: false }],
          footer: { text: "CI • agora" },
        }]}
      />
    );
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("passou")).toBeInTheDocument();
    expect(screen.getByText("CI • agora")).toBeInTheDocument();
  });

  it("ignores malformed embeds", () => {
    const { container } = render(<EmbedList embeds={[{} as any, null as any]} />);
    expect(container.textContent).toBe("");
  });
});
