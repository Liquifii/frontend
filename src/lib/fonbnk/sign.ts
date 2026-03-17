/**
 * Fonbnk URL signature (JWT) and webhook verification.
 * @see https://docs.fonbnk.com/widget-integration/url-params (signature)
 * @see https://docs.fonbnk.com/server-to-server/webhooks (x-signature)
 */

import { createHash } from 'crypto'
import * as jose from 'jose'

/** Generate a unique JWT for the Pay Widget URL (HS256). Fonbnk rejects reuse. */
export async function createWidgetSignature(secret: string): Promise<string> {
  const payload = {
    nbf: Math.floor(Date.now() / 1000),
    iat: Math.floor(Date.now() / 1000),
    jti: `fnk-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  }
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(new TextEncoder().encode(secret))
  return jwt
}

/** Verify Fonbnk webhook x-signature: SHA256(SHA256(secret) + JSON.stringify(body)). */
export function verifyWebhookSignature(
  requestBody: unknown,
  signature: string,
  secret: string
): boolean {
  const secretHash = createHash('sha256').update(secret, 'utf8').digest('hex')
  const bodyStr = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody)
  const expected = createHash('sha256')
    .update(secretHash)
    .update(bodyStr)
    .digest('hex')
  return signature === expected
}
