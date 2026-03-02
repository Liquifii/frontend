'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Home, 
  Brain, 
  Settings, 
  Bell, 
  Eye, 
  ArrowRight
} from 'lucide-react'
import Navbar from '../../components/navbar'
import Link from 'next/link'
import sdk from '@farcaster/miniapp-sdk'
import { useQuery } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { useAccount } from 'wagmi'

export default function DashboardPage() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const { address } = useAccount()

  console.log("addy", address)

  const GET_DEPOSITS = gql`
    query GetDeposits($user: Bytes!) {
      depositeds(where: { user: $user }) {
        user
        shares
        blockTimestamp
        assets
        transactionHash
        id
      }
    }
  `

  const GET_WITHDRAWNS = gql`
    query GetWithdrawns($user: Bytes!) {
      withdrawns(where: { user: $user }) {
        user
        shares
        blockTimestamp
        assets
        transactionHash
        id
      }
    }
  `

  // Define types
  interface Deposited {
    user: string
    shares: string
    blockTimestamp: string
    assets: string
    transactionHash: string
    id: string
  }

  interface Withdrawn {
    user: string
    shares: string
    blockTimestamp: string
    assets: string
    transactionHash: string
    id: string
  }

  interface DepositedData {
    depositeds?: Deposited[]
  }

  interface WithdrawalData {
    withdrawns?: Withdrawn[]
  }

  const {
    data: depositedData,
    loading: depositedLoading,
    error: depositedError
  } = useQuery<DepositedData>(GET_DEPOSITS, {
    variables: { user: address?.toLowerCase() },
    skip: !address
  })

  const {
    data: withdrawalData,
    loading: withdrawalLoading,
    error: withdrawalError
  } = useQuery<WithdrawalData>(GET_WITHDRAWNS, {
    variables: { user: address?.toLowerCase() },
    skip: !address
  })

  useEffect(() => {
    const load = async () => {
      sdk.actions.ready();
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true)
      load()
    }
  }, [isSDKLoaded])

  const isLoading = depositedLoading || withdrawalLoading
  const hasError = depositedError || withdrawalError

  const transactions =
    address && depositedData && withdrawalData
      ? [
          ...(depositedData.depositeds ?? []).map((d) => ({
            type: 'Deposit',
            amount: `+${d.assets}`,
            date: new Date(Number(d.blockTimestamp) * 1000).toLocaleDateString(),
            status: 'Complete',
            statusColor: 'text-green-400',
            id: d.id
          })),
          ...(withdrawalData.withdrawns ?? []).map((w) => ({
            type: 'Withdrawal',
            amount: `-${w.assets}`,
            date: new Date(Number(w.blockTimestamp) * 1000).toLocaleDateString(),
            status: 'Complete',
            statusColor: 'text-green-400',
            id: w.id
          }))
        ].sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      : []
  return (
    <div style={{ backgroundColor: '#0E0E11', minHeight: '100vh' }}>
      <Navbar />

      <div className="flex">
        {/* Left Sidebar - Hidden on mobile */}
        <aside className="hidden lg:block w-64 border-r border-white/10 min-h-[calc(100vh-64px)] p-4" style={{ backgroundColor: '#0E0E11' }}>
          <nav className="space-y-4">
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-[#2BA3FF]/20 text-[#2BA3FF] rounded-lg font-medium">
              <Home className="w-5 h-5" />
              <span>Home</span>
            </a>
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
          {/* Dashboard Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Hi Docky</h2>
              <p className="text-white/60 text-sm sm:text-base">Start earning</p>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#2BA3FF] flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">D</span>
                </div>
              </div>
              <Link href="/deposit" className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-[#2BA3FF] text-white rounded-lg font-semibold hover:bg-[#1a8fdb] transition-colors">
                Deposit
              </Link>
              <Link href="/withdrawal" className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-white/20 text-white rounded-lg font-semibold hover:bg-white/10 transition-colors">
                Withdrawal
              </Link>
              <div className="relative">
                <Bell className="w-5 h-5 text-white" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">12</span>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Available Balance Card */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white/70 text-sm font-medium">Available Balance</h3>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-white/50" />
                  <ArrowRight className="w-4 h-4 text-white/50" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-2">$34</p>
              <p className="text-green-400 text-sm">+0.004516 cUSD earned</p>
            </div>

            {/* Current APY Card */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-6">
              <h3 className="text-white/70 text-sm font-medium mb-4">Current APY</h3>
              <p className="text-3xl font-bold text-white mb-2">3.50%</p>
              <p className="text-white/60 text-sm">Earning - $0.000096/Day</p>
            </div>

            {/* Total Earnings Card */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-6">
              <h3 className="text-white/70 text-sm font-medium mb-4">Total Earnings</h3>
              <p className="text-3xl font-bold text-white mb-2">0.004516</p>
              <p className="text-green-400 text-sm">+0.4495% Lifetime Return</p>
            </div>
          </div>

          {/* Transaction History and Balance - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Transaction History */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-6">
              <h3 className="text-white font-semibold mb-4">Transaction History</h3>
              <div className="overflow-x-auto">
                {isLoading ? (
                  <p className="text-white/70 text-sm px-4 py-3">
                    Loading transactions...
                  </p>
                ) : hasError ? (
                  <p className="text-red-400 text-sm px-4 py-3">
                    Failed to load transactions.
                  </p>
                ) : !address ? (
                  <p className="text-white/70 text-sm px-4 py-3">
                    Connect your wallet to see your transaction history.
                  </p>
                ) : transactions.length === 0 ? (
                  <p className="text-white/70 text-sm px-4 py-3">
                    No transactions found for this wallet.
                  </p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-white/70 text-sm font-medium py-3 px-4">
                          Type
                        </th>
                        <th className="text-left text-white/70 text-sm font-medium py-3 px-4">
                          Amount
                        </th>
                        <th className="text-left text-white/70 text-sm font-medium py-3 px-4">
                          Date
                        </th>
                        <th className="text-left text-white/70 text-sm font-medium py-3 px-4">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-b border-white/5"
                        >
                          <td className="text-white py-3 px-4">
                            {transaction.type}
                          </td>
                          <td className="text-white py-3 px-4">
                            {transaction.amount}
                          </td>
                          <td className="text-white/70 py-3 px-4">
                            {transaction.date}
                          </td>
                          <td
                            className={`py-3 px-4 ${transaction.statusColor}`}
                          >
                            {transaction.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Balance Chart */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-6">
              <h3 className="text-white font-semibold mb-4">Balance</h3>
              <div className="h-64 relative">
                <svg className="w-full h-full" viewBox="0 0 500 250" preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#2BA3FF" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#2BA3FF" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  
                  {/* Chart area with padding */}
                  <g transform="translate(50, 20)">
                    {/* Y-axis labels */}
                    {[
                      { value: 34.256, y: 0 },
                      { value: 34.123, y: 30 },
                      { value: 33.989, y: 60 },
                      { value: 33.817, y: 90 },
                      { value: 33.702, y: 120 },
                      { value: 33.648, y: 150 },
                      { value: 33.610, y: 180 },
                    ].map((item, index) => (
                      <text
                        key={index}
                        x="-40"
                        y={item.y + 5}
                        fill="rgba(255,255,255,0.5)"
                        fontSize="11"
                        textAnchor="end"
                      >
                        ${item.value.toFixed(3)}
                      </text>
                    ))}
                    
                    {/* X-axis labels */}
                    {[1, 2, 3, 4, 5, 6, 7].map((day, index) => {
                      const x = (index / 6) * 400;
                      return (
                        <text
                          key={day}
                          x={x}
                          y="200"
                          fill="rgba(255,255,255,0.5)"
                          fontSize="11"
                          textAnchor="middle"
                        >
                          Day {day}
                        </text>
                      );
                    })}
                    
                    {/* Chart data */}
                    {(() => {
                      const values = [33.610, 33.800, 33.950, 34.000, 34.100, 34.200, 34.256];
                      const min = 33.610;
                      const max = 34.256;
                      const range = max - min;
                      const chartHeight = 180;
                      
                      // Calculate Y positions (inverted because SVG Y increases downward)
                      const points = values.map((value, index) => ({
                        x: (index / 6) * 400,
                        y: chartHeight - ((value - min) / range) * chartHeight
                      }));
                      
                      // Create path for filled area
                      const areaPath = `M ${points[0].x},${points[0].y} 
                        ${points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')} 
                        L ${points[points.length - 1].x},${chartHeight} 
                        L ${points[0].x},${chartHeight} Z`;
                      
                      // Create path for line
                      const linePath = `M ${points[0].x},${points[0].y} 
                        ${points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')}`;
                      
                      return (
                        <g>
                          {/* Filled area */}
                          <path
                            d={areaPath}
                            fill="url(#chartGradient)"
                          />
                          
                          {/* Line */}
                          <path
                            d={linePath}
                            fill="none"
                            stroke="#2BA3FF"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          
                          {/* Data points */}
                          {points.map((point, index) => (
                            <circle
                              key={index}
                              cx={point.x}
                              cy={point.y}
                              r="4"
                              fill="#2BA3FF"
                              stroke="#141414"
                              strokeWidth="2"
                            />
                          ))}
                        </g>
                      );
                    })()}
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
