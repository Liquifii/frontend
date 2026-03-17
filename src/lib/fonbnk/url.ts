/**
 * Build Fonbnk Pay Widget URLs (on-ramp and off-ramp) with CELO cUSD.
 * @see https://docs.fonbnk.com/widget-integration/url-params
 */

import { FONBNK_CELO_CUSD, getCountryByCode, type PaymentChannel } from './countries'

const SANDBOX_BASE = 'https://sandbox-pay.fonbnk.com'
const PROD_BASE = 'https://pay.fonbnk.com'

export interface OnRampParams {
  /** Destination Celo wallet address (receives cUSD). */
  address: string
  /** Amount in local currency (e.g. NGN) or in cUSD; see currency. */
  amount: number
  /** 'local' = amount is in fiat (e.g. NGN); 'crypto' = amount is in cUSD. */
  currency: 'local' | 'crypto'
  /** Country ISO code (e.g. NG, KE, GH). */
  countryIsoCode: string
  /** Optional: lock amount so user cannot change it. */
  freezeAmount?: boolean
  /** Optional: lock wallet so user cannot change it. */
  freezeWallet?: boolean
  /** Optional: default payment channel (bank, mobile_money, airtime). */
  paymentChannel?: PaymentChannel
  /** Optional: redirect after success/fail. Placeholders: {orderId}, {transactionHash}, {usdcAmount}, {status}, {failReason}. */
  redirectUrl?: string
  /** Optional: "Back to website" link on success. Placeholders: {orderId}, {transactionHash}, {usdcAmount}. */
  callbackUrl?: string
  /** Optional: user email prefill. */
  email?: string
  /** Optional: custom params sent to your webhook. */
  orderParams?: string
}

export interface OffRampParams {
  /** Amount in local currency (e.g. NGN) or in cUSD; see currency. */
  amount: number
  /** 'local' = amount is fiat; 'crypto' = amount is cUSD. */
  currency: 'local' | 'crypto'
  /** Country ISO code (e.g. NG, KE, GH). */
  countryIsoCode: string
  /** Optional: payment channel for payout. */
  paymentChannel?: PaymentChannel
  /** Optional: redirect after success/fail. */
  redirectUrl?: string
  /** Optional: user email. */
  email?: string
  /** Optional: custom params for webhook. */
  orderParams?: string
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue
    search.set(k, String(v))
  }
  const q = search.toString()
  return q ? `?${q}` : ''
}

/** Build on-ramp widget URL (local → cUSD on Celo). */
export function buildOnRampUrl(
  params: OnRampParams,
  source: string,
  signature: string,
  sandbox: boolean
): string {
  const base = sandbox ? SANDBOX_BASE : PROD_BASE
  const country = getCountryByCode(params.countryIsoCode)
  const query: Record<string, string | number | boolean | undefined> = {
    source,
    signature,
    network: FONBNK_CELO_CUSD.network,
    asset: FONBNK_CELO_CUSD.asset,
    address: params.address.trim(),
    amount: params.amount,
    currency: params.currency,
    countryIsoCode: params.countryIsoCode.toUpperCase(),
    ...(params.freezeAmount && { freezeAmount: true }),
    ...(params.freezeWallet && { freezeWallet: true }),
    redirectUrl: params.redirectUrl,
    callbackUrl: params.callbackUrl,
    email: params.email,
    orderParams: params.orderParams,
  }
  if (params.paymentChannel && country?.onRampChannels.includes(params.paymentChannel)) {
    query.paymentChannel = params.paymentChannel
  }
  return `${base}${buildQuery(query)}`
}

/** Build off-ramp widget URL (cUSD on Celo → local). */
export function buildOffRampUrl(
  params: OffRampParams,
  source: string,
  signature: string,
  sandbox: boolean
): string {
  const base = sandbox ? `${SANDBOX_BASE}/offramp` : `${PROD_BASE}/offramp`
  const country = getCountryByCode(params.countryIsoCode)
  const query: Record<string, string | number | boolean | undefined> = {
    source,
    signature,
    network: FONBNK_CELO_CUSD.network,
    asset: FONBNK_CELO_CUSD.asset,
    amount: params.amount,
    currency: params.currency,
    countryIsoCode: params.countryIsoCode.toUpperCase(),
    redirectUrl: params.redirectUrl,
    email: params.email,
    orderParams: params.orderParams,
  }
  if (params.paymentChannel && country?.offRampChannels.includes(params.paymentChannel)) {
    query.paymentChannel = params.paymentChannel
  }
  return `${base}${buildQuery(query)}`
}

export function isSandbox(): boolean {
  const v = process.env.FONBNK_SANDBOX?.toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}
