'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Brain,
  Check,
  ChevronDown,
  DollarSign,
  Coins,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpFromLine,
  Home,
  ArrowDownToLine,
  Menu,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { sdk } from '@farcaster/miniapp-sdk'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits, type Address } from 'viem'
import { AttestifyVaultContract, CUSD_ADDRESS } from '../abi'
import { useQuery } from '@apollo/client/react'
import { gql } from '@apollo/client'
import Navbar from '../../components/navbar'

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
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
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
  const [txStatus, setTxStatus] = useState<'idle' | 'withdrawing' | 'transferring' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [recipientAddress, setRecipientAddress] = useState<string>('')
  const [showRecipientInput, setShowRecipientInput] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
    writeContract: transfer,
    data: transferHash,
    isPending: isTransferring,
    error: transferError,
    reset: resetTransfer
  } = useWriteContract()

  const { 
    isLoading: isWaitingWithdraw,
    isSuccess: isWithdrawSuccess,
    error: withdrawTxError
  } = useWaitForTransactionReceipt({
    hash: withdrawHash,
  })

  const {
    isLoading: isWaitingTransfer,
    isSuccess: isTransferSuccess,
    error: transferTxError
  } = useWaitForTransactionReceipt({
    hash: transferHash,
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

  // Handle withdrawal success - if recipient address is provided, transfer funds
  useEffect(() => {
    if (isWithdrawSuccess && withdrawHash) {
      if (recipientAddress && recipientAddress.trim() !== '' && withdrawalAmount > BigInt(0)) {
        // Validate recipient address
        if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress.trim())) {
          setErrorMessage('Invalid recipient address. Please enter a valid Ethereum address.')
          setTxStatus('error')
          return
        }

        setTxStatus('transferring')
        setErrorMessage('')

        // Transfer the withdrawn amount to the recipient address
        transfer({
          address: CUSD_ADDRESS as Address,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [recipientAddress.trim() as Address, withdrawalAmount],
        })
      } else if (!recipientAddress || recipientAddress.trim() === '') {
        // No external transfer needed, just refresh balances
        setTxStatus('success')
        setAmount('')
        
        const refreshAllData = () => {
          refetchVaultBalance()
          refetchWalletBalance()
          refetchWithdrawals()
        }
        
        refreshAllData()
        
        const timer1 = setTimeout(() => refreshAllData(), 3000)
        const timer2 = setTimeout(() => refreshAllData(), 6000)
        const timer3 = setTimeout(() => refreshAllData(), 12000)
        
        return () => {
          clearTimeout(timer1)
          clearTimeout(timer2)
          clearTimeout(timer3)
        }
      }
    }
  }, [isWithdrawSuccess, withdrawHash, recipientAddress, withdrawalAmount, transfer, refetchVaultBalance, refetchWalletBalance, refetchWithdrawals])

  // Handle transfer success - refresh all balances
  useEffect(() => {
    if (isTransferSuccess) {
      setTxStatus('success')
      setAmount('')
      setRecipientAddress('')
      setShowRecipientInput(false)
      
      const refreshAllData = () => {
        refetchVaultBalance()
        refetchWalletBalance()
        refetchWithdrawals()
      }
      
      refreshAllData()
      
      const timer1 = setTimeout(() => refreshAllData(), 3000)
      const timer2 = setTimeout(() => refreshAllData(), 6000)
      const timer3 = setTimeout(() => refreshAllData(), 12000)
      const timer4 = setTimeout(() => setTxStatus('idle'), 3000)
      
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
        clearTimeout(timer4)
      }
    }
  }, [isTransferSuccess, refetchVaultBalance, refetchWalletBalance, refetchWithdrawals])

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

  useEffect(() => {
    if (transferError) {
      setTxStatus('error')
      const errorMsg = transferError.message || 'Transfer failed. Please check your wallet.'
      setErrorMessage(errorMsg)
      setTimeout(() => {
        resetTransfer()
      }, 100)
    }
  }, [transferError, resetTransfer])

  useEffect(() => {
    if (transferTxError) {
      setTxStatus('error')
      setErrorMessage('Transfer transaction failed. Please try again.')
    }
  }, [transferTxError])

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
    if (txStatus === 'transferring' && !isTransferring && !isWaitingTransfer && !transferHash && !transferError) {
      const timer = setTimeout(() => {
        if (!transferHash) {
          setTxStatus('idle')
          setErrorMessage('Transfer was cancelled or rejected. Please try again.')
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [txStatus, isWithdrawing, isWaitingWithdraw, withdrawHash, withdrawError, isTransferring, isWaitingTransfer, transferHash, transferError])

  // Update transaction status based on pending states
  useEffect(() => {
    if (isWithdrawing || isWaitingWithdraw) {
      setTxStatus('withdrawing')
    } else if (isTransferring || isWaitingTransfer) {
      setTxStatus('transferring')
    }
  }, [isWithdrawing, isWaitingWithdraw, isTransferring, isWaitingTransfer])

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

  // Format balance for display - show full precision (6+ decimal places to match dashboard)
  const formatBalance = (balance: bigint | undefined) => {
    if (balance === undefined || balance === null) return '0.000000'
    try {
      const formatted = formatUnits(balance, 18)
      const num = parseFloat(formatted)
      
      // For very large numbers, use fewer decimal places
      if (num >= 1000) {
        return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      } else {
        // For smaller numbers, show up to 6 decimal places (matching dashboard)
        // Remove trailing zeros but keep at least 2 decimal places
        const fixed = num.toFixed(6)
        const trimmed = fixed.replace(/\.?0+$/, '')
        // If no decimal part, add .00
        return trimmed.includes('.') ? trimmed : `${trimmed}.00`
      }
    } catch {
      return '0.000000'
    }
  }

  // Handle Max button click - use full precision
  const handleMaxClick = () => {
    if (userVaultBalance !== undefined && userVaultBalance !== null && typeof userVaultBalance === 'bigint' && userVaultBalance > BigInt(0)) {
      // Use formatUnits directly to get full precision, then format for display
      const fullAmount = formatUnits(userVaultBalance, 18)
      // Remove trailing zeros but keep decimals
      const trimmed = fullAmount.replace(/\.?0+$/, '')
      setAmount(trimmed)
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
    : '0.000000'

  return (
    <div style={{ backgroundColor: '#0E0E11', minHeight: '100vh' }}>
      <Navbar />

      <div className="flex relative">
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
              className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <ArrowDownToLine className="w-5 h-5" />
              <span>Deposit</span>
            </Link>
            <Link 
              href="/withdrawal" 
              className="flex items-center gap-3 px-4 py-3 bg-[#2BA3FF]/20 text-[#2BA3FF] rounded-lg font-medium"
              onClick={() => setSidebarOpen(false)}
            >
              <ArrowUpFromLine className="w-5 h-5" />
              <span>Withdrawal</span>
            </Link>
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
                  <p className="text-green-400 text-sm">
                    {recipientAddress && recipientAddress.trim() !== ''
                      ? `Withdrawal successful! Funds have been transferred to ${recipientAddress.trim().slice(0, 6)}...${recipientAddress.trim().slice(-4)}.`
                      : 'Withdrawal successful! Your funds have been transferred to your Farcaster wallet.'}
                  </p>
                </div>
              )}

              {/* Currency Dropdown */}
              <div className="mb-6">
                <label className="block text-white/70 text-sm mb-2">Currency</label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    disabled={!isConnected || txStatus === 'withdrawing' || txStatus === 'transferring'}
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
                    disabled={!isConnected || txStatus === 'withdrawing' || txStatus === 'transferring'}
                  />
                  {isConnected && currency === 'cusd' && userVaultBalance !== undefined && userVaultBalance !== null && typeof userVaultBalance === 'bigint' && userVaultBalance > BigInt(0) && (
                    <button
                      type="button"
                      onClick={handleMaxClick}
                      disabled={txStatus === 'withdrawing' || txStatus === 'transferring'}
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

              {/* Optional: Withdraw to External Address */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-white/70 text-sm">Withdraw to (optional)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecipientInput(!showRecipientInput)
                      if (!showRecipientInput) {
                        setRecipientAddress('')
                      }
                    }}
                    disabled={!isConnected || txStatus === 'withdrawing' || txStatus === 'transferring'}
                    className="text-[#2BA3FF] text-xs hover:text-[#1a8fdb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {showRecipientInput ? 'Use Farcaster wallet' : 'Different address?'}
                  </button>
                </div>
                {showRecipientInput ? (
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Recipient Address</label>
                    <input
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => {
                        setRecipientAddress(e.target.value.trim())
                        setErrorMessage('')
                      }}
                      placeholder="0x..."
                      disabled={!isConnected || txStatus === 'withdrawing' || txStatus === 'transferring'}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#2BA3FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
                    />
                    {recipientAddress && !/^0x[a-fA-F0-9]{40}$/.test(recipientAddress) && (
                      <p className="text-red-400 text-xs mt-1">Invalid Ethereum address format</p>
                    )}
                    <p className="text-white/50 text-xs mt-2">
                      Funds will be withdrawn to your Farcaster wallet first, then automatically transferred to this address.
                    </p>
                  </div>
                ) : (
                  <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
                    <p className="text-white/70 text-sm">
                      <span className="text-white font-medium">Farcaster Wallet</span>
                      {address && (
                        <span className="text-white/50 text-xs ml-2 font-mono">
                          ({address.slice(0, 6)}...{address.slice(-4)})
                        </span>
                      )}
                    </p>
                  </div>
                )}
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
                disabled={Boolean(
                  !isConnected ||
                  txStatus === 'withdrawing' ||
                  txStatus === 'transferring' ||
                  !amount || (amount && amount.trim() === '') ||
                  withdrawalAmount === BigInt(0) ||
                  !hasSufficientBalance ||
                  currency !== 'cusd' ||
                  (showRecipientInput && recipientAddress && recipientAddress.trim() !== '' && !/^0x[a-fA-F0-9]{40}$/.test(recipientAddress))
                )}
                className="w-full py-3 bg-[#2BA3FF] text-white rounded-lg font-semibold hover:bg-[#1a8fdb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {txStatus === 'withdrawing' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing Withdrawal...</span>
                  </>
                ) : txStatus === 'transferring' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Transferring to External Wallet...</span>
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
