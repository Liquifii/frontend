/**
 * Fonbnk supported countries and payment channels for on-ramp / off-ramp.
 * @see https://docs.fonbnk.com/supported-countries-and-cryptocurrencies
 */

export type PaymentChannel = 'bank' | 'mobile_money' | 'airtime'

export interface FonbnkCountry {
  countryIsoCode: string
  currencyIsoCode: string
  name: string
  onRampChannels: PaymentChannel[]
  offRampChannels: PaymentChannel[]
}

/** Supported countries (Nigeria, Kenya, Ghana, and others from Fonbnk docs). */
export const FONBNK_COUNTRIES: FonbnkCountry[] = [
  { countryIsoCode: 'NG', currencyIsoCode: 'NGN', name: 'Nigeria', onRampChannels: ['bank'], offRampChannels: ['bank', 'airtime'] },
  { countryIsoCode: 'KE', currencyIsoCode: 'KES', name: 'Kenya', onRampChannels: ['mobile_money'], offRampChannels: ['mobile_money', 'airtime'] },
  { countryIsoCode: 'GH', currencyIsoCode: 'GHS', name: 'Ghana', onRampChannels: ['mobile_money'], offRampChannels: ['mobile_money', 'airtime'] },
  { countryIsoCode: 'ZA', currencyIsoCode: 'ZAR', name: 'South Africa', onRampChannels: ['bank'], offRampChannels: ['bank', 'airtime'] },
  { countryIsoCode: 'TZ', currencyIsoCode: 'TZS', name: 'Tanzania', onRampChannels: ['mobile_money'], offRampChannels: ['mobile_money', 'airtime'] },
  { countryIsoCode: 'UG', currencyIsoCode: 'UGX', name: 'Uganda', onRampChannels: ['mobile_money'], offRampChannels: ['mobile_money', 'airtime'] },
  { countryIsoCode: 'ZM', currencyIsoCode: 'ZMW', name: 'Zambia', onRampChannels: ['mobile_money'], offRampChannels: ['mobile_money', 'airtime'] },
  { countryIsoCode: 'RW', currencyIsoCode: 'RWF', name: 'Rwanda', onRampChannels: ['mobile_money'], offRampChannels: ['airtime'] },
  { countryIsoCode: 'BF', currencyIsoCode: 'XOF', name: 'Burkina Faso', onRampChannels: ['mobile_money'], offRampChannels: ['mobile_money', 'airtime'] },
  { countryIsoCode: 'SN', currencyIsoCode: 'XOF', name: 'Senegal', onRampChannels: ['mobile_money'], offRampChannels: ['mobile_money'] },
  { countryIsoCode: 'BJ', currencyIsoCode: 'XOF', name: 'Benin', onRampChannels: ['mobile_money'], offRampChannels: ['mobile_money', 'airtime'] },
  { countryIsoCode: 'CI', currencyIsoCode: 'XOF', name: 'Ivory Coast', onRampChannels: ['mobile_money'], offRampChannels: ['mobile_money', 'airtime'] },
  { countryIsoCode: 'CG', currencyIsoCode: 'XAF', name: 'Republic of the Congo', onRampChannels: ['mobile_money'], offRampChannels: ['mobile_money'] },
  { countryIsoCode: 'GA', currencyIsoCode: 'XAF', name: 'Gabon', onRampChannels: ['mobile_money'], offRampChannels: ['mobile_money'] },
  { countryIsoCode: 'CM', currencyIsoCode: 'XAF', name: 'Cameroon', onRampChannels: ['mobile_money'], offRampChannels: ['mobile_money', 'airtime'] },
  { countryIsoCode: 'MW', currencyIsoCode: 'MWK', name: 'Malawi', onRampChannels: [], offRampChannels: ['mobile_money'] },
  { countryIsoCode: 'BR', currencyIsoCode: 'BRL', name: 'Brazil', onRampChannels: ['bank'], offRampChannels: ['bank'] },
]

const CELO_NETWORK = 'CELO'
const CUSD_ASSET = 'CUSD'

export const FONBNK_CELO_CUSD = { network: CELO_NETWORK, asset: CUSD_ASSET } as const

export function getCountryByCode(countryIsoCode: string): FonbnkCountry | undefined {
  const code = countryIsoCode.toUpperCase().trim()
  return FONBNK_COUNTRIES.find((c) => c.countryIsoCode === code)
}

export function getCountriesForOnRamp(): FonbnkCountry[] {
  return FONBNK_COUNTRIES.filter((c) => c.onRampChannels.length > 0)
}

export function getCountriesForOffRamp(): FonbnkCountry[] {
  return FONBNK_COUNTRIES.filter((c) => c.offRampChannels.length > 0)
}
