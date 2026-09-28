const buckets = globalThis.__blogBuilderRateLimit || new Map();
globalThis.__blogBuilderRateLimit = buckets;

export function getClientIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

export function checkRateLimit(request, key, limit, windowMs) {
  const now = Date.now();
  const bucketKey = `${key}:${getClientIp(request)}`;
  const current = buckets.get(bucketKey);
  if (!current || current.expiresAt <= now) {
    buckets.set(bucketKey, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  current.count += 1;
  if (current.count <= limit) return { allowed: true, retryAfter: 0 };
  return { allowed: false, retryAfter: Math.ceil((current.expiresAt - now) / 1000) };
}

export function rateLimitResponse(retryAfter) {
  return new Response(JSON.stringify({ success: false, message: "Too many requests. Please try again later." }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfter),
    },
  });
}