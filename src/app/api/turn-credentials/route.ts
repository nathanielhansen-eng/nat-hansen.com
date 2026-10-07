import { getClientIp, turnPerMinute } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// ICE servers for the peer-to-peer games in public/teaching/games/.
// STUN alone fails on campus networks that block device-to-device traffic,
// so we mint short-lived Cloudflare TURN credentials for a relay fallback.
// The TURN key itself never leaves the server.

const STUN_ONLY = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
];

type IceServer = { urls: string | string[]; username?: string; credential?: string };

export async function GET(req: Request) {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const token = process.env.CLOUDFLARE_TURN_KEY_API_TOKEN;
  if (!keyId || !token) return Response.json({ iceServers: STUN_ONLY });

  if (turnPerMinute) {
    const { success } = await turnPerMinute.limit(getClientIp(req));
    if (!success) return Response.json({ iceServers: STUN_ONLY });
  }

  try {
    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ttl: 4 * 60 * 60 }),
        cache: "no-store",
      },
    );
    if (!res.ok) throw new Error(`cloudflare ${res.status}`);
    const data = (await res.json()) as { iceServers: IceServer[] };
    // Browsers block port 53; drop those URLs so ICE doesn't wait on them.
    const iceServers = data.iceServers.map((s) => ({
      ...s,
      urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53\b/.test(u)),
    }));
    return Response.json({ iceServers }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("turn-credentials:", err);
    return Response.json({ iceServers: STUN_ONLY });
  }
}
