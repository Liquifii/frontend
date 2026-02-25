'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Home, 
  Brain, 
  Settings, 
  Eye, 
  ArrowRight,
  DollarSign,
  Coins
} from 'lucide-react'
import Navbar from '../../components/navbar'
import Link from 'next/link'
import sdk from '@farcaster/miniapp-sdk'

export default function DepositPage() {
  const [selectedTab, setSelectedTab] = useState<'fiat' | 'cusd'>('fiat')
  const [amount, setAmount] = useState('')
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [balanceHidden, setBalanceHidden] = useState(false)
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

  // Sample balance history data
  const balanceHistory = [
    { label: 'Balance', value: 34.256 },
    { label: 'Day 1', value: 34.123 },
    { label: 'Day 2', value: 33.989 },
    { label: 'Day 3', value: 33.817 },
    { label: 'Day 5', value: 33.702 },
    { label: 'Day 6', value: 33.648 },
    { label: 'Day 7', value: 33.610 },
  ]

  // Chart dimensions - enlarged to match Figma
  const chartWidth = 800
  const chartHeight = 300
  const padding = 40
  const chartInnerWidth = chartWidth - padding * 2
  const chartInnerHeight = chartHeight - padding * 2

  // Calculate chart points
  const maxValue = Math.max(...balanceHistory.map(b => b.value))
  const minValue = Math.min(...balanceHistory.map(b => b.value))
  const valueRange = maxValue - minValue || 1

  const points = balanceHistory.map((item, index) => {
    const x = padding + (index / (balanceHistory.length - 1)) * chartInnerWidth
    const y = padding + chartInnerHeight - ((item.value - minValue) / valueRange) * chartInnerHeight
    return { x, y, value: item.value }
  })

  // Create path for area chart
  const areaPath = `M ${points[0].x} ${chartHeight - padding} ${points.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${points[points.length - 1].x} ${chartHeight - padding} Z`
  const linePath = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`

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
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8">Deposit</h1>

            {/* Combined Container */}
            <div 
              className="rounded-lg p-4 sm:p-6 lg:p-8 border border-white/10"
              style={{
                background: 'linear-gradient(0deg, #0F0F15, #0F0F15), linear-gradient(287.08deg, #050505 -19.77%, rgba(13, 13, 13, 0.1) 69.7%)'
              }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
                {/* Deposit Form - Takes 2/5 of width */}
                <div className="lg:col-span-2">
                  {/* Tabs */}
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setSelectedTab('fiat')}
                      className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-colors ${
                        selectedTab === 'fiat'
                          ? 'bg-[#2BA3FF] text-white border border-[#2BA3FF]'
                          : 'bg-white/5 text-white/70 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                      Fiat
                    </button>
                    <button
                      onClick={() => setSelectedTab('cusd')}
                      className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-colors ${
                        selectedTab === 'cusd'
                          ? 'bg-[#2BA3FF] text-white border border-[#2BA3FF]'
                          : 'bg-white/5 text-white/70 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      cUSD
                    </button>
                  </div>

                  {/* Amount Input */}
                  <div className="mb-6">
                    <label className="block text-white/70 text-sm mb-2">Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-lg">
                        {selectedTab === 'fiat' ? '₦' : '$'}
                      </span>
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={selectedTab === 'fiat' ? 'Enter amount in NGN' : 'Enter amount in USD'}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#2BA3FF] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Deposit Range */}
                  <div className="mb-6">
                    <p className="text-white/60 text-sm">
                      Deposit Range: <span className="text-white">
                        {selectedTab === 'fiat' 
                          ? 'Min: ₦1,000 | Max: ₦5,000,000'
                          : 'Min: $1 | Max: $100,000'
                        }
                      </span>
                    </p>
                  </div>

                  {/* Proceed Button */}
                  <button className="w-full py-3 bg-[#2BA3FF] text-white rounded-lg font-semibold hover:bg-[#1a8fdb] transition-colors">
                    Proceed
                  </button>
                </div>

                {/* Available Balance Section - Takes 3/5 of width */}
                {balanceVisible && (
                  <div className="lg:col-span-3">
                    {/* Available Balance Header - Solid background, no gradient */}
                    <div 
                      className="rounded-lg p-6 border border-white/10 mb-6"
                      style={{ backgroundColor: '#1a1a1d' }}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-white font-semibold text-lg">Available Balance</h3>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setBalanceHidden(!balanceHidden)}
                            className="p-1.5 hover:bg-white/5 rounded transition-colors"
                          >
                            <Eye className="w-5 h-5 text-white/70" />
                          </button>
                          <button
                            className="p-1.5 hover:bg-white/5 rounded transition-colors"
                          >
                            <ArrowRight className="w-5 h-5 text-white/70" />
                          </button>
                        </div>
                      </div>

                      {/* Current Balance - Can be hidden */}
                      <div>
                        {balanceHidden ? (
                          <p className="text-4xl font-bold text-white">••••</p>
                        ) : (
                          <p className="text-4xl font-bold text-white">$34</p>
                        )}
                      </div>
                    </div>

                    {/* Balance Chart - Full Width, inherits gradient from parent */}
                    <div>
                      <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet" className="w-full">
                        {/* Y-axis labels on the left - hidden when balance is hidden */}
                        {!balanceHidden && balanceHistory.map((item, index) => {
                          const y = padding + (index / (balanceHistory.length - 1)) * chartInnerHeight
                          return (
                            <text
                              key={`y-axis-${index}`}
                              x={10}
                              y={y + 4}
                              textAnchor="start"
                              className="text-xs fill-white/70"
                              fontSize="12"
                            >
                              ${item.value.toFixed(3)}
                            </text>
                          )
                        })}
                        
                        {/* Area fill */}
                        <path
                          d={areaPath}
                          fill="url(#balanceGradient)"
                          opacity={0.3}
                        />
                        {/* Line */}
                        <path
                          d={linePath}
                          fill="none"
                          stroke="#2BA3FF"
                          strokeWidth="2.5"
                        />
                        {/* Data points */}
                        {points.map((point, index) => (
                          <circle
                            key={index}
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill="#2BA3FF"
                            stroke="#0E0E11"
                            strokeWidth="1.5"
                          />
                        ))}
                        {/* Gradient definition */}
                        <defs>
                          <linearGradient id="balanceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#2BA3FF" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="#2BA3FF" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        {/* X-axis labels - at the bottom */}
                        {balanceHistory.map((item, index) => {
                          const x = padding + (index / (balanceHistory.length - 1)) * chartInnerWidth
                          return (
                            <text
                              key={index}
                              x={x}
                              y={chartHeight - 10}
                              textAnchor="middle"
                              className="text-xs fill-white/70"
                              fontSize="13"
                              fontWeight="500"
                            >
                              {item.label}
                            </text>
                          )
                        })}
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

