const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/g;

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  return [...new Set(matches.map((u) => {
    let url = u;
    while (url.endsWith(".") || url.endsWith(",") || url.endsWith(")") || url.endsWith("?") || url.endsWith("!")) {
      url = url.slice(0, -1);
    }
    try { new URL(url); return url; } catch { return ""; }
  }).filter(Boolean))];
}
