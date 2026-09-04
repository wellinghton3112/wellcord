// Servidores ICE (STUN + TURN opcional) para a voz WebRTC.
// Sem TURN, ~20-30% das chamadas atrás de NAT simétrico/firewall restrito falham.
// Configure via env (Vercel → Settings → Environment Variables):
//   NEXT_PUBLIC_TURN_URLS="turn:turn.exemplo.com:3478?transport=udp,turn:turn.exemplo.com:3478?transport=tcp,turns:turn.exemplo.com:443?transport=tcp"
//   NEXT_PUBLIC_TURN_USERNAME="usuario"
//   NEXT_PUBLIC_TURN_CREDENTIAL="senha"
// Grátis p/ começar: Open Relay (metered.ca/tools/openrelay, 20 GB/mês),
// ExpressTurn (100 GB/mês) ou Cloudflare Realtime. Sem essas vars, usa só STUN.
export function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];
  const urls = (process.env.NEXT_PUBLIC_TURN_URLS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const username = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
  if (urls.length > 0 && username && credential) {
    servers.push({ urls, username, credential });
  }
  return servers;
}

export function hasTurnConfigured(): boolean {
  return Boolean(
    (process.env.NEXT_PUBLIC_TURN_URLS || "").trim() &&
      process.env.NEXT_PUBLIC_TURN_USERNAME &&
      process.env.NEXT_PUBLIC_TURN_CREDENTIAL
  );
}
