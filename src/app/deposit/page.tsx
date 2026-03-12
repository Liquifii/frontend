'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Home, 
  Brain, 
  Settings, 
  Eye, 
  ArrowRight,
  DollarSign,
  Coins,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Menu,
  X
} from 'lucide-react'
import Navbar from '../../components/navbar'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { sdk } from '@farcaster/miniapp-sdk'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits, type Address } from 'viem'
import { AttestifyVaultContract, CUSD_ADDRESS } from '../abi'
import { useQuery } from '@apollo/client/react'
import { gql } from '@apollo/client'

// ERC20 ABI for cUSD token operations
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// Utility function to check if we're in a MiniApp environment
const isInMiniApp = (): boolean => {
  if (typeof window === 'undefined') return false
  // Check if we're in an iframe (MiniApp context)
  return window.self !== window.top || !!window.ReactNativeWebView
}

export default function DepositPage() {
  const router = useRouter()
  const [selectedTab, setSelectedTab] = useState<'fiat' | 'cusd'>('cusd')
  const [amount, setAmount] = useState('')
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [balanceHidden, setBalanceHidden] = useState(false)
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [txStatus, setTxStatus] = useState<'idle' | 'approving' | 'depositing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { address, isConnected } = useAccount()

  // Read user's cUSD balance
  const { data: cusdBalance, refetch: refetchBalance } = useReadContract({
    address: CUSD_ADDRESS as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      // Auto-refetch every 10 seconds
      refetchInterval: 10000,
    },
  })

  // Read user's allowance for vault
  const depositAmount = useMemo(() => {
    if (!amount || selectedTab !== 'cusd') return 0n
    try {
      return parseUnits(amount, 18)
    } catch {
      return 0n
    }
  }, [amount, selectedTab])

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CUSD_ADDRESS as Address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && AttestifyVaultContract.address ? [address, AttestifyVaultContract.address as Address] : undefined,
    query: {
      enabled: !!address && isConnected && !!AttestifyVaultContract.address,
    },
  })

  // Read user's vault balance (shares)
  const { data: userShares, refetch: refetchShares } = useReadContract({
    address: AttestifyVaultContract.address as Address,
    abi: AttestifyVaultContract.AttestifyVault,
    functionName: 'shares',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000,
    },
  })

  // Read user's vault balance in assets
  const { data: userVaultBalance, refetch: refetchVaultBalance } = useReadContract({
    address: AttestifyVaultContract.address as Address,
    abi: AttestifyVaultContract.AttestifyVault,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000,
    },
  })

  // Read total vault assets
  const { data: totalAssets, refetch: refetchTotalAssets } = useReadContract({
    address: AttestifyVaultContract.address as Address,
    abi: AttestifyVaultContract.AttestifyVault,
    functionName: 'totalAssets',
    query: {
      enabled: isConnected,
      refetchInterval: 10000,
    },
  })

  // GraphQL queries for deposit/withdrawal history (moved here so refetch functions are available)
  const GET_DEPOSITS = gql`
    query GetDeposits($user: Bytes!) {
      depositeds(where: { user: $user }, orderBy: blockTimestamp, orderDirection: desc, first: 10) {
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
    query GetWithdrawals($user: Bytes!) {
      withdrawns(where: { user: $user }, orderBy: blockTimestamp, orderDirection: desc, first: 10) {
        user
        shares
        blockTimestamp
        assets
        transactionHash
        id
      }
    }
  `

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
    refetch: refetchDeposits
  } = useQuery<DepositedData>(GET_DEPOSITS, {
    variables: { user: address?.toLowerCase() },
    skip: !address,
  })

  const {
    data: withdrawalData,
    loading: withdrawalLoading,
    refetch: refetchWithdrawals
  } = useQuery<WithdrawalData>(GET_WITHDRAWNS, {
    variables: { user: address?.toLowerCase() },
    skip: !address,
  })

  // Write contract hooks with error handling
  const { 
    writeContract: approve, 
    data: approveHash, 
    isPending: isApproving,
    error: approveError,
    reset: resetApprove
  } = useWriteContract()
  
  const { 
    writeContract: deposit, 
    data: depositHash, 
    isPending: isDepositing,
    error: depositError,
    reset: resetDeposit
  } = useWriteContract()

  // Wait for approval transaction
  const { 
    isLoading: isWaitingApproval, 
    isSuccess: isApprovalSuccess,
    error: approvalTxError
  } = useWaitForTransactionReceipt({
    hash: approveHash,
  })

  // Wait for deposit transaction
  const { 
    isLoading: isWaitingDeposit, 
    isSuccess: isDepositSuccess,
    error: depositTxError
  } = useWaitForTransactionReceipt({
    hash: depositHash,
  })

  // Check if approval is needed
  const needsApproval = useMemo(() => {
    // If allowance hasn't loaded yet, we can't determine if approval is needed
    if (allowance === undefined || allowance === null) {
      return false // Don't block deposit if allowance is still loading
    }
    
    // If no deposit amount, no approval needed
    if (!depositAmount || depositAmount === BigInt(0)) {
      return false
    }
    
    // Check if allowance is sufficient (with a small buffer for rounding)
    const allowanceValue = typeof allowance === 'bigint' ? allowance : BigInt(0)
    return allowanceValue < depositAmount
  }, [allowance, depositAmount])


  // Handle approval - approve max amount for better UX (user can deposit multiple times without re-approving)
  const handleApprove = () => {
    if (!address || !depositAmount || depositAmount === 0n) {
      setErrorMessage('Please enter a valid amount')
      return
    }

    setTxStatus('approving')
    setErrorMessage('')
    resetApprove() // Reset any previous errors

    // Approve max uint256 for better UX (allows multiple deposits without re-approving)
    // Alternatively, you could approve depositAmount * 2 or a large amount
    const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
    
    approve({
      address: CUSD_ADDRESS as Address,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [AttestifyVaultContract.address as Address, maxApproval],
    })
  }

  // Handle deposit
  const handleDeposit = () => {
    if (!address || !depositAmount || depositAmount === 0n) {
      setErrorMessage('Please enter a valid amount')
      return
    }

    // Double-check allowance before depositing
    if (needsApproval || (allowance !== undefined && allowance !== null && typeof allowance === 'bigint' && allowance < depositAmount)) {
      setErrorMessage('Insufficient allowance. Please approve cUSD first.')
      setTxStatus('idle')
      return
    }

    setTxStatus('depositing')
    setErrorMessage('')
    resetDeposit() // Reset any previous errors

    deposit({
      address: AttestifyVaultContract.address as Address,
      abi: AttestifyVaultContract.AttestifyVault,
      functionName: 'deposit',
      args: [depositAmount],
    })
  }

  // Format balance/amount for display (limit decimal places to prevent overflow)
  const formatAmount = (value: bigint | undefined) => {
    if (value === undefined || value === null) return '0.00'
    try {
      const formatted = formatUnits(value, 18)
      const num = parseFloat(formatted)
      // For very large numbers (like max approval), show "Max"
      if (num >= 1e15) {
        return 'Max'
      } else if (num >= 1000) {
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

  // Handle proceed button click
  const handleProceed = () => {
    if (selectedTab === 'fiat') {
      setErrorMessage('Fiat deposits are not yet available. Please use cUSD.')
      return
    }

    if (needsApproval) {
      handleApprove()
    } else {
      handleDeposit()
    }
  }

  // Reset status when approval succeeds and refetch allowance
  useEffect(() => {
    if (isApprovalSuccess) {
      setTxStatus('idle')
      // Wait a moment for the blockchain state to update, then refetch
      setTimeout(() => {
        refetchAllowance()
      }, 1000)
    }
  }, [isApprovalSuccess, refetchAllowance])

  // Handle deposit success - auto-refresh all balances
  useEffect(() => {
    if (isDepositSuccess && depositHash) {
      setTxStatus('success')
      setAmount('')
      
      // Function to refetch all data
      const refreshAllData = () => {
        refetchBalance()
        refetchShares()
        refetchVaultBalance()
        refetchAllowance()
        refetchTotalAssets()
        refetchDeposits()
        refetchWithdrawals()
      }
      
      // Immediate refetch (transaction is confirmed, state should be updating)
      refreshAllData()
      
      // Wait for blockchain state to update, then refetch multiple times
      // First refetch after 3 seconds (blockchain state propagation)
      const timer1 = setTimeout(() => {
        refreshAllData()
      }, 3000)
      
      // Second refetch after 6 seconds (ensure we got the update)
      const timer2 = setTimeout(() => {
        refreshAllData()
      }, 6000)
      
      // Third refetch after 12 seconds (final check)
      const timer3 = setTimeout(() => {
        refreshAllData()
      }, 12000)
      
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
      }
    }
  }, [isDepositSuccess, depositHash, refetchBalance, refetchShares, refetchVaultBalance, refetchAllowance, refetchTotalAssets, refetchDeposits, refetchWithdrawals])

  // Handle errors from writeContract hooks
  useEffect(() => {
    if (approveError) {
      setTxStatus('error')
      const errorMsg = approveError.message || 'Approval failed. Please check your wallet.'
      setErrorMessage(errorMsg)
      // Reset after showing error
      setTimeout(() => {
        resetApprove()
      }, 100)
    }
  }, [approveError, resetApprove])

  useEffect(() => {
    if (depositError) {
      setTxStatus('error')
      let errorMsg = depositError.message || 'Deposit failed. Please check your wallet.'
      
      // Check for specific allowance error
      if (errorMsg.includes('insufficient allowance') || errorMsg.includes('allowance')) {
        errorMsg = 'Insufficient allowance. Please approve cUSD first by clicking "Approve cUSD".'
        // Refetch allowance to update the UI
        refetchAllowance()
      }
      
      setErrorMessage(errorMsg)
      // Reset after showing error
      setTimeout(() => {
        resetDeposit()
      }, 100)
    }
  }, [depositError, resetDeposit, refetchAllowance])

  useEffect(() => {
    if (approvalTxError) {
      setTxStatus('error')
      setErrorMessage('Approval transaction failed. Please try again.')
    }
  }, [approvalTxError])

  useEffect(() => {
    if (depositTxError) {
      setTxStatus('error')
      setErrorMessage('Deposit transaction failed. Please try again.')
    }
  }, [depositTxError])

  // Reset status when transaction is rejected or cancelled
  useEffect(() => {
    // If we're not pending anymore and no hash was generated, user likely rejected
    if (txStatus === 'approving' && !isApproving && !isWaitingApproval && !approveHash && !approveError) {
      // Give it a moment in case hash is still being generated
      const timer = setTimeout(() => {
        if (!approveHash) {
          setTxStatus('idle')
          setErrorMessage('Transaction was cancelled or rejected. Please try again.')
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
    
    if (txStatus === 'depositing' && !isDepositing && !isWaitingDeposit && !depositHash && !depositError) {
      // Give it a moment in case hash is still being generated
      const timer = setTimeout(() => {
        if (!depositHash) {
          setTxStatus('idle')
          setErrorMessage('Transaction was cancelled or rejected. Please try again.')
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [txStatus, isApproving, isWaitingApproval, approveHash, approveError, isDepositing, isWaitingDeposit, depositHash, depositError])

  // Update transaction status based on pending states
  useEffect(() => {
    if (isApproving || isWaitingApproval) {
      setTxStatus('approving')
    } else if (isDepositing || isWaitingDeposit) {
      setTxStatus('depositing')
    }
  }, [isApproving, isWaitingApproval, isDepositing, isWaitingDeposit])

  // Calculate balance history from transactions
  const balanceHistory = useMemo(() => {
    if (!depositedData?.depositeds || !withdrawalData?.withdrawns || !userVaultBalance) {
      return []
    }

    // Combine and sort all transactions by timestamp
    const allTransactions = [
      ...(depositedData.depositeds || []).map(d => ({
        type: 'deposit' as const,
        timestamp: Number(d.blockTimestamp),
        assets: BigInt(d.assets),
        date: new Date(Number(d.blockTimestamp) * 1000),
      })),
      ...(withdrawalData.withdrawns || []).map(w => ({
        type: 'withdrawal' as const,
        timestamp: Number(w.blockTimestamp),
        assets: BigInt(w.assets),
        date: new Date(Number(w.blockTimestamp) * 1000),
      })),
    ].sort((a, b) => a.timestamp - b.timestamp)

    // Calculate running balance
    let runningBalance = BigInt(0)
    const history = allTransactions.map((tx, index) => {
      if (tx.type === 'deposit') {
        runningBalance += tx.assets
      } else {
        runningBalance -= tx.assets
      }
      
      const daysAgo = Math.floor((Date.now() - tx.date.getTime()) / (1000 * 60 * 60 * 24))
      const label = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`
      
      return {
        label,
        value: parseFloat(formatUnits(runningBalance, 18)),
        date: tx.date,
      }
    })

    // Add current balance as the last point
    if (userVaultBalance !== undefined && userVaultBalance !== null && typeof userVaultBalance === 'bigint' && userVaultBalance > BigInt(0)) {
      history.push({
        label: 'Now',
        value: parseFloat(formatUnits(userVaultBalance, 18)),
        date: new Date(),
      })
    }

    // If we have history, return it; otherwise show current balance
    if (history.length > 0) {
      return history.slice(-7) // Last 7 points
    } else if (userVaultBalance !== undefined && userVaultBalance !== null && typeof userVaultBalance === 'bigint' && userVaultBalance > BigInt(0)) {
      // If no history but have balance, show current balance
      return [{
        label: 'Now',
        value: parseFloat(formatUnits(userVaultBalance, 18)),
        date: new Date(),
      }]
    }

    return []
  }, [depositedData, withdrawalData, userVaultBalance])

  // Chart dimensions - enlarged to match Figma
  const chartWidth = 800
  const chartHeight = 300
  const padding = 40
  const chartInnerWidth = chartWidth - padding * 2
  const chartInnerHeight = chartHeight - padding * 2

  // Calculate chart points
  const maxValue = balanceHistory.length > 0 ? Math.max(...balanceHistory.map(b => b.value)) : 0
  const minValue = balanceHistory.length > 0 ? Math.min(...balanceHistory.map(b => b.value)) : 0
  const valueRange = maxValue - minValue || 1

  const points = balanceHistory.map((item, index) => {
    const x = balanceHistory.length > 1 
      ? padding + (index / (balanceHistory.length - 1)) * chartInnerWidth
      : padding + chartInnerWidth / 2
    const y = padding + chartInnerHeight - ((item.value - minValue) / valueRange) * chartInnerHeight
    return { x, y, value: item.value }
  })

  // Create path for area chart
  const areaPath = balanceHistory.length > 0
    ? `M ${points[0].x} ${chartHeight - padding} ${points.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${points[points.length - 1].x} ${chartHeight - padding} Z`
    : ''
  const linePath = balanceHistory.length > 0
    ? `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`
    : ''

  useEffect(() => {
    const load = async () => {
      sdk.actions.ready();
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  return (
    <div style={{ backgroundColor: '#0E0E11', minHeight: '100vh' }}>
      <Navbar />

      <div className="flex">
        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-[#1a1a1a] border border-white/10 rounded-lg text-white hover:bg-white/5 transition-colors"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-64 border-r border-white/10 min-h-[calc(100vh-64px)] p-4 transform transition-transform duration-300 ease-in-out -translate-x-full lg:translate-x-0 ${
            sidebarOpen ? '!translate-x-0' : ''
          }`}
          style={{ backgroundColor: '#0E0E11' }}
        >
          <nav className="space-y-2 pt-12 lg:pt-0">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </Link>
            <Link 
              href="/ai-assistant" 
              className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <Brain className="w-5 h-5" />
              <span>AI Assistant</span>
            </Link>
            <Link 
              href="/deposit" 
              className="flex items-center gap-3 px-4 py-3 bg-[#2BA3FF]/20 text-[#2BA3FF] rounded-lg font-medium"
              onClick={() => setSidebarOpen(false)}
            >
              <ArrowDownToLine className="w-5 h-5" />
              <span>Deposit</span>
            </Link>
            <Link 
              href="/withdrawal" 
              className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <ArrowUpFromLine className="w-5 h-5" />
              <span>Withdrawal</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6" style={{ backgroundColor: '#0E0E11' }}>
          <div className="max-w-6xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => {
                if (isInMiniApp()) {
                  // In MiniApp, use browser history to go back
                  // The Farcaster client will handle the navigation
                  if (window.history.length > 1) {
                    window.history.back()
                  } else {
                    // If no history, navigate to dashboard
                    router.push('/dashboard')
                  }
                } else {
                  // Not in MiniApp, use Next.js router
                  router.push('/dashboard')
                }
              }}
              className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span className="text-sm">Back to Dashboard</span>
            </button>
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
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) => {
                          const value = e.target.value
                          // Allow empty, numbers, and one decimal point
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setAmount(value)
                            setErrorMessage('')
                          }
                        }}
                        placeholder={selectedTab === 'fiat' ? 'Enter amount in NGN' : 'Enter amount in cUSD'}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#2BA3FF] transition-colors"
                        disabled={!isConnected || txStatus === 'approving' || txStatus === 'depositing'}
                      />
                    </div>
                    {amount && depositAmount > BigInt(0) && (
                      <p className="text-xs text-white/50 mt-1">
                        ≈ {formatAmount(depositAmount)} cUSD
                      </p>
                    )}
                  </div>

                  {/* Deposit Range */}
                  <div className="mb-6">
                    <p className="text-white/60 text-sm">
                      Deposit Range: <span className="text-white">
                        {selectedTab === 'fiat' 
                          ? 'Min: ₦1,000 | Max: ₦5,000,000'
                          : 'Min: 1 cUSD | Max: 100,000 cUSD'
                        }
                      </span>
                    </p>
                    {selectedTab === 'cusd' && isConnected && cusdBalance !== undefined && (
                      <p className="text-white/50 text-xs mt-1">
                        Available: {formatAmount(cusdBalance)} cUSD
                      </p>
                    )}
                  </div>

                  {/* Error Message */}
                  {errorMessage && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <p className="text-red-400 text-sm">{errorMessage}</p>
                    </div>
                  )}

                  {/* Success Message */}
                  {txStatus === 'success' && (
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <p className="text-green-400 text-sm">Deposit successful!</p>
                    </div>
                  )}

                  {/* Connection Status */}
                  {!isConnected && (
                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                      <p className="text-yellow-400 text-sm">Please connect your wallet to deposit</p>
                    </div>
                  )}

                  {/* Balance Display - Always show when connected */}
                  {isConnected && (
                    <div className="mb-4">
                      {cusdBalance === undefined ? (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2">
                          <Loader2 className="w-5 h-5 text-yellow-400 flex-shrink-0 animate-spin" />
                          <p className="text-yellow-400 text-sm">Loading balance...</p>
                        </div>
                      ) : depositAmount > BigInt(0) && cusdBalance < depositAmount ? (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                          <p className="text-red-400 text-sm break-words">
                            Insufficient balance. You have {formatAmount(cusdBalance)} cUSD
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <p className="text-blue-400 text-sm break-words">
                            Wallet Balance: {formatAmount(cusdBalance)} cUSD
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Allowance Status */}
                  {isConnected && depositAmount > BigInt(0) && allowance !== undefined && (
                    <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-blue-400 text-sm break-words">
                        {needsApproval ? (
                          <>⚠️ Approval needed: {formatAmount(allowance as bigint)} cUSD approved, need {formatAmount(depositAmount)} cUSD</>
                        ) : (
                          <>✅ Sufficient allowance: {formatAmount(allowance as bigint)} cUSD approved</>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Proceed Button */}
                  <button
                    onClick={handleProceed}
                    disabled={
                      !isConnected ||
                      !amount ||
                      depositAmount === BigInt(0) ||
                      (cusdBalance !== undefined && typeof cusdBalance === 'bigint' && cusdBalance < depositAmount) ||
                      txStatus === 'approving' ||
                      txStatus === 'depositing' ||
                      isWaitingApproval ||
                      isWaitingDeposit
                    }
                    className="w-full py-3 bg-[#2BA3FF] text-white rounded-lg font-semibold hover:bg-[#1a8fdb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {txStatus === 'approving' || isApproving || isWaitingApproval ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Approving...
                      </>
                    ) : txStatus === 'depositing' || isDepositing || isWaitingDeposit ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Depositing...
                      </>
                    ) : needsApproval ? (
                      <>
                        Approve cUSD
                        <AlertCircle className="w-4 h-4" />
                      </>
                    ) : (
                      'Deposit'
                    )}
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
                          <div>
                            <p className="text-4xl font-bold text-white">
                              {userVaultBalance !== undefined && userVaultBalance !== null && typeof userVaultBalance === 'bigint'
                                ? `$${parseFloat(formatUnits(userVaultBalance, 18)).toFixed(2)}`
                                : '$0.00'}
                            </p>
                            {userShares !== undefined && userShares !== null && (
                              <p className="text-sm text-white/60 mt-1">
                                Shares: {userShares.toString()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Balance Chart - Full Width, inherits gradient from parent */}
                    <div>
                      {balanceHistory.length === 0 ? (
                        <div className="flex items-center justify-center h-[300px] text-white/40">
                          {depositedLoading || withdrawalLoading ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Loading balance history...</span>
                            </div>
                          ) : (
                            <span>No transaction history yet</span>
                          )}
                        </div>
                      ) : (
                      <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet" className="w-full">
                        {/* Y-axis labels on the left - hidden when balance is hidden */}
                          {!balanceHidden && balanceHistory.length > 1 && balanceHistory.map((item, index) => {
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
                                ${item.value.toFixed(2)}
                            </text>
                          )
                        })}
                        
                        {/* Area fill */}
                          {areaPath && (
                        <path
                          d={areaPath}
                          fill="url(#balanceGradient)"
                          opacity={0.3}
                        />
                          )}
                        {/* Line */}
                          {linePath && (
                        <path
                          d={linePath}
                          fill="none"
                          stroke="#2BA3FF"
                          strokeWidth="2.5"
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
                            const x = balanceHistory.length > 1
                              ? padding + (index / (balanceHistory.length - 1)) * chartInnerWidth
                              : padding + chartInnerWidth / 2
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
                      )}
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

