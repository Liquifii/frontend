'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Loader2,
  AlertCircle,
  Globe,
  CreditCard,
  ArrowRight,
  ChevronDown,
} from 'lucide-react'
import { useAccount, useReadContract } from 'wagmi'
import { formatUnits, parseUnits, type Address } from 'viem'
import { AttestifyVaultContract } from '../app/abi'

type Country = {
  countryIsoCode: string
  currencyIsoCode: string
  name: string
  onRampChannels: ('bank' | 'mobile_money' | 'airtime')[]
  offRampChannels: ('bank' | 'mobile_money' | 'airtime')[]
}

type PaymentChannel = 'bank' | 'mobile_money' | 'airtime'

export default function OffRampForm() {
  const { address, isConnected } = useAccount()
  const [countries, setCountries] = useState<Country[]>([])
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [paymentChannel, setPaymentChannel] = useState<PaymentChannel | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false)
  const countryDropdownRef = useRef<HTMLDivElement>(null)

  // Read user's vault balance (how much they can withdraw)
  const { data: vaultBalance } = useReadContract({
    address: AttestifyVaultContract.address as Address,
    abi: AttestifyVaultContract.AttestifyVault,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000,
    },
  })

  // Fetch supported countries for off-ramp
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoadingCountries(true)
        const res = await fetch('/api/fonbnk/countries?flow=offramp')
        if (!res.ok) {
          throw new Error('Failed to fetch countries')
        }
        const data = await res.json()
        setCountries(data.countries || [])
        // Auto-select first country if available
        if (data.countries && data.countries.length > 0) {
          setSelectedCountry(data.countries[0].countryIsoCode)
          // Auto-select first payment channel if available
          if (data.countries[0].offRampChannels.length > 0) {
            setPaymentChannel(data.countries[0].offRampChannels[0])
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load countries')
      } finally {
        setLoadingCountries(false)
      }
    }
    fetchCountries()
  }, [])

  // Update payment channel when country changes
  useEffect(() => {
    if (selectedCountry) {
      const country = countries.find((c) => c.countryIsoCode === selectedCountry)
      if (country && country.offRampChannels.length > 0) {
        // Set first available channel, or keep current if still available
        if (!country.offRampChannels.includes(paymentChannel as PaymentChannel)) {
          setPaymentChannel(country.offRampChannels[0])
        }
      } else {
        setPaymentChannel('')
      }
    }
  }, [selectedCountry, countries])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setCountryDropdownOpen(false)
      }
    }

    if (countryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [countryDropdownOpen])

  const selectedCountryData = countries.find((c) => c.countryIsoCode === selectedCountry)

  // Format balance for display
  const formatBalance = (value: bigint | undefined) => {
    if (value === undefined || value === null) return '0.00'
    try {
      const formatted = formatUnits(value, 18)
      const num = parseFloat(formatted)
      if (num >= 1000) {
        return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      } else if (num >= 1) {
        return num.toFixed(4).replace(/\.?0+$/, '')
      } else {
        return num.toFixed(4).replace(/\.?0+$/, '')
      }
    } catch {
      return '0.00'
    }
  }

  const handleCashOut = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first')
      return
    }

    if (!selectedCountry) {
      setError('Please select a country')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    // Check if user has sufficient vault balance
    if (vaultBalance !== undefined && vaultBalance !== null && typeof vaultBalance === 'bigint') {
      try {
        const amountWei = parseUnits(amount, 18)
        if (vaultBalance < amountWei) {
          setError(`Insufficient vault balance. You have ${formatBalance(vaultBalance)} USDm in the vault`)
          return
        }
      } catch (err) {
        setError('Invalid amount format')
        return
      }
    }

    if (!paymentChannel && selectedCountryData?.offRampChannels.length) {
      setError('Please select a payment method')
      return
    }

    try {
      setLoading(true)
      setError('')

      const redirectUrl = `${window.location.origin}/fonbnk/success?orderId={orderId}&status={status}&type=offramp`

      const res = await fetch('/api/fonbnk/offramp-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency: 'crypto', // Amount is in cUSD
          countryIsoCode: selectedCountry,
          paymentChannel: paymentChannel || undefined,
          redirectUrl: redirectUrl,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      if (!data.url) {
        throw new Error('No URL returned from server')
      }

      // Redirect to Fonbnk widget
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cash out link')
      setLoading(false)
    }
  }

  if (loadingCountries) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#2BA3FF]" />
        <span className="ml-2 text-white/70">Loading countries...</span>
      </div>
    )
  }

  if (countries.length === 0) {
    return (
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-yellow-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          No countries available. Please try again later.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Country Selector */}
      <div className="relative" ref={countryDropdownRef}>
        <label className="block text-white/70 text-sm mb-2 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Country
        </label>
        <button
          type="button"
          onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
          disabled={loading || countries.length === 0}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#2BA3FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between hover:bg-white/10"
        >
          <span>
            {selectedCountry
              ? `${countries.find((c) => c.countryIsoCode === selectedCountry)?.name || ''} (${countries.find((c) => c.countryIsoCode === selectedCountry)?.currencyIsoCode || ''})`
              : 'Select a country'}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${countryDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {/* Custom Dropdown */}
        {countryDropdownOpen && (
          <div className="absolute z-50 w-full mt-1 bg-[#1a1a1d] border border-white/10 rounded-lg shadow-xl max-h-60 overflow-auto">
            {countries.map((country) => (
              <button
                key={country.countryIsoCode}
                type="button"
                onClick={() => {
                  setSelectedCountry(country.countryIsoCode)
                  setCountryDropdownOpen(false)
                  setError('')
                }}
                className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center justify-between ${
                  selectedCountry === country.countryIsoCode
                    ? 'bg-[#2BA3FF]/20 text-white'
                    : 'text-white/90'
                }`}
              >
                <span>
                  {country.name} ({country.currencyIsoCode})
                </span>
                {selectedCountry === country.countryIsoCode && (
                  <div className="w-2 h-2 bg-[#2BA3FF] rounded-full" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Payment Method Selector */}
      {selectedCountryData && selectedCountryData.offRampChannels.length > 0 && (
        <div>
          <label className="block text-white/70 text-sm mb-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Payment Method
          </label>
          <div className="flex gap-2 flex-wrap">
            {selectedCountryData.offRampChannels.map((channel) => (
              <button
                key={channel}
                type="button"
                onClick={() => {
                  setPaymentChannel(channel)
                  setError('')
                }}
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  paymentChannel === channel
                    ? 'bg-[#2BA3FF] text-white border border-[#2BA3FF]'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                }`}
              >
                {channel === 'bank'
                  ? 'Bank Transfer'
                  : channel === 'mobile_money'
                  ? 'Mobile Money'
                  : 'Airtime'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Amount Input */}
      <div>
        <label className="block text-white/70 text-sm mb-2">Amount (USDm)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-lg">
            $
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => {
              const value = e.target.value
              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                setAmount(value)
                setError('')
              }
            }}
            placeholder="Enter amount in USDm"
            disabled={loading || !selectedCountry}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#2BA3FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        {selectedCountryData && (
          <p className="text-xs text-white/50 mt-1">
            You'll receive {selectedCountryData.currencyIsoCode} in your {paymentChannel === 'bank' ? 'bank account' : paymentChannel === 'mobile_money' ? 'mobile money account' : 'airtime'} after payment
          </p>
        )}
        {isConnected && vaultBalance !== undefined && vaultBalance !== null && typeof vaultBalance === 'bigint' && (
          <div className="mt-1">
            <p className="text-xs text-white/50">
              Available in vault: {formatBalance(vaultBalance)} USDm
            </p>
            {amount && parseFloat(amount) > 0 && (() => {
              try {
                const amountWei = parseUnits(amount, 18)
                if (vaultBalance < amountWei) {
                  return (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Insufficient vault balance. You have {formatBalance(vaultBalance)} USDm in the vault, but trying to cash out {amount} USDm.
                    </p>
                  )
                }
              } catch {}
              return null
            })()}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Connection Status */}
      {!isConnected && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <p className="text-yellow-400 text-sm">Please connect your wallet to cash out</p>
        </div>
      )}

      {/* Cash Out Button */}
      <button
        onClick={handleCashOut}
        disabled={
          !isConnected ||
          !selectedCountry ||
          !amount ||
          parseFloat(amount) <= 0 ||
          loading ||
          (selectedCountryData?.offRampChannels.length && !paymentChannel) ||
          (vaultBalance !== undefined && vaultBalance !== null && typeof vaultBalance === 'bigint' && (() => {
            try {
              const amountWei = parseUnits(amount || '0', 18)
              return vaultBalance < amountWei
            } catch {
              return true
            }
          })())
        }
        className="w-full py-3 bg-[#2BA3FF] text-white rounded-lg font-semibold hover:bg-[#1a8fdb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating cash out link...
          </>
        ) : (
          <>
            Cash out to {selectedCountryData?.currencyIsoCode || 'local currency'}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Info Message */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-blue-400 text-xs">
          💡 You'll be redirected to Fonbnk to complete the cash out. After sending USDm, you'll receive {selectedCountryData?.currencyIsoCode || 'local currency'} in your {paymentChannel === 'bank' ? 'bank account' : paymentChannel === 'mobile_money' ? 'mobile money account' : 'account'}.
        </p>
      </div>
    </div>
  )
}
