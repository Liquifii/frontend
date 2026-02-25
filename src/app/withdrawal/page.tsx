'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Home, 
  Brain, 
  Settings, 
  Check,
  ChevronDown,
  DollarSign,
  Coins
} from 'lucide-react'
import Navbar from '../../components/navbar'
import Link from 'next/link'
import sdk from '@farcaster/miniapp-sdk'

export default function WithdrawalPage() {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'cusd' | 'ngn'>('cusd')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      sdk.actions.ready();
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  return (
    <div style={{ backgroundColor: '#0E0E11', minHeight: '100vh' }}>
      <Navbar />

      <div className="flex">
        {/* Left Sidebar - Hidden on mobile */}
        <aside className="hidden lg:block w-64 border-r border-white/10 min-h-[calc(100vh-64px)] p-4" style={{ backgroundColor: '#0E0E11' }}>
          <nav className="space-y-4">
            <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <Home className="w-5 h-5" />
              <span>Home</span>
            </Link>
            <Link href="/ai-assistant" className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <Brain className="w-5 h-5" />
              <span>AI Assistant</span>
            </Link>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
              <span>Strategy</span>
            </a>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6" style={{ backgroundColor: '#0E0E11' }}>
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8">Withdrawal</h1>

            {/* Main Container */}
            <div 
              className="rounded-lg p-4 sm:p-6 lg:p-8 border border-white/10"
              style={{
                background: 'linear-gradient(0deg, #0F0F15, #0F0F15), linear-gradient(287.08deg, #050505 -19.77%, rgba(13, 13, 13, 0.1) 69.7%)'
              }}
            >
              {/* Available Balance */}
              <div className="mb-8">
                <h2 className="text-white/70 text-sm mb-2">Available Balance</h2>
                <p className="text-4xl font-bold text-white">$34</p>
              </div>

              {/* Currency Dropdown */}
              <div className="mb-6">
                <label className="block text-white/70 text-sm mb-2">Currency</label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {currency === 'cusd' ? (
                        <>
                          <DollarSign className="w-4 h-4" />
                          <span>cUSD</span>
                        </>
                      ) : (
                        <>
                          <span className="text-lg">₦</span>
                          <span>NGN</span>
                        </>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {dropdownOpen && (
                    <div className="absolute z-10 w-full mt-2 bg-[#1a1a1d] border border-white/10 rounded-lg overflow-hidden">
                      <button
                        onClick={() => {
                          setCurrency('cusd')
                          setDropdownOpen(false)
                        }}
                        className={`w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/5 transition-colors ${
                          currency === 'cusd' ? 'bg-[#2BA3FF]/20 text-[#2BA3FF]' : 'text-white'
                        }`}
                      >
                        <DollarSign className="w-4 h-4" />
                        <span>cUSD</span>
                      </button>
                      <button
                        onClick={() => {
                          setCurrency('ngn')
                          setDropdownOpen(false)
                        }}
                        className={`w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/5 transition-colors ${
                          currency === 'ngn' ? 'bg-[#2BA3FF]/20 text-[#2BA3FF]' : 'text-white'
                        }`}
                      >
                        <span className="text-lg">₦</span>
                        <span>NGN</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-white/70 text-sm mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-lg">
                    {currency === 'cusd' ? '$' : '₦'}
                  </span>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={currency === 'cusd' ? 'Enter amount in cUSD' : 'Enter amount in NGN'}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#2BA3FF] transition-colors"
                  />
                </div>
              </div>

              {/* Withdrawal Range */}
              <div className="mb-6">
                <p className="text-white/60 text-sm">
                  Min: <span className="text-white">
                    {currency === 'cusd' ? '$1' : '₦1,000'}
                  </span> | Max: <span className="text-white">
                    {currency === 'cusd' ? '$100,000' : '₦5,000,000'}
                  </span>
                </p>
              </div>

              {/* Withdrawal Details */}
              <div className="mb-6 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border-2 border-[#2BA3FF] bg-[#2BA3FF] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-white text-sm">Gas Fee: 0%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border-2 border-[#2BA3FF] bg-[#2BA3FF] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-white text-sm">Arrival time: Instant</span>
                </div>
              </div>

              {/* Withdraw Button */}
              <button className="w-full py-3 bg-[#2BA3FF] text-white rounded-lg font-semibold hover:bg-[#1a8fdb] transition-colors">
                Withdraw {currency === 'cusd' ? 'cUSD' : 'NGN'}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

