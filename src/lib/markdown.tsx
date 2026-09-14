"use client";
import React from "react";

type Token =
  | { type: "text"; content: string }
  | { type: "bold"; content: string }
  | { type: "italic"; content: string }
  | { type: "strikethrough"; content: string }
  | { type: "code"; content: string }
  | { type: "codeblock"; content: string; lang?: string };

function parseInline(text: string): Token[] {
  const tokens: Token[] = [];
  // Order matters: code first (to avoid parsing inside code), then bold, italic, strikethrough
  const regex = /(```[\s\S]*?```)|(`[^`]+`)|(\*\*\*[^*]+\*\*\*)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(__[^_]+__)|(_[^_]+_)|(\*\*[^*]+\*\*)|(~~[^~]+~~)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      tokens.push({ type: "text", content: text.slice(last, m.index) });
    }

    if (m[1]) {
      // ```code block``` inline (rare but handle)
      tokens.push({ type: "code", content: m[1].slice(3, -3).trim() });
    } else if (m[2]) {
      tokens.push({ type: "code", content: m[2].slice(1, -1) });
    } else if (m[3]) {
      tokens.push({ type: "bold", content: m[3].slice(3, -3) });
      // Also check for bold+italic: ***text***
      const inner = m[3].slice(3, -3);
      if (inner.startsWith("*") && inner.endsWith("*")) {
        tokens[tokens.length - 1] = { type: "bold", content: inner.slice(1, -1) };
      }
    } else if (m[4]) {
      tokens.push({ type: "bold", content: m[4].slice(2, -2) });
    } else if (m[5]) {
      tokens.push({ type: "italic", content: m[5].slice(1, -1) });
    } else if (m[6]) {
      tokens.push({ type: "bold", content: m[6].slice(2, -2) });
    } else if (m[7]) {
      tokens.push({ type: "italic", content: m[7].slice(1, -1) });
    } else if (m[8]) {
      tokens.push({ type: "bold", content: m[8].slice(2, -2) });
    } else if (m[9]) {
      tokens.push({ type: "strikethrough", content: m[9].slice(2, -2) });
    }
    last = m.index + m[0].length;
  }

  if (last < text.length) {
    tokens.push({ type: "text", content: text.slice(last) });
  }

  return tokens;
}

export function parseMarkdown(text: string): Token[] {
  const lines = text.split("\n");
  const tokens: Token[] = [];
  let i = 0;

  while (i < lines.length) {
    // Fenced code block: ```lang\n...\n```
    if (lines[i].trimStart().startsWith("```")) {
      const lang = lines[i].trimStart().slice(3).trim() || undefined;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      tokens.push({ type: "codeblock", content: codeLines.join("\n"), lang });
      continue;
    }

    // Regular line: parse inline markdown
    const inlineTokens = parseInline(lines[i]);
    tokens.push(...inlineTokens);

    if (i < lines.length - 1) {
      tokens.push({ type: "text", content: "\n" });
    }
    i++;
  }

  return tokens;
}

export function MarkdownText({ text, className, mentionize }: { text: string; className?: string; mentionize?: (text: string) => React.ReactNode }) {
  const tokens = parseMarkdown(text);

  return (
    <span className={className}>
      {tokens.map((t, i) => {
        switch (t.type) {
          case "bold":
            return <strong key={i} className="font-bold">{t.content}</strong>;
          case "italic":
            return <em key={i} className="italic">{t.content}</em>;
          case "strikethrough":
            return <del key={i} className="line-through text-zinc-500">{t.content}</del>;
          case "code":
            return (
              <code key={i} className="px-1.5 py-0.5 rounded bg-[#2B2D31] text-[#E9967A] text-[13px] font-mono border border-[#4A4D53]">
                {t.content}
              </code>
            );
          case "codeblock":
            return (
              <pre key={i} className="my-1 rounded-lg bg-[#1E1F22] border border-[#4A4D53] overflow-x-auto">
                {t.lang && (
                  <div className="px-3 py-1 text-[10px] text-zinc-500 border-b border-[#4A4D53] font-mono">{t.lang}</div>
                )}
                <code className="block px-3 py-2 text-[13px] font-mono text-zinc-200 whitespace-pre">{t.content}</code>
              </pre>
            );
          default:
            return mentionize ? <span key={i}>{mentionize(t.content)}</span> : <span key={i}>{t.content}</span>;
        }
      })}
    </span>
  );
}
