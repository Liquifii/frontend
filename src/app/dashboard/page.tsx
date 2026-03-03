'use client'
import { useState, useEffect, useMemo } from 'react'
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
import { useAccount, useReadContract } from 'wagmi'
import { formatUnits, type Address } from 'viem'
import { AttestifyVaultContract, StrategyContract, CUSD_ADDRESS } from '../abi'

export default function DashboardPage() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  // Get connected wallet address from Farcaster
  // Note: Farcaster connector provides the Farcaster wallet address
  const { address, isConnected } = useAccount()

  // ERC20 ABI for reading wallet balance
  const ERC20_ABI = [
    {
      inputs: [{ name: 'account', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  ] as const

  // Read user's wallet cUSD balance
  const { 
    data: walletBalance,
    isLoading: isLoadingWalletBalance,
    error: walletBalanceError,
    refetch: refetchWalletBalance
  } = useReadContract({
    address: CUSD_ADDRESS as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      retry: 2,
    },
  })


  // Read user's vault balance
  const { 
    data: userVaultBalance, 
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchVaultBalance
  } = useReadContract({
    address: AttestifyVaultContract.address as Address,
    abi: AttestifyVaultContract.AttestifyVault,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      retry: 2,
      // Auto-refetch every 10 seconds to keep balances updated
      refetchInterval: 10000,
    },
  })

  // Read total vault assets
  const { 
    data: totalAssets,
    isLoading: isLoadingTotalAssets,
    error: totalAssetsError,
    refetch: refetchTotalAssets
  } = useReadContract({
    address: AttestifyVaultContract.address as Address,
    abi: AttestifyVaultContract.AttestifyVault,
    functionName: 'totalAssets',
    query: {
      enabled: isConnected,
      retry: 2,
      refetchInterval: 10000,
    },
  })

  // Read strategy APY
  const { 
    data: apyBasisPoints,
    isLoading: isLoadingAPY,
    error: apyError,
    refetch: refetchAPY
  } = useReadContract({
    address: StrategyContract.address as Address,
    abi: StrategyContract.Strategy,
    functionName: 'getCurrentAPY',
    query: {
      enabled: isConnected && !!StrategyContract.address,
      retry: 2,
      refetchInterval: 30000, // APY changes less frequently, refresh every 30 seconds
    },
  })


  // Calculate APY percentage (basis points / 100)
  const apyPercent = apyBasisPoints ? Number(apyBasisPoints) / 100 : null

  // Calculate daily earnings (approximate)
  const dailyEarnings = userVaultBalance !== undefined && userVaultBalance !== null && typeof userVaultBalance === 'bigint' && apyPercent
    ? (Number(formatUnits(userVaultBalance, 18)) * apyPercent / 100) / 365
    : null

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
    variables: { user: address?.toLowerCase() as string },
    skip: !address,
    fetchPolicy: 'cache-and-network', // Always fetch fresh data
  })

  const {
    data: withdrawalData,
    loading: withdrawalLoading,
    error: withdrawalError
  } = useQuery<WithdrawalData>(GET_WITHDRAWNS, {
    variables: { user: address?.toLowerCase() as string },
    skip: !address,
    fetchPolicy: 'cache-and-network', // Always fetch fresh data
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

  // Build transactions array - handle cases where data might be undefined
  const transactions = useMemo(() => {
    if (!address) return []
    
    const deposits = depositedData?.depositeds ?? []
    const withdrawals = withdrawalData?.withdrawns ?? []
    
    const allTransactions = [
      ...deposits.map((d) => ({
        type: 'Deposit',
        amount: `+${formatUnits(BigInt(d.assets), 18)}`,
        date: new Date(Number(d.blockTimestamp) * 1000).toLocaleDateString(),
        status: 'Complete',
        statusColor: 'text-green-400',
        id: d.id,
        timestamp: Number(d.blockTimestamp),
        assets: BigInt(d.assets),
      })),
      ...withdrawals.map((w) => ({
        type: 'Withdrawal',
        amount: `-${formatUnits(BigInt(w.assets), 18)}`,
        date: new Date(Number(w.blockTimestamp) * 1000).toLocaleDateString(),
        status: 'Complete',
        statusColor: 'text-green-400',
        id: w.id,
        timestamp: Number(w.blockTimestamp),
        assets: BigInt(w.assets),
      }))
    ]
    
    return allTransactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [address, depositedData, withdrawalData])

  // Calculate balance history for chart
  const balanceHistory = useMemo(() => {
    // If user has a balance but no transactions, show just the current balance
    if (!transactions.length && userVaultBalance !== undefined && userVaultBalance !== null && typeof userVaultBalance === 'bigint' && userVaultBalance > BigInt(0)) {
      return [{
        label: 'Now',
        value: parseFloat(formatUnits(userVaultBalance, 18)),
        date: new Date(),
      }]
    }

    // If no transactions or no balance, return empty
    if (!transactions.length || !userVaultBalance) {
      return []
    }

    // Sort transactions chronologically
    const sortedTxs = [...transactions].sort((a, b) => a.timestamp - b.timestamp)
    
    // Calculate running balance
    let runningBalance = BigInt(0)
    const history = sortedTxs.map((tx) => {
      if (tx.type === 'Deposit') {
        runningBalance += tx.assets
      } else {
        runningBalance -= tx.assets
      }
      
      const daysAgo = Math.floor((Date.now() - tx.timestamp * 1000) / (1000 * 60 * 60 * 24))
      const label = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`
      
      return {
        label,
        value: parseFloat(formatUnits(runningBalance, 18)),
        date: new Date(tx.timestamp * 1000),
      }
    })

    // Add current balance as the last point
    if (userVaultBalance !== undefined && userVaultBalance !== null && typeof userVaultBalance === 'bigint' && userVaultBalance > BigInt(0)) {
      const currentBalanceValue = parseFloat(formatUnits(userVaultBalance, 18))
      // Only add if it's different from the last calculated balance (to avoid duplicate points)
      const lastHistoryValue = history.length > 0 ? history[history.length - 1].value : 0
      if (Math.abs(currentBalanceValue - lastHistoryValue) > 0.0001) {
        history.push({
          label: 'Now',
          value: currentBalanceValue,
          date: new Date(),
        })
      }
    }

    return history.slice(-7) // Last 7 points
  }, [transactions, userVaultBalance])
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
              {!isConnected && (
                <p className="text-yellow-400 text-xs mt-1">⚠️ Wallet not connected</p>
              )}
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
                <h3 className="text-white/70 text-sm font-medium">Vault Balance</h3>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-white/50" />
                  <ArrowRight className="w-4 h-4 text-white/50" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {isLoadingBalance
                  ? 'Loading...'
                  : userVaultBalance !== undefined && userVaultBalance !== null && typeof userVaultBalance === 'bigint'
                  ? `$${parseFloat(formatUnits(userVaultBalance, 18)).toFixed(2)}`
                  : isConnected
                  ? '$0.00'
                  : '$0.00'}
              </p>
              <p className="text-green-400 text-sm">
                {isLoadingBalance
                  ? 'Calculating...'
                  : dailyEarnings !== null
                  ? `+${dailyEarnings.toFixed(6)} cUSD/day`
                  : isConnected
                  ? '$0.00/day'
                  : 'Connect wallet to see earnings'}
              </p>
              {isConnected && (
                <p className="text-white/50 text-xs mt-2">
                  Wallet: {isLoadingWalletBalance 
                    ? 'Loading...' 
                    : walletBalance !== undefined && walletBalance !== null && typeof walletBalance === 'bigint'
                    ? `${formatUnits(walletBalance, 18)} cUSD`
                    : '0.00 cUSD'}
                </p>
              )}
            </div>

            {/* Current APY Card */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-6">
              <h3 className="text-white/70 text-sm font-medium mb-4">Current APY</h3>
              <p className="text-3xl font-bold text-white mb-2">
                {isLoadingAPY
                  ? 'Loading...'
                  : apyPercent !== null
                  ? `${apyPercent.toFixed(2)}%`
                  : isConnected
                  ? '0.00%'
                  : '0.00%'}
              </p>
              <p className="text-white/60 text-sm">
                {isLoadingAPY || isLoadingBalance
                  ? 'Calculating...'
                  : dailyEarnings !== null
                  ? `Earning - $${dailyEarnings.toFixed(6)}/Day`
                  : isConnected
                  ? '$0.00/Day'
                  : 'Connect wallet'}
              </p>
            </div>

            {/* Total Earnings Card */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-6">
              <h3 className="text-white/70 text-sm font-medium mb-4">Total Earnings</h3>
              <p className="text-3xl font-bold text-white mb-2">
                {isLoadingBalance || isLoadingTotalAssets
                  ? 'Loading...'
                  : userVaultBalance !== undefined && userVaultBalance !== null && typeof userVaultBalance === 'bigint'
                  ? (() => {
                      const userBalance = Number(formatUnits(userVaultBalance, 18))
                      return userBalance > 0 ? userBalance.toFixed(6) : '0.000000'
                    })()
                  : isConnected
                  ? '0.000000'
                  : '0.000000'}
              </p>
              <p className="text-green-400 text-sm">
                {isLoadingAPY
                  ? 'Calculating...'
                  : apyPercent !== null
                  ? `Current APY: ${apyPercent.toFixed(2)}%`
                  : isConnected
                  ? 'APY: 0.00%'
                  : 'Connect wallet'}
              </p>
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
                {balanceHistory.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-white/40">
                    {isLoading ? (
                      <span>Loading balance history...</span>
                    ) : !address ? (
                      <span>Connect wallet to see balance chart</span>
                    ) : (
                      <span>No balance history yet</span>
                    )}
                  </div>
                ) : (
                  <svg className="w-full h-full" viewBox="0 0 500 250" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#2BA3FF" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#2BA3FF" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    
                    {/* Chart area with padding */}
                    <g transform="translate(50, 20)">
                      {(() => {
                        const values = balanceHistory.map(h => h.value)
                        const min = Math.min(...values)
                        const max = Math.max(...values)
                        // For single point or when min === max, create a range around the value
                        const range = max - min || Math.max(max, 1) * 0.1 || 1
                        const chartHeight = 180
                        const chartWidth = 400
                        
                        // Calculate Y positions (inverted because SVG Y increases downward)
                        // For single point, center it vertically
                        const points = values.map((value, index) => ({
                          x: balanceHistory.length > 1 ? (index / (balanceHistory.length - 1)) * chartWidth : chartWidth / 2,
                          y: balanceHistory.length === 1 
                            ? chartHeight / 2 // Center single point
                            : chartHeight - ((value - min) / range) * chartHeight
                        }))
                        
                        // Create path for filled area
                        const areaPath = points.length > 0
                          ? points.length === 1
                            ? `M ${points[0].x},${points[0].y} L ${points[0].x},${chartHeight} L ${points[0].x},${chartHeight} Z`
                            : `M ${points[0].x},${points[0].y} 
                              ${points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')} 
                              L ${points[points.length - 1].x},${chartHeight} 
                              L ${points[0].x},${chartHeight} Z`
                          : ''
                        
                        // Create path for line
                        const linePath = points.length > 0
                          ? points.length === 1
                            ? `M ${points[0].x},${points[0].y} L ${points[0].x},${points[0].y}`
                            : `M ${points[0].x},${points[0].y} 
                              ${points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')}`
                          : ''
                        
                        return (
                          <g>
                            {/* Y-axis labels */}
                            {balanceHistory.map((item, index) => {
                              const y = balanceHistory.length > 1 
                                ? (index / (balanceHistory.length - 1)) * chartHeight
                                : chartHeight / 2 // Center for single point
                              return (
                                <text
                                  key={index}
                                  x="-40"
                                  y={y + 5}
                                  fill="rgba(255,255,255,0.5)"
                                  fontSize="11"
                                  textAnchor="end"
                                >
                                  ${item.value.toFixed(2)}
                                </text>
                              )
                            })}
                            
                            {/* Filled area */}
                            {areaPath && (
                              <path
                                d={areaPath}
                                fill="url(#chartGradient)"
                              />
                            )}
                            
                            {/* Line */}
                            {linePath && (
                              <path
                                d={linePath}
                                fill="none"
                                stroke="#2BA3FF"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}
                            
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
                            
                            {/* X-axis labels */}
                            {balanceHistory.map((item, index) => {
                              const x = balanceHistory.length > 1
                                ? (index / (balanceHistory.length - 1)) * chartWidth
                                : chartWidth / 2
                              return (
                                <text
                                  key={index}
                                  x={x}
                                  y="200"
                                  fill="rgba(255,255,255,0.5)"
                                  fontSize="11"
                                  textAnchor="middle"
                                >
                                  {item.label}
                                </text>
                              )
                            })}
                          </g>
                        )
                      })()}
                    </g>
                  </svg>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
