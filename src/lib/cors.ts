/**
 * CORS helpers for agent API routes when the frontend is on a different origin.
 * Set ALLOWED_ORIGINS in .env (comma-separated, e.g. https://yourapp.com,https://warpcast.com).
 */

function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS ?? ''
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
}

export function getCorsHeaders(request: Request): Record<string, string> {
  const origins = getAllowedOrigins()
  if (origins.length === 0) return {}

  const origin = request.headers.get('origin') ?? ''
  const allow = origins.includes(origin) ? origin : origins[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

export function withCors<T extends { headers: Headers }>(response: T, request: Request): T {
  const headers = getCorsHeaders(request)
  for (const [k, v] of Object.entries(headers)) {
    response.headers.set(k, v)
  }
  return response
}
