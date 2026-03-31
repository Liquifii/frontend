'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Brain,
  Bell,
  Eye,
  ArrowRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import sdk from '@farcaster/miniapp-sdk'
import { useQuery } from '@apollo/client/react'
import { gql } from '@apollo/client'
import { useAccount, useReadContract, useEnsName } from 'wagmi'
import { formatUnits, type Address } from 'viem'
import { AttestifyVaultContract, StrategyContract, CUSD_ADDRESS } from '../abi'
import YieldAnimation from '../../components/yield-animation'

export default function DashboardPage() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; value: number; label: string; date: Date } | null>(null)
  const [farcasterUsername, setFarcasterUsername] = useState<string | null>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [lastSeenTxTimestamp, setLastSeenTxTimestamp] = useState<number>(0)
  const notificationsRef = useRef<HTMLDivElement>(null)
  // Get connected wallet address from Farcaster
  // Note: Farcaster connector provides the Farcaster wallet address
  const { address, isConnected } = useAccount()
  
  // Get ENS name for the connected address
  const { data: ensName } = useEnsName({
    address: address,
    query: {
      enabled: !!address && isConnected,
    },
  })
  
  // Format display name: ENS name if available, otherwise shortened address
  const displayName = useMemo(() => {
    if (!address) return 'Guest'
    if (farcasterUsername) return `@${farcasterUsername}`
    if (ensName) return ensName
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }, [address, ensName, farcasterUsername])

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

  // Read user's wallet USDm balance
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

  useEffect(() => {
    let cancelled = false

    const loadMiniAppUser = async () => {
      try {
        const context = await sdk.context
        const username = context?.user?.username
        if (!cancelled && username) {
          setFarcasterUsername(username)
        }
      } catch {
        // Ignore when not in mini-app context
      }
    }

    loadMiniAppUser()
    return () => {
      cancelled = true
    }
  }, [])

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
        transactionHash: d.transactionHash,
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
        transactionHash: w.transactionHash,
      }))
    ]
    
    return allTransactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [address, depositedData, withdrawalData])

  const notifications = useMemo(() => transactions.slice(0, 8), [transactions])

  const groupedNotifications = useMemo(() => {
    const today: typeof notifications = []
    const yesterday: typeof notifications = []
    const earlier: typeof notifications = []

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000

    notifications.forEach((tx) => {
      const txTime = tx.timestamp * 1000
      if (txTime >= startOfToday) {
        today.push(tx)
      } else if (txTime >= startOfYesterday) {
        yesterday.push(tx)
      } else {
        earlier.push(tx)
      }
    })

    return { today, yesterday, earlier }
  }, [notifications])

  const unreadCount = useMemo(() => {
    if (!lastSeenTxTimestamp) return notifications.length
    return notifications.filter((tx) => tx.timestamp > lastSeenTxTimestamp).length
  }, [notifications, lastSeenTxTimestamp])

  useEffect(() => {
    if (!address) {
      setLastSeenTxTimestamp(0)
      return
    }

    const key = `dashboard:lastSeenTx:${address.toLowerCase()}`
    const stored = window.localStorage.getItem(key)
    const parsed = stored ? Number(stored) : 0
    setLastSeenTxTimestamp(Number.isFinite(parsed) ? parsed : 0)
  }, [address])

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleToggleNotifications = () => {
    const nextOpen = !notificationsOpen
    setNotificationsOpen(nextOpen)

    if (nextOpen && address && notifications.length > 0) {
      const newestTimestamp = notifications[0].timestamp
      setLastSeenTxTimestamp(newestTimestamp)
      window.localStorage.setItem(
        `dashboard:lastSeenTx:${address.toLowerCase()}`,
        String(newestTimestamp)
      )
    }
  }

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
    <>
        {/* Dashboard Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                {isConnected ? `Hi ${displayName}` : 'Hi Guest'}
              </h2>
              <p className="text-white/60 text-sm sm:text-base">
                Start earning yield on your cUSD
              </p>
              {!isConnected && (
                <p className="text-yellow-400 text-xs mt-1">
                  ⚠️ Connect your wallet to start depositing
                </p>
              )}
            </div>
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={handleToggleNotifications}
                className="relative p-1 rounded-md hover:bg-white/10 transition-colors"
                aria-label="Open notifications"
              >
                <Bell className="w-5 h-5 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-[#1a1a1d] shadow-2xl z-20">
                  <div className="px-3 py-2 border-b border-white/10 text-sm text-white/80 font-medium">
                    Notifications
                  </div>
                  {notifications.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-white/50">No transactions yet.</p>
                  ) : (
                    <>
                      {(['today', 'yesterday', 'earlier'] as const).map((groupKey) => {
                        const labelMap = { today: 'Today', yesterday: 'Yesterday', earlier: 'Earlier' }
                        const items = groupedNotifications[groupKey]
                        if (items.length === 0) return null

                        return (
                          <div key={groupKey}>
                            <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-white/40 bg-white/[0.02] border-y border-white/5">
                              {labelMap[groupKey]}
                            </div>
                            {items.map((tx) => {
                              const isDeposit = tx.type === 'Deposit'
                              return (
                                <div key={tx.id} className="px-3 py-2 border-b border-white/5 last:border-0">
                                  <div className="flex items-start gap-2">
                                    <div className={`mt-0.5 p-1 rounded-md ${isDeposit ? 'bg-green-500/15 text-green-400' : 'bg-orange-500/15 text-orange-400'}`}>
                                      {isDeposit ? <ArrowDownToLine className="w-3.5 h-3.5" /> : <ArrowUpFromLine className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-white">
                                        {tx.type} {tx.amount} USDm
                                      </p>
                                      <p className="text-xs text-white/50">
                                        {new Date(tx.timestamp * 1000).toLocaleString()}
                                      </p>
                                      {tx.transactionHash && (
                                        <a
                                          href={`https://celoscan.io/tx/${tx.transactionHash}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-block mt-1 text-[11px] text-[#2BA3FF] hover:text-[#66bcff] transition-colors"
                                        >
                                          View on explorer
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>


          {/* Primary actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/deposit"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#2BA3FF] text-white font-medium py-3 text-sm sm:text-base shadow-lg shadow-[#2BA3FF]/30 hover:bg-[#2590e0] transition-colors"
            >
              <ArrowDownToLine className="w-5 h-5" />
              <span>Deposit</span>
            </Link>
            <Link
              href="/withdrawal"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-white font-medium py-3 text-sm sm:text-base hover:bg-white/10 transition-colors"
            >
              <ArrowUpFromLine className="w-5 h-5" />
              <span>Withdraw</span>
            </Link>
          </div>
        </div>

        {/* AI Assistant Promo Card */}
        <div className="mb-6">
          <Link
            href="/ai-assistant"
            className="block bg-[#2BA3FF]/10 border border-[#2BA3FF]/30 rounded-2xl p-6 hover:bg-[#2BA3FF]/15 hover:border-[#2BA3FF]/50 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#2BA3FF] flex items-center justify-center flex-shrink-0">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold text-lg mb-1">
                  AI Yield Advisor
                </h3>
                <p className="text-white/70 text-sm">
                  Get personalized help with deposits, withdrawals, and
                  strategy.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-white/70" />
            </div>
          </Link>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Available Balance Card */}
            <div className="relative bg-[#1a1a1a] rounded-2xl border border-white/10 p-6 overflow-hidden">
              {/* Yield Animation Background */}
              {isConnected && userVaultBalance !== undefined && userVaultBalance !== null && typeof userVaultBalance === 'bigint' && userVaultBalance > BigInt(0) && (
                <YieldAnimation 
                  balance={parseFloat(formatUnits(userVaultBalance, 18))}
                  apy={apyPercent}
                  isVisible={balanceVisible}
                />
              )}
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white/70 text-sm font-medium">Vault Balance</h3>
                  <div className="flex items-center gap-5">
                    <button
                      onClick={() => setBalanceVisible(!balanceVisible)}
                      className="p-1 hover:bg-white/5 rounded transition-colors"
                      aria-label={balanceVisible ? 'Hide balance' : 'Show balance'}
                    >
                      <Eye className={`w-4 h-4 ${balanceVisible ? 'text-white/50' : 'text-white/30'}`} />
                    </button>
                    <ArrowRight className="w-4 h-4 text-white/50" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-2">
                {balanceVisible ? (
                  isLoadingBalance
                    ? 'Loading...'
                    : userVaultBalance !== undefined && userVaultBalance !== null && typeof userVaultBalance === 'bigint'
                    ? `$${parseFloat(formatUnits(userVaultBalance, 18)).toFixed(2)}`
                    : isConnected
                    ? '$0.00'
                    : '$0.00'
                ) : (
                  '••••••'
                )}
              </p>
              {balanceVisible && (
                <>
                  <p className="text-green-400 text-sm">
                    {isLoadingBalance
                      ? 'Calculating...'
                      : dailyEarnings !== null
                      ? `+${dailyEarnings.toFixed(6)} USDm/day`
                      : isConnected
                      ? '$0.00/day'
                      : 'Connect wallet to see earnings'}
                  </p>
                  {isConnected && (
                    <p className="text-white/50 text-xs mt-2">
                      Wallet: {isLoadingWalletBalance 
                        ? 'Loading...' 
                        : walletBalance !== undefined && walletBalance !== null && typeof walletBalance === 'bigint'
                        ? `${formatUnits(walletBalance, 18)} USDm`
                        : '0.00 USDm'}
                    </p>
                  )}
                </>
              )}
              </div>
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
                {balanceVisible ? (
                  isLoadingBalance || isLoadingTotalAssets
                    ? 'Loading...'
                    : userVaultBalance !== undefined && userVaultBalance !== null && typeof userVaultBalance === 'bigint'
                    ? (() => {
                        const userBalance = Number(formatUnits(userVaultBalance, 18))
                        return userBalance > 0 ? userBalance.toFixed(6) : '0.000000'
                      })()
                    : isConnected
                    ? '0.000000'
                    : '0.000000'
                ) : (
                  '••••••'
                )}
              </p>
              {balanceVisible && (
                <p className="text-green-400 text-sm">
                  {isLoadingAPY
                    ? 'Calculating...'
                    : apyPercent !== null
                    ? `Current APY: ${apyPercent.toFixed(2)}%`
                    : isConnected
                    ? 'APY: 0.00%'
                    : 'Connect wallet'}
                </p>
              )}
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
              <div className="h-64 relative" 
                onMouseLeave={() => setHoveredPoint(null)}
                onMouseMove={(e) => {
                  if (hoveredPoint) {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setHoveredPoint({
                      ...hoveredPoint,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top - 50,
                    })
                  }
                }}
              >
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
                            
                            {/* Data points with hover */}
                            {points.map((point, index) => {
                              const item = balanceHistory[index]
                              return (
                                <g key={index}>
                                  {/* Invisible larger circle for easier hovering */}
                                  <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r="12"
                                    fill="transparent"
                                    style={{ cursor: 'pointer' }}
                                    onMouseEnter={(e) => {
                                      const container = e.currentTarget.closest('.h-64')
                                      if (container) {
                                        const rect = container.getBoundingClientRect()
                                        const svg = e.currentTarget.closest('svg')
                                        if (svg) {
                                          const svgRect = svg.getBoundingClientRect()
                                          // Convert SVG coordinates to container coordinates
                                          const svgX = (point.x + 50) * (svgRect.width / 500)
                                          const svgY = (point.y + 20) * (svgRect.height / 250)
                                          setHoveredPoint({
                                            x: svgX,
                                            y: svgY - 50,
                                            value: item.value,
                                            label: item.label,
                                            date: item.date,
                                          })
                                        }
                                      }
                                    }}
                                  />
                                  {/* Visible circle */}
                                  <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r="4"
                                    fill="#2BA3FF"
                                    stroke="#141414"
                                    strokeWidth="2"
                                    style={{ pointerEvents: 'none' }}
                                  />
                                </g>
                              )
                            })}
                            
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
                
                {/* Tooltip */}
                {hoveredPoint && (
                  <div
                    className="absolute bg-[#1a1a1d] border border-[#2BA3FF]/30 rounded-lg p-3 shadow-xl z-10 pointer-events-none min-w-[140px]"
                    style={{
                      left: `${hoveredPoint.x}px`,
                      top: `${Math.max(10, hoveredPoint.y)}px`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div className="text-white text-sm font-semibold mb-1">
                      ${hoveredPoint.value.toFixed(6)} USDm
                    </div>
                    <div className="text-white/60 text-xs">
                      {hoveredPoint.label}
                    </div>
                    <div className="text-white/50 text-xs mt-1">
                      {hoveredPoint.date.toLocaleDateString()}
                    </div>
                    {/* Tooltip arrow */}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#2BA3FF]/30"></div>
                    </div>
                  </div>
                )}
              </div>
          </div>
        </div>
    </>
  )
}
