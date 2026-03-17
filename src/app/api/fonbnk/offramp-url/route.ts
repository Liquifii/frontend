/**
 * GET/POST /api/fonbnk/offramp-url
 * Returns a signed Fonbnk Pay Widget URL for off-ramp (cUSD on Celo → local currency).
 * Query or body: amount, currency (local|crypto), countryIsoCode (NG|KE|GH|...),
 * optional: paymentChannel, redirectUrl, email, orderParams.
 */

import { NextResponse } from 'next/server'
import { getCorsHeaders, withCors } from '../../../../lib/cors'
import { getCountryByCode } from '../../../../lib/fonbnk/countries'
import { createWidgetSignature } from '../../../../lib/fonbnk/sign'
import { buildOffRampUrl, isSandbox } from '../../../../lib/fonbnk/url'

export async function OPTIONS(request: Request) {
  const headers = getCorsHeaders(request)
  return new NextResponse(null, { status: 204, headers: new Headers(headers) })
}

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  const url = new URL(request.url)
  const fromQuery = Object.fromEntries(url.searchParams.entries())
  if (request.method === 'POST') {
    try {
      const body = await request.json()
      return { ...fromQuery, ...body }
    } catch {
      return fromQuery
    }
  }
  return fromQuery
}

export async function GET(request: Request) {
  const addCors = (res: NextResponse) => withCors(res, request)
  const params = Object.fromEntries(new URL(request.url).searchParams.entries())
  return handleOffRampUrl(params, addCors)
}

export async function POST(request: Request) {
  const addCors = (res: NextResponse) => withCors(res, request)
  const params = (await parseBody(request)) as Record<string, string | number | boolean | undefined>
  return handleOffRampUrl(params, addCors)
}

async function handleOffRampUrl(
  params: Record<string, unknown>,
  addCors: (res: NextResponse) => NextResponse
) {
  const source = process.env.FONBNK_SOURCE?.trim()
  const secret = process.env.FONBNK_URL_SIGNATURE_SECRET?.trim()
  if (!source || !secret) {
    return addCors(
      NextResponse.json(
        { error: 'Fonbnk not configured. Set FONBNK_SOURCE and FONBNK_URL_SIGNATURE_SECRET in .env.' },
        { status: 503 }
      )
    )
  }

  const amount = typeof params.amount === 'number' ? params.amount : Number(params.amount)
  const currency = params.currency === 'crypto' ? 'crypto' : 'local'
  const countryIsoCode = typeof params.countryIsoCode === 'string' ? params.countryIsoCode.trim().toUpperCase() : ''

  if (!Number.isFinite(amount) || amount <= 0) {
    return addCors(NextResponse.json({ error: 'Amount must be a positive number.' }, { status: 400 }))
  }
  const country = getCountryByCode(countryIsoCode)
  if (!country || country.offRampChannels.length === 0) {
    return addCors(
      NextResponse.json(
        { error: 'Unsupported country for off-ramp. Use GET /api/fonbnk/countries for supported list.' },
        { status: 400 }
      )
    )
  }

  try {
    const signature = await createWidgetSignature(secret)
    const url = buildOffRampUrl(
      {
        amount,
        currency,
        countryIsoCode,
        paymentChannel: typeof params.paymentChannel === 'string' ? (params.paymentChannel as 'bank' | 'mobile_money' | 'airtime') : undefined,
        redirectUrl: typeof params.redirectUrl === 'string' ? params.redirectUrl : undefined,
        email: typeof params.email === 'string' ? params.email : undefined,
        orderParams: typeof params.orderParams === 'string' ? params.orderParams : undefined,
      },
      source,
      signature,
      isSandbox()
    )
    return addCors(NextResponse.json({ url, sandbox: isSandbox() }))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return addCors(NextResponse.json({ error: 'Failed to build widget URL', details: message }, { status: 500 }))
  }
}
