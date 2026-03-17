/**
 * GET /api/fonbnk/countries
 * Returns supported countries for on-ramp and off-ramp (Nigeria, Kenya, Ghana, etc.).
 * @see https://docs.fonbnk.com/supported-countries-and-cryptocurrencies
 */

import { NextResponse } from 'next/server'
import { getCorsHeaders, withCors } from '../../../../lib/cors'
import {
  FONBNK_COUNTRIES,
  getCountriesForOnRamp,
  getCountriesForOffRamp,
} from '../../../../lib/fonbnk/countries'

export async function OPTIONS(request: Request) {
  const headers = getCorsHeaders(request)
  return new NextResponse(null, { status: 204, headers: new Headers(headers) })
}

export async function GET(request: Request) {
  const addCors = (res: NextResponse) => withCors(res, request)
  const url = new URL(request.url)
  const flow = url.searchParams.get('flow')?.toLowerCase() // 'onramp' | 'offramp' | omit = all

  let list = FONBNK_COUNTRIES
  if (flow === 'onramp') list = getCountriesForOnRamp()
  else if (flow === 'offramp') list = getCountriesForOffRamp()

  return addCors(
    NextResponse.json({
      countries: list.map((c) => ({
        countryIsoCode: c.countryIsoCode,
        currencyIsoCode: c.currencyIsoCode,
        name: c.name,
        onRampChannels: c.onRampChannels,
        offRampChannels: c.offRampChannels,
      })),
    })
  )
}
