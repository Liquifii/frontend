'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { 
  Home, 
  Brain, 
  Settings, 
  Check,
  ChevronDown,
  DollarSign,
  Coins,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle
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
] as const

// Utility function to check if we're in a MiniApp environment
const isInMiniApp = (): boolean => {
  if (typeof window === 'undefined') return false
  // Check if we're in an iframe (MiniApp context)
  return window.self !== window.top || !!window.ReactNativeWebView
}

export default function WithdrawalPage() {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'cusd' | 'ngn'>('cusd')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [txStatus, setTxStatus] = useState<'idle' | 'withdrawing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const { address, isConnected } = useAccount()

  // Read user's vault balance (how much they can withdraw)
  const { 
    data: userVaultBalance, 
    isLoading: isLoadingVaultBalance,
    refetch: refetchVaultBalance 
  } = useReadContract({
    address: AttestifyVaultContract.address as Address,
    abi: AttestifyVaultContract.AttestifyVault,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000,
    },
  })

  // Read user's wallet cUSD balance
  const { 
    data: walletBalance, 
    refetch: refetchWalletBalance 
  } = useReadContract({
    address: CUSD_ADDRESS as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000,
    },
  })

  // Parse withdrawal amount
  const withdrawalAmount = useMemo(() => {
    if (!amount || currency !== 'cusd') return BigInt(0)
    try {
      return parseUnits(amount, 18)
    } catch {
      return BigInt(0)
    }
  }, [amount, currency])

  // Check if user has sufficient balance
  const hasSufficientBalance = useMemo(() => {
    if (!userVaultBalance || !withdrawalAmount) return false
    return typeof userVaultBalance === 'bigint' && userVaultBalance >= withdrawalAmount
  }, [userVaultBalance, withdrawalAmount])

  // Write contract hooks
  const { 
    writeContract: withdraw, 
    data: withdrawHash,
    isPending: isWithdrawing,
    error: withdrawError,
    reset: resetWithdraw
  } = useWriteContract()

  const { 
    isLoading: isWaitingWithdraw,
    isSuccess: isWithdrawSuccess,
    error: withdrawTxError
  } = useWaitForTransactionReceipt({
    hash: withdrawHash,
  })

  // GraphQL queries for withdrawal history
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

  interface Withdrawn {
    user: string
    shares: string
    blockTimestamp: string
    assets: string
    transactionHash: string
    id: string
  }

  interface WithdrawalData {
    withdrawns?: Withdrawn[]
  }

  const {
    data: withdrawalData,
    loading: withdrawalLoading,
    refetch: refetchWithdrawals
  } = useQuery<WithdrawalData>(GET_WITHDRAWNS, {
    variables: { user: address?.toLowerCase() },
    skip: !address,
  })

  // Handle SDK ready
  useEffect(() => {
    const load = async () => {
      sdk.actions.ready();
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  // Handle withdrawal success - auto-refresh all balances
  useEffect(() => {
    if (isWithdrawSuccess) {
      setTxStatus('success')
      setAmount('')
      
      // Function to refetch all data
      const refreshAllData = () => {
        refetchVaultBalance()
        refetchWalletBalance()
        refetchWithdrawals()
      }
      
      // Immediate refetch
      refreshAllData()
      
      // Wait for blockchain state to update, then refetch multiple times
      const timer1 = setTimeout(() => {
        refreshAllData()
      }, 3000)
      
      const timer2 = setTimeout(() => {
        refreshAllData()
      }, 6000)
      
      const timer3 = setTimeout(() => {
        refreshAllData()
      }, 12000)
      
      // Reset success status after 3 seconds
      const timer4 = setTimeout(() => {
        setTxStatus('idle')
      }, 3000)
      
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
        clearTimeout(timer4)
      }
    }
  }, [isWithdrawSuccess, refetchVaultBalance, refetchWalletBalance, refetchWithdrawals])

  // Handle errors from writeContract hooks
  useEffect(() => {
    if (withdrawError) {
      setTxStatus('error')
      const errorMsg = withdrawError.message || 'Withdrawal failed. Please check your wallet.'
      setErrorMessage(errorMsg)
      setTimeout(() => {
        resetWithdraw()
      }, 100)
    }
  }, [withdrawError, resetWithdraw])

  useEffect(() => {
    if (withdrawTxError) {
      setTxStatus('error')
      setErrorMessage('Withdrawal transaction failed. Please try again.')
    }
  }, [withdrawTxError])

  // Reset status when transaction is rejected or cancelled
  useEffect(() => {
    if (txStatus === 'withdrawing' && !isWithdrawing && !isWaitingWithdraw && !withdrawHash && !withdrawError) {
      const timer = setTimeout(() => {
        if (!withdrawHash) {
          setTxStatus('idle')
          setErrorMessage('Transaction was cancelled or rejected. Please try again.')
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [txStatus, isWithdrawing, isWaitingWithdraw, withdrawHash, withdrawError])

  // Update transaction status based on pending states
  useEffect(() => {
    if (isWithdrawing || isWaitingWithdraw) {
      setTxStatus('withdrawing')
    }
  }, [isWithdrawing, isWaitingWithdraw])

  // Calculate minimum assets out with slippage tolerance (1% slippage = 99% of requested)
  const minAssetsOut = useMemo(() => {
    if (withdrawalAmount === BigInt(0)) return BigInt(0)
    // Use 99% of requested amount as minimum (1% slippage tolerance)
    // This allows for small price movements during withdrawal
    return (withdrawalAmount * BigInt(99)) / BigInt(100)
  }, [withdrawalAmount])

  // Handle withdrawal
  const handleWithdraw = () => {
    if (!isConnected || !address) {
      setErrorMessage('Please connect your wallet first.')
      return
    }

    if (currency !== 'cusd') {
      setErrorMessage('Only cUSD withdrawals are currently supported.')
      return
    }

    if (!amount || withdrawalAmount === BigInt(0)) {
      setErrorMessage('Please enter a valid amount.')
      return
    }

    if (!hasSufficientBalance) {
      setErrorMessage('Insufficient vault balance. Please check your available balance.')
      return
    }

    setErrorMessage('')
    setTxStatus('withdrawing')

    // Use withdraw function with slippage protection (minAssetsOut parameter)
    // This prevents the transaction from failing due to slippage
    withdraw({
      address: AttestifyVaultContract.address as Address,
      abi: AttestifyVaultContract.AttestifyVault,
      functionName: 'withdraw',
      args: [withdrawalAmount, minAssetsOut],
    })
  }

  // Format balance for display (limit to 4 decimal places to prevent overflow)
  const formatBalance = (balance: bigint | undefined) => {
    if (balance === undefined || balance === null) return '0.00'
    try {
      const formatted = formatUnits(balance, 18)
      const num = parseFloat(formatted)
      
      // For very large numbers, use fewer decimal places
      if (num >= 1000) {
        return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      } else if (num >= 1) {
        // For numbers >= 1, show up to 4 decimal places
        return num.toFixed(4).replace(/\.?0+$/, '')
      } else {
        // For numbers < 1, show up to 4 decimal places
        return num.toFixed(4).replace(/\.?0+$/, '')
      }
    } catch {
      return '0.00'
    }
  }

  // Handle Max button click
  const handleMaxClick = () => {
    if (userVaultBalance !== undefined && userVaultBalance !== null && typeof userVaultBalance === 'bigint' && userVaultBalance > BigInt(0)) {
      const maxAmount = formatBalance(userVaultBalance)
      setAmount(maxAmount)
      setErrorMessage('')
    }
  }

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

  const availableBalance = userVaultBalance && typeof userVaultBalance === 'bigint' 
    ? formatBalance(userVaultBalance) 
    : '0.00'

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
            {/* Back Button */}
            <button
              onClick={() => {
                if (isInMiniApp()) {
                  if (window.history.length > 1) {
                    window.history.back()
                  } else {
                    router.push('/dashboard')
                  }
                } else {
                  router.push('/dashboard')
                }
              }}
              className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span className="text-sm">Back to Dashboard</span>
            </button>
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
                {isLoadingVaultBalance ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-white/50" />
                    <p className="text-4xl font-bold text-white/50">Loading...</p>
                  </div>
                ) : (
                  <p className="text-4xl font-bold text-white break-words overflow-wrap-anywhere">
                    ${availableBalance}
                  </p>
                )}
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{errorMessage}</p>
                </div>
              )}

              {/* Success Message */}
              {txStatus === 'success' && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <p className="text-green-400 text-sm">Withdrawal successful! Your funds have been transferred to your wallet.</p>
                </div>
              )}

              {/* Currency Dropdown */}
              <div className="mb-6">
                <label className="block text-white/70 text-sm mb-2">Currency</label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    disabled={!isConnected || txStatus === 'withdrawing'}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setAmount(value)
                        setErrorMessage('')
                      }
                    }}
                    placeholder={currency === 'cusd' ? 'Enter amount in cUSD' : 'Enter amount in NGN'}
                    className="w-full pl-10 pr-20 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#2BA3FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isConnected || txStatus === 'withdrawing'}
                  />
                  {isConnected && currency === 'cusd' && userVaultBalance !== undefined && userVaultBalance !== null && typeof userVaultBalance === 'bigint' && userVaultBalance > BigInt(0) && (
                    <button
                      type="button"
                      onClick={handleMaxClick}
                      disabled={txStatus === 'withdrawing'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold bg-[#2BA3FF]/20 text-[#2BA3FF] rounded-md hover:bg-[#2BA3FF]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Max
                    </button>
                  )}
                </div>
                {amount && withdrawalAmount > BigInt(0) && (
                  <p className="text-xs text-white/50 mt-1">
                    ≈ {formatBalance(withdrawalAmount)} cUSD
                  </p>
                )}
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
              <button
                onClick={handleWithdraw}
                disabled={
                  !isConnected ||
                  txStatus === 'withdrawing' ||
                  !amount ||
                  withdrawalAmount === BigInt(0) ||
                  !hasSufficientBalance ||
                  currency !== 'cusd'
                }
                className="w-full py-3 bg-[#2BA3FF] text-white rounded-lg font-semibold hover:bg-[#1a8fdb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {txStatus === 'withdrawing' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing Withdrawal...</span>
                  </>
                ) : txStatus === 'success' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Withdrawal Successful</span>
                  </>
                ) : (
                  `Withdraw ${currency === 'cusd' ? 'cUSD' : 'NGN'}`
                )}
              </button>

              {!isConnected && (
                <p className="text-center text-white/50 text-sm mt-4">
                  Please connect your wallet to withdraw
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
