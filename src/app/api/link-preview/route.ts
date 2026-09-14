import { NextResponse } from "next/server";

export type LinkEmbedData = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
};

const cache = new Map<string, { data: LinkEmbedData; ts: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 min

function extractMeta(html: string, url: string): LinkEmbedData {
  const get = (prop: string) => {
    const ogMatch = html.match(new RegExp(`<meta[^>]*property="${prop}"[^>]*content="([^"]*)"`, "i"));
    if (ogMatch) return ogMatch[1];
    const nameMatch = html.match(new RegExp(`<meta[^>]*name="${prop}"[^>]*content="([^"]*)"`, "i"));
    if (nameMatch) return nameMatch[1];
    return null;
  };

  const title = get("og:title") || get("twitter:title");
  const description = get("og:description") || get("twitter:description") || get("description");
  let image = get("og:image") || get("twitter:image");
  const siteName = get("og:site_name");
  const favicon = (() => {
    const m = html.match(/<link[^>]*rel="(?:shortcut )?icon"[^>]*href="([^"]*)"/i);
    return m ? m[1] : null;
  })();

  if (image && !image.startsWith("http")) {
    try { image = new URL(image, url).href; } catch {}
  }

  return { url, title, description, image, siteName, favicon };
}

export async function GET(req: Request) {
  const urlParam = new URL(req.url).searchParams.get("url");
  if (!urlParam) return NextResponse.json({ error: "Missing url param" }, { status: 400 });

  let url: URL;
  try { url = new URL(urlParam); } catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }

  if (!["http:", "https:"].includes(url.protocol)) {
    return NextResponse.json({ error: "Only HTTP(S) supported" }, { status: 400 });
  }

  const cached = cache.get(url.href);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const res = await fetch(url.href, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WellcordBot/1.0)" },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    });
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
      return NextResponse.json({ error: "Not HTML" }, { status: 422 });
    }
    const html = await res.text();
    const data = extractMeta(html, url.href);
    cache.set(url.href, { data, ts: Date.now() });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Fetch failed" }, { status: 502 });
  }
}
