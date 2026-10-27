// In-memory fixed-window rate limiter keyed by IP.
// Good for a single server instance; for multi-instance/serverless deployments
// swap the Map for Redis (e.g. Upstash) using the same interface.

const buckets = new Map();

export function rateLimit(key, { max = 5, windowMs = 10 * 60 * 1000, now = Date.now() } = {}) {
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    pruneExpired(now);
    return { allowed: true, remaining: max - 1, retryAfterSec: 0 };
  }

  if (bucket.count >= max) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true, remaining: max - bucket.count, retryAfterSec: 0 };
}

function pruneExpired(now) {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

export function resetRateLimit() {
  buckets.clear();
}
