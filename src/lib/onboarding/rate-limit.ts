const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

/**
 * In-memory sliding-window limiter, scoped to a single server process. This is a prototype-grade
 * mitigation only: it does not share state across multiple serverless instances/regions, resets
 * on every cold start, and is trivially bypassed by rotating the source IP. It exists to blunt
 * casual scraping/brute-forcing of clientId-based onboarding links, not as a real security
 * control. A production version needs a shared external store (e.g. Upstash Redis / @upstash/ratelimit).
 */
const hitsByKey = new Map<string, number[]>();

export function checkRateLimit(clientId: string, ip: string): boolean {
  const key = `${clientId}:${ip}`;
  const now = Date.now();
  const hits = (hitsByKey.get(key) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);

  if (hits.length >= MAX_REQUESTS_PER_WINDOW) {
    hitsByKey.set(key, hits);
    return false;
  }

  hits.push(now);
  hitsByKey.set(key, hits);
  return true;
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}
