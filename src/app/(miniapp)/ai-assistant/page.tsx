'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Home, 
  Brain, 
  Settings, 
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Shield,
  ExternalLink,
  Info,
  ArrowDownToLine,
  ArrowUpFromLine,
  Menu,
  X
} from 'lucide-react'
import Navbar from '../../../components/navbar'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAccount, useReadContract } from 'wagmi'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits, type Address, createPublicClient, http } from 'viem'
import { celo } from 'viem/chains'
import { AttestifyVaultContract, CUSD_ADDRESS, TOKENS, REGISTRY_ADDRESS, REGISTRY_ABI, StrategyContract } from '../../abi'
import { sdk } from '@farcaster/miniapp-sdk'

// Utility to detect if we're in Farcaster MiniApp
function isInMiniApp(): boolean {
  if (typeof window === 'undefined') return false
  return window.self !== window.top || !!window.ReactNativeWebView
}

// ERC20 ABI for approvals and balance checks
const ERC20_ABI = [
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
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// Vault ABI for deposit/withdraw
const VAULT_ABI = [
  {
    inputs: [{ name: 'assets', type: 'uint256' }],
    name: 'deposit',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'minAssetsOut', type: 'uint256' },
    ],
    name: 'withdraw',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// Deposit limits (in USDm)
const MIN_DEPOSIT_USDM = 1 // 1 USDm minimum
const MAX_DEPOSIT_USDM = 100000 // 100,000 USDm maximum

// Convert to wei (18 decimals)
const MIN_DEPOSIT_WEI = parseUnits(MIN_DEPOSIT_USDM.toString(), 18)
const MAX_DEPOSIT_WEI = parseUnits(MAX_DEPOSIT_USDM.toString(), 18)

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  transactionRequest?: {
    action: 'deposit' | 'withdraw'
    amount: number
    asset?: 'USDC' | 'USDT' | 'CUSD'
    asset_label?: string
  }
  txHash?: string
}

type TransactionStatus = {
  type: 'deposit' | 'withdraw'
  amount: number
  status: 'pending' | 'approving' | 'executing' | 'success' | 'error'
  error?: string
  txHash?: string
}

export default function AIAssistantPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { writeContract, data: txHash, error: writeError, reset: resetWrite } = useWriteContract()
  const [txAsset, setTxAsset] = useState<'USDC' | 'USDT' | 'CUSD'>('CUSD')
  const [txAssetLabel, setTxAssetLabel] = useState<string>('USDm')
  const [txDecimals, setTxDecimals] = useState<number>(18)
  const tokenAddress = txAsset === 'USDC' ? (TOKENS.USDC.address as Address) : txAsset === 'USDT' ? (TOKENS.USDT.address as Address) : (CUSD_ADDRESS as Address)
  const { data: resolvedVault } = useReadContract({
    address: REGISTRY_ADDRESS as Address,
    abi: REGISTRY_ABI,
    functionName: 'getVault',
    args: [tokenAddress],
    query: { enabled: true, refetchInterval: 15000 },
  })
  
  // Read user's wallet USDm balance
  const { data: walletBalance, refetch: refetchWalletBalance } = useReadContract({
    address: CUSD_ADDRESS as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000,
    },
  })

  // Read user's vault balance
  const { data: vaultBalance, refetch: refetchVaultBalance } = useReadContract({
    address: AttestifyVaultContract.address as Address,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000,
    },
  })
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId] = useState(() => {
    const storageKey = 'agent_conversation_id'
    try {
      if (typeof window !== 'undefined') {
        const existing = window.localStorage.getItem(storageKey)
        if (existing) return existing
        const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
        window.localStorage.setItem(storageKey, id)
        return id
      }
    } catch {
      // ignore storage errors
    }
    return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  })
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus | null>(null)
  const [approveHash, setApproveHash] = useState<`0x${string}` | undefined>()
  const [vaultHash, setVaultHash] = useState<`0x${string}` | undefined>()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const hasUserInteracted = useRef(false)
  const [lastUserMessage, setLastUserMessage] = useState<string>('')
  // When agent requests a tx without specifying asset, we stage a draft until user picks the asset
  const [txDraft, setTxDraft] = useState<{ action: 'deposit' | 'withdraw'; amount: number } | null>(null)
  const [infoDraft, setInfoDraft] = useState<null | { kind: 'balance' | 'apy' }>(null)
  // Infer asset from user text when backend omitted asset but user specified it
  const inferAssetFromText = (text: string): 'USDC' | 'USDT' | 'CUSD' | undefined => {
    try {
      const lower = text.toLowerCase()
      if (/(usdc)/.test(lower)) return 'USDC'
      if (/(usdt)/.test(lower)) return 'USDT'
      if (/(usdm|\bcusd\b|c\s*usd|c-usd)/.test(lower)) return 'CUSD'
    } catch {}
    return undefined
  }
  const inferAmountFromText = (text: string): number | undefined => {
    try {
      const m = text.toLowerCase().match(/(?:\$?\s*)(\d+(?:\.\d+)?)/)
      return m ? Number(m[1]) : undefined
    } catch {
      return undefined
    }
  }
  // Simple snapshot reader for balances/APY per asset
  const publicClient = createPublicClient({ chain: celo, transport: http('https://forno.celo.org') })
  const ERC20_READ_ABI = [
    { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  ] as const
  async function loadAssetSnapshot(asset: 'USDC' | 'USDT' | 'CUSD', user: Address) {
    const tokenAddr = asset === 'USDC' ? (TOKENS.USDC.address as Address) : asset === 'USDT' ? (TOKENS.USDT.address as Address) : (CUSD_ADDRESS as Address)
    const decimals = asset === 'USDC' || asset === 'USDT' ? 6 : 18
    const vault = (await publicClient.readContract({
      address: REGISTRY_ADDRESS as Address,
      abi: REGISTRY_ABI,
      functionName: 'getVault',
      args: [tokenAddr],
    })) as Address
    const walletBal = (await publicClient.readContract({
      address: tokenAddr,
      abi: ERC20_READ_ABI,
      functionName: 'balanceOf',
      args: [user],
    })) as bigint
    const vaultBal = (await publicClient.readContract({
      address: vault,
      abi: AttestifyVaultContract.AttestifyVault,
      functionName: 'balanceOf',
      args: [user],
    })) as bigint
    const strategy = (await publicClient.readContract({
      address: vault,
      abi: AttestifyVaultContract.AttestifyVault,
      functionName: 'strategy',
    })) as Address
    const apyBps = (await publicClient.readContract({
      address: strategy,
      abi: StrategyContract.Strategy,
      functionName: 'getCurrentAPY',
    })) as bigint
    return {
      wallet: Number(formatUnits(walletBal, decimals)),
      vault: Number(formatUnits(vaultBal, decimals)),
      apy: Number(apyBps) / 100,
      decimals,
      symbol: asset === 'CUSD' ? 'USDm' : asset,
    }
  }
  // SelfClaw trust verification
  const [trustData, setTrustData] = useState<{
    configured: boolean
    verified: boolean
    humanId?: string | null
    agentName?: string | null
    swarm?: string | null
    reputation?: { hasErc8004: boolean; endpoint: string | null } | null
    selfxyz?: { verified: boolean; registeredAt: string | null } | null
  } | null>(null)
  const [showTrustInfo, setShowTrustInfo] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { isLoading: isApproving, isSuccess: isApproveSuccess, error: approveTxError } = useWaitForTransactionReceipt({
    hash: approveHash,
  })
  const { isLoading: isExecuting, isSuccess: isExecuteSuccess, error: executeTxError } = useWaitForTransactionReceipt({
    hash: vaultHash,
  })

  // Track transaction hash from writeContract
  useEffect(() => {
    if (txHash && transactionStatus) {
      if (transactionStatus.status === 'approving') {
        setApproveHash(txHash)
      } else if (transactionStatus.status === 'executing') {
        setVaultHash(txHash)
      }
    }
  }, [txHash, transactionStatus])

  // Auto-scroll to bottom when new messages arrive, but only after the user has interacted
  useEffect(() => {
    if (hasUserInteracted.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Fetch SelfClaw trust status on mount and update welcome message
  useEffect(() => {
    const fetchTrustStatus = async () => {
      try {
        const res = await fetch('/api/agent/trust')
        const data = await res.json()
        setTrustData(data)
        
        // Update welcome message with verification status
        const verifiedText = data?.verified 
          ? ' I\'m a verified AI agent backed by SelfClaw, ensuring you\'re interacting with a trusted, human-verified assistant.'
          : ''
        
        setMessages([{
          role: 'assistant',
          content: `Hello! I'm your LiquiFi AI Yield Advisor.${verifiedText} I can help you check balances, view transaction history, get APY information, and assist with deposits and withdrawals. How can I help you today?`,
          timestamp: new Date(),
        }])
      } catch (error) {
        console.warn('Failed to fetch trust status:', error)
        setTrustData({ configured: false, verified: false })
        setMessages([{
          role: 'assistant',
          content: 'Hello! I\'m your LiquiFi AI Yield Advisor. I can help you check balances, view transaction history, get APY information, and assist with deposits and withdrawals. How can I help you today?',
          timestamp: new Date(),
        }])
      }
    }
    fetchTrustStatus()
  }, [])

  // Close trust info tooltip when clicking outside
  useEffect(() => {
    if (!showTrustInfo) return
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-trust-info]')) {
        setShowTrustInfo(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showTrustInfo])

  // Format amount for display
  const formatAmount = (value: bigint | undefined) => {
    if (value === undefined || value === null) return '0.00'
    try {
      const formatted = formatUnits(value, txDecimals)
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

  // Validate transaction before execution
  const validateTransaction = (): string | null => {
    if (!transactionStatus) return 'No transaction to validate'

    const amountWei = parseUnits(transactionStatus.amount.toString(), txDecimals)

    // Check minimum deposit/withdrawal
    if (amountWei < MIN_DEPOSIT_WEI) {
      return `Minimum ${transactionStatus.type} is ${MIN_DEPOSIT_USDM} USDm. Please enter at least ${MIN_DEPOSIT_USDM} USDm.`
    }

    // Check maximum deposit/withdrawal
    if (amountWei > MAX_DEPOSIT_WEI) {
      return `Maximum ${transactionStatus.type} is ${MAX_DEPOSIT_USDM.toLocaleString()} USDm. Please enter a smaller amount.`
    }

    // Check sufficient balance for deposit
    if (transactionStatus.type === 'deposit') {
      if (walletBalance !== undefined && typeof walletBalance === 'bigint') {
        if (walletBalance < amountWei) {
          const balanceFormatted = formatAmount(walletBalance)
          return `Insufficient balance. You have ${balanceFormatted} ${txAssetLabel}, but trying to deposit ${transactionStatus.amount} ${txAssetLabel}.`
        }
      }
    }

    // Check sufficient vault balance for withdrawal
    if (transactionStatus.type === 'withdraw') {
      if (vaultBalance !== undefined && typeof vaultBalance === 'bigint') {
        if (vaultBalance < amountWei) {
          const balanceFormatted = formatAmount(vaultBalance)
          return `Insufficient vault balance. You have ${balanceFormatted} ${txAssetLabel} in the vault, but trying to withdraw ${transactionStatus.amount} ${txAssetLabel}.`
        }
      }
    }

    return null
  }

  // Humanize error messages
  const humanizeError = (errorMsg: string): string => {
    const errorMsgLower = errorMsg.toLowerCase()
    
    if (errorMsgLower.includes('user rejected') || errorMsgLower.includes('user denied') || errorMsgLower.includes('user cancelled')) {
      return 'Transaction was cancelled. Please try again when ready.'
    } else if (errorMsgLower.includes('insufficient balance')) {
      return 'Insufficient balance. Please check your wallet balance and try again.'
    } else if (errorMsgLower.includes('insufficient allowance')) {
      return 'Insufficient allowance. Please approve USDm first.'
    } else if (errorMsgLower.includes('execution reverted')) {
      if (errorMsgLower.includes('min') || errorMsgLower.includes('minimum')) {
        return `Transaction amount is below the minimum. Minimum ${transactionStatus?.type || 'transaction'} is ${MIN_DEPOSIT_USDM} USDm.`
      } else if (errorMsgLower.includes('max') || errorMsgLower.includes('maximum')) {
        return `Transaction amount exceeds the maximum. Maximum ${transactionStatus?.type || 'transaction'} is ${MAX_DEPOSIT_USDM.toLocaleString()} USDm.`
      } else {
        return 'Transaction was reverted. Please check the amount and your balance, then try again.'
      }
    } else if (errorMsgLower.includes('network') || errorMsgLower.includes('connection')) {
      return 'Network error. Please check your connection and try again.'
    }
    
    return errorMsg
  }

  // Handle transaction error
  const handleTransactionError = (errorMessage: string) => {
    if (!transactionStatus) return

    setTransactionStatus({
      ...transactionStatus,
      status: 'error',
      error: errorMessage,
    })

    // Add error message to chat
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: `❌ Transaction failed: ${errorMessage}. How else can I help you?`,
        timestamp: new Date(),
      },
    ])

    // Clear transaction status after 5 seconds
    setTimeout(() => {
      setTransactionStatus(null)
    }, 5000)
  }

  // Handle approval transaction errors
  useEffect(() => {
    if (approveTxError && transactionStatus?.status === 'approving') {
      const errorMsg = approveTxError.message || 'Approval transaction failed'
      handleTransactionError(humanizeError(errorMsg))
    }
  }, [approveTxError, transactionStatus])

  // Handle execution transaction errors
  useEffect(() => {
    if (executeTxError && transactionStatus?.status === 'executing') {
      const errorMsg = executeTxError.message || 'Transaction failed'
      handleTransactionError(humanizeError(errorMsg))
    }
  }, [executeTxError, transactionStatus])

  // Handle writeContract errors
  useEffect(() => {
    if (writeError && transactionStatus) {
      const errorMsg = writeError.message || 'Transaction failed'
      handleTransactionError(humanizeError(errorMsg))
      resetWrite()
    }
  }, [writeError, transactionStatus, resetWrite])

  // Handle transaction execution after approval
  useEffect(() => {
    if (isApproveSuccess && transactionStatus?.status === 'approving') {
      executeTransaction()
    }
  }, [isApproveSuccess])

  // Handle transaction success and submit feedback
  useEffect(() => {
    if (isExecuteSuccess && transactionStatus && vaultHash) {
      handleTransactionSuccess(vaultHash)
    }
  }, [isExecuteSuccess, vaultHash])

  const executeTransaction = async () => {
    if (!transactionStatus || !address) return

    // Validate before executing
    const validationError = validateTransaction()
    if (validationError) {
      handleTransactionError(validationError)
      return
    }

    try {
      setTransactionStatus((prev) => prev ? { ...prev, status: 'executing' } : null)

      const amountWei = parseUnits(transactionStatus.amount.toString(), txDecimals)

      if (transactionStatus.type === 'deposit') {
        writeContract({
          address: (typeof resolvedVault === 'string' && !/^0x0{40}$/i.test(resolvedVault as string) ? (resolvedVault as Address) : (AttestifyVaultContract.address as Address)),
          abi: VAULT_ABI,
          functionName: 'deposit',
          args: [amountWei],
        })
      } else {
        // Withdraw with 1% slippage tolerance
        const minAssetsOut = (amountWei * BigInt(99)) / BigInt(100)
        writeContract({
          address: (typeof resolvedVault === 'string' && !/^0x0{40}$/i.test(resolvedVault as string) ? (resolvedVault as Address) : (AttestifyVaultContract.address as Address)),
          abi: VAULT_ABI,
          functionName: 'withdraw',
          args: [amountWei, minAssetsOut],
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Transaction failed'
      handleTransactionError(humanizeError(errorMsg))
    }
  }

  const handleTransactionSuccess = async (txHash: string) => {
    if (!transactionStatus) return

    setTransactionStatus((prev) =>
      prev ? { ...prev, status: 'success', txHash } : null
    )

    // Add success message to chat
    const formattedAmount = typeof transactionStatus.amount === 'number'
      ? transactionStatus.amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
      })
      : '0.00'
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: `✅ Transaction successful! Your ${transactionStatus.type} of $${formattedAmount} USDm has been completed.`,
        timestamp: new Date(),
        txHash: txHash,
      },
    ])

    // Clear transaction status after 5 seconds
    setTimeout(() => {
      setTransactionStatus(null)
    }, 5000)

    // Best-effort feedback to agent backend
    try {
      await fetch('/api/agent/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_hash: txHash,
          success: true,
        }),
      })
    } catch {
      // ignore feedback errors
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    if (!isConnected || !address) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Please connect your wallet first to use the AI assistant.',
          timestamp: new Date(),
        },
      ])
      return
    }

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    // Mark that the user has interacted so we can start auto-scrolling
    hasUserInteracted.current = true

    setMessages((prev) => [...prev, userMessage])
    const messageContent = input.trim()
    setLastUserMessage(messageContent)
    setInput('')
    setIsLoading(true)

    // Send message to AI agent
    try {
      // Fast-path: handle balance/APY/earnings locally when asset is explicit to avoid backend 500s
      const lc = messageContent.toLowerCase()
      const isBalance = /balance/.test(lc)
      const isApy = /(apy|yield)/.test(lc)
      const isEarnings = /(earning|earnings)/.test(lc)
      const isInfoQuery = isBalance || isApy || isEarnings
      const inferredAsset = inferAssetFromText(messageContent)
      if (isInfoQuery && inferredAsset) {
        if (!address) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: 'Please connect your wallet to check balances and APY.',
              timestamp: new Date(),
            },
          ])
          return
        }
        try {
          const snap = await loadAssetSnapshot(inferredAsset, address as Address)
          const daily = isEarnings || isApy ? (snap.vault * (snap.apy / 100)) / 365 : null
          const reply =
            isBalance && !isApy && !isEarnings
              ? `For ${snap.symbol}: Vault balance ${snap.vault.toFixed(6)} ${snap.symbol}, Wallet ${snap.wallet.toFixed(6)} ${snap.symbol}.`
              : isApy && !isEarnings
              ? `Current APY for ${snap.symbol}: ${snap.apy.toFixed(2)}%. Estimated daily earnings: ${daily?.toFixed(6) ?? '0.000000'} ${snap.symbol}/day (on your vault balance of ${snap.vault.toFixed(6)} ${snap.symbol}).`
              : isEarnings && !isApy
              ? `Estimated daily earnings for ${snap.symbol}: ${daily?.toFixed(6) ?? '0.000000'} ${snap.symbol}/day at ${snap.apy.toFixed(2)}% APY (on your vault balance of ${snap.vault.toFixed(6)} ${snap.symbol}).`
              : `For ${snap.symbol}: APY ${snap.apy.toFixed(2)}% — estimated daily earnings ${daily?.toFixed(6) ?? '0.000000'} ${snap.symbol}/day; Vault ${snap.vault.toFixed(6)} ${snap.symbol}, Wallet ${snap.wallet.toFixed(6)} ${snap.symbol}.`
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: reply,
              timestamp: new Date(),
            },
          ])
          return
        } finally {
          setIsLoading(false)
        }
      }
      // If info query without asset, prompt chips and skip backend
      if (isInfoQuery && !inferredAsset) {
        setInfoDraft({ kind: isApy || isEarnings ? 'apy' : 'balance' })
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          wallet_address: address,
          conversation_id: conversationId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      const tx = data.transactionRequest
      // Only treat "missing asset" as actionable when the backend is asking for a tx (deposit/withdraw)
      const missingAsset = !!(tx && (tx.action === 'deposit' || tx.action === 'withdraw') && !tx.asset)

      // Handle balance/APY questions first to avoid emitting a generic reply and a second per-asset answer
      {
        const lower = messageContent.toLowerCase()
        const isBalance = /balance/.test(lower)
        const isApy = /(apy|yield|earnings)/.test(lower)
        const isBalanceOrApy = isBalance || isApy
        const inferred = inferAssetFromText(messageContent)
        if (!tx && isBalanceOrApy && inferred && address) {
          try {
            const snap = await loadAssetSnapshot(inferred, address as Address)
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: isApy
                  ? `Current APY for ${snap.symbol}: ${snap.apy.toFixed(2)}%.`
                  : `For ${snap.symbol}: Vault balance ${snap.vault.toFixed(6)} ${snap.symbol}, Wallet ${snap.wallet.toFixed(6)} ${snap.symbol}.`,
                timestamp: new Date(),
              },
            ])
          } catch {
            // fall through to generic reply if snapshot fails
          }
          return
        }
        if (!tx && isBalanceOrApy && !inferred) {
          // Ask user to pick an asset for balance/APY queries
          setInfoDraft({ kind: isApy ? 'apy' : 'balance' })
          return
        }
      }

      // If backend omitted asset but the user's message clearly includes it, proceed immediately
      if (missingAsset) {
        const inferredAsset = inferAssetFromText(messageContent)
        const inferredAmount = data.transactionRequest?.amount ?? inferAmountFromText(messageContent)
        if (inferredAsset && typeof inferredAmount === 'number') {
          const nextAsset = inferredAsset
          setTxAsset(nextAsset)
          setTxAssetLabel(nextAsset === 'CUSD' ? 'USDm' : nextAsset)
          setTxDecimals(nextAsset === 'USDC' || nextAsset === 'USDT' ? 6 : 18)
          setTransactionStatus({
            type: data.transactionRequest!.action,
            amount: inferredAmount,
            status: 'pending',
          })
          return
        }
      }

      const assistantContent = missingAsset
        ? 'Which asset would you like to use for this transaction? Please select USDm, USDC, or USDT.'
        : (data.reply || 'I couldn\'t generate a response. Please try again.')

      // Only attach transactionRequest to the chat when asset is specified
      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        transactionRequest: missingAsset ? undefined : data.transactionRequest,
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Handle transaction request workflow
      if (tx && (tx.action === 'deposit' || tx.action === 'withdraw')) {
        const { action, amount, asset, asset_label } = tx
        if (!asset) {
          // Stage draft and show quick chips; user picks the asset in UI
          setTxDraft({ action, amount })
        } else {
          // Normalize asset string from backend: cusd|usdc|usdt or uppercase
          const normalized = String(asset).toLowerCase()
          const nextAsset = normalized === 'usdc' ? 'USDC' : normalized === 'usdt' ? 'USDT' : 'CUSD'
          setTxAsset(nextAsset)
          setTxAssetLabel(asset_label || (nextAsset === 'CUSD' ? 'USDm' : nextAsset))
          setTxDecimals(nextAsset === 'USDC' || nextAsset === 'USDT' ? 6 : 18)
          setTransactionStatus({
            type: action,
            amount,
            status: 'pending',
          })
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            process.env.NODE_ENV !== 'production'
              ? `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
              : 'Sorry, something went wrong. Please try again.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveTransaction = async () => {
    if (!transactionStatus || !address) return

    // Validate before approving
    const validationError = validateTransaction()
    if (validationError) {
      handleTransactionError(validationError)
      return
    }

    try {
      setTransactionStatus((prev) => prev ? { ...prev, status: 'approving' } : null)

      const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

      writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [(typeof resolvedVault === 'string' && !/^0x0{40}$/i.test(resolvedVault as string) ? (resolvedVault as Address) : (AttestifyVaultContract.address as Address)), maxApproval],
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Approval failed'
      handleTransactionError(humanizeError(errorMsg))
    }
  }

  const handleRejectTransaction = () => {
    setTransactionStatus(null)
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: 'Transaction cancelled. How else can I help you?',
        timestamp: new Date(),
      },
    ])
  }

  const handleBack = () => {
    if (isInMiniApp()) {
      if (window.history.length > 1) {
        window.history.back()
      } else {
        router.push('/dashboard')
      }
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{ backgroundColor: '#0E0E11', minHeight: '100vh' }}>

      <div className="flex relative">

        {/* Main Content */}
        <main className="flex-1 flex flex-col" style={{ backgroundColor: '#0E0E11' }}>
          {/* Mobile Back Button */}
          <div className="lg:hidden p-4 border-b border-white/10">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span className="text-sm">Back to Dashboard</span>
            </button>
          </div>

          {/* Header */}
          <div className="p-4 lg:p-6 border-b border-white/10">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">Your AI Yield Advisor</h1>
                    {/* SelfClaw Trust Badge - Prominent */}
                    {trustData?.verified && (
                      <div className="relative group" data-trust-info>
                        {trustData.swarm ? (
                          <a
                            href={trustData.swarm}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 rounded-full text-green-400 hover:from-green-500/30 hover:to-emerald-500/30 transition-all shadow-lg shadow-green-500/10"
                            title="View verification on SelfClaw"
                          >
                            <CheckCircle2 className="w-4 h-4 fill-green-500/20" />
                            <span className="text-xs font-semibold">Verified Agent</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 rounded-full text-green-400 shadow-lg shadow-green-500/10">
                            <CheckCircle2 className="w-4 h-4 fill-green-500/20" />
                            <span className="text-xs font-semibold">Verified by SelfClaw</span>
                          </div>
                        )}
                        <button
                          onClick={() => setShowTrustInfo(!showTrustInfo)}
                          className="ml-1.5 p-1 rounded-full hover:bg-white/10 transition-colors"
                          title="Learn more about verification"
                        >
                          <Info className="w-3.5 h-3.5 text-green-400/70 hover:text-green-400" />
                        </button>
                        {/* Trust Info Tooltip */}
                        {showTrustInfo && (
                          <div className="absolute top-full right-0 mt-2 w-72 p-4 bg-[#1a1a1d] border border-green-500/30 rounded-lg shadow-xl z-50" data-trust-info>
                            <div className="flex items-start gap-3">
                              <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <h3 className="text-sm font-semibold text-white mb-1">Verified AI Agent</h3>
                                <p className="text-xs text-white/70 leading-relaxed">
                                  This AI agent is verified and human-backed by SelfClaw, ensuring you're interacting with a trusted assistant that has passed identity verification.
                                </p>
                                {trustData.reputation?.hasErc8004 && (
                                  <p className="text-xs text-white/60 mt-2 pt-2 border-t border-white/10">
                                    ✓ ERC-8004 Reputation Registry enabled
                                  </p>
                                )}
                                {trustData.swarm && (
                                  <a
                                    href={trustData.swarm}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-[#2BA3FF] hover:text-[#1a8fdb] mt-2"
                                  >
                                    View on SelfClaw <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              <button
                                onClick={() => setShowTrustInfo(false)}
                                className="text-white/40 hover:text-white transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-white/60 text-sm sm:text-base">
                    {isConnected && address
                      ? `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`
                      : 'Connect your wallet to get started'}
                  </p>
                </div>
                  </div>
                </div>
              </div>

          {/* Chat Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 lg:p-6"
            style={{ backgroundColor: '#0E0E11' }}
          >
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-full w-full rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-[#2BA3FF] text-white'
                        : 'bg-white/5 border border-white/10 text-white'
                    }`}
                  >
                    <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    {message.txHash && (
                      <div className="mt-3 pt-3 border-t border-white/20">
                        <p className="text-xs text-white/70 mb-2">Transaction Hash:</p>
                        <a
                          href={`https://celoscan.io/tx/${message.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#2BA3FF] hover:text-[#1a8fdb] underline break-all text-xs font-mono"
                        >
                          {message.txHash.slice(0, 10)}...{message.txHash.slice(-8)}
                        </a>
                      </div>
                    )}
                    {message.transactionRequest && (
                      <div className="mt-3 pt-3 border-t border-white/20">
                        <p className="text-xs text-white/70 mb-2">
                          Transaction Request: {message.transactionRequest.action} ${message.transactionRequest.amount?.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })} {message.transactionRequest.asset_label || (message.transactionRequest.asset === 'CUSD' ? 'USDm' : message.transactionRequest.asset || 'USDm')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <span className="text-white/80 text-sm sm:text-base flex items-center">
                      Thinking
                      <span className="inline-flex ml-1 gap-0.5">
                        <span className="thinking-dot" style={{ animationDelay: '0s' }}>.</span>
                        <span className="thinking-dot" style={{ animationDelay: '0.2s' }}>.</span>
                        <span className="thinking-dot" style={{ animationDelay: '0.4s' }}>.</span>
                      </span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Transaction Approval Modal */}
          {transactionStatus && transactionStatus.status !== 'success' && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[#1a1a1d] border border-white/10 rounded-lg p-6 max-w-md w-full">
                <h3 className="text-xl font-bold text-white mb-4">
                  {transactionStatus.status === 'error' ? 'Transaction Error' : 'Approve Transaction'}
                </h3>
                {transactionStatus.status === 'error' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-red-400">
                      <XCircle className="w-5 h-5" />
                      <p className="text-sm">{transactionStatus.error || 'Transaction failed'}</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setTransactionStatus(null)}
                        className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-white/70 text-sm">Action:</p>
                      <p className="text-white font-semibold capitalize">{transactionStatus.type}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-white/70 text-sm">Amount:</p>
                      <p className="text-white font-semibold">
                        ${typeof transactionStatus.amount === 'number'
                          ? transactionStatus.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })
                          : '0.00'} {txAssetLabel}
                      </p>
                    </div>
                    {transactionStatus.status === 'approving' && (
                      <div className="flex items-center gap-2 text-[#2BA3FF]">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <p className="text-sm">Approving {txAssetLabel}...</p>
                      </div>
                    )}
                    {transactionStatus.status === 'executing' && (
                      <div className="flex items-center gap-2 text-[#2BA3FF]">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <p className="text-sm">Executing transaction...</p>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={handleRejectTransaction}
                        disabled={transactionStatus.status === 'approving' || transactionStatus.status === 'executing'}
                        className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      {transactionStatus.status === 'pending' && (
                        <button
                          onClick={handleApproveTransaction}
                          className="flex-1 px-4 py-2 bg-[#2BA3FF] text-white rounded-lg hover:bg-[#1a8fdb] transition-colors"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success Message */}
          {transactionStatus?.status === 'success' && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[#1a1a1d] border border-green-500/30 rounded-lg p-6 max-w-md w-full">
                <div className="flex items-center gap-2 text-green-400 mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                  <h3 className="text-xl font-bold text-white">Transaction Successful!</h3>
                </div>
                <p className="text-white/70 text-sm mb-4">
                  Your {transactionStatus.type} of ${typeof transactionStatus.amount === 'number'
                    ? transactionStatus.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })
                    : '0.00'} USDm has been completed.
                </p>
                {transactionStatus.txHash && (
                  <div className="mb-4">
                    <p className="text-white/70 text-xs mb-2">Transaction Hash:</p>
                    <a
                      href={`https://celoscan.io/tx/${transactionStatus.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#2BA3FF] hover:text-[#1a8fdb] underline break-all text-xs font-mono block"
                    >
                      {transactionStatus.txHash}
                    </a>
                    <p className="text-white/50 text-xs mt-1">Click to view on CeloScan</p>
                  </div>
                )}
                <button
                  onClick={() => setTransactionStatus(null)}
                  className="w-full px-4 py-2 bg-[#2BA3FF] text-white rounded-lg hover:bg-[#1a8fdb] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Chat Input - Fixed at bottom */}
          <div className="p-4 lg:p-6">
            <div className="max-w-4xl mx-auto space-y-3">
              {/* Quick asset selector when a tx draft awaits asset choice */}
              {(txDraft || infoDraft) && (
                <div className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="text-white/80 text-sm">
                    {txDraft ? (
                      (() => {
                        const amt = typeof txDraft.amount === 'number' ? txDraft.amount : inferAmountFromText(lastUserMessage)
                        const amtStr = typeof amt === 'number'
                          ? amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                          : '0.00'
                        return <>Select asset for {txDraft.action}: ${amtStr}</>
                      })()
                    ) : infoDraft ? (
                      <>Select asset for {infoDraft.kind === 'apy' ? 'APY' : 'balance'}</>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {(['CUSD','USDC','USDT'] as const).map(sym => (
                      <button
                        key={sym}
                        onClick={() => {
                          const nextAsset = sym
                          setTxAsset(nextAsset)
                          setTxAssetLabel(nextAsset === 'CUSD' ? 'USDm' : nextAsset)
                          setTxDecimals(nextAsset === 'USDC' || nextAsset === 'USDT' ? 6 : 18)
                          if (txDraft) {
                            // promote draft to active pending transaction
                            const amt = typeof txDraft.amount === 'number' ? txDraft.amount : inferAmountFromText(lastUserMessage) || 0
                            setTransactionStatus({
                              type: txDraft.action,
                              amount: amt,
                              status: 'pending',
                            })
                            setTxDraft(null)
                            setMessages((prev) => [
                              ...prev,
                              {
                                role: 'assistant',
                                content: `Great — we'll use ${nextAsset === 'CUSD' ? 'USDm' : nextAsset} for this ${txDraft.action}.`,
                                timestamp: new Date(),
                              },
                            ])
                          } else if (infoDraft && address) {
                            // fetch balance/APY snapshot and answer
                            loadAssetSnapshot(nextAsset, address as Address)
                              .then((snap) => {
                                const daily = (snap.vault * (snap.apy / 100)) / 365
                                setMessages((prev) => [
                                  ...prev,
                                  {
                                    role: 'assistant',
                                    content:
                                      infoDraft.kind === 'apy'
                                        ? `Current APY for ${snap.symbol}: ${snap.apy.toFixed(2)}%. Estimated daily earnings: ${daily.toFixed(6)} ${snap.symbol}/day (on your vault balance of ${snap.vault.toFixed(6)} ${snap.symbol}).`
                                        : `For ${snap.symbol}: Vault balance ${snap.vault.toFixed(6)} ${snap.symbol}, Wallet ${snap.wallet.toFixed(6)} ${snap.symbol}.`,
                                    timestamp: new Date(),
                                  },
                                ])
                              })
                              .finally(() => setInfoDraft(null))
                          }
                        }}
                        className="px-3 py-1.5 rounded-md text-xs border border-white/10 text-white/80 hover:bg-white/10"
                      >
                        {sym === 'CUSD' ? 'USDm' : sym}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 sm:gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder={isConnected ? "Ask me anything about your vault..." : "Connect wallet to start..."}
                disabled={!isConnected || isLoading}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#2BA3FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSendMessage}
                disabled={!isConnected || isLoading || !input.trim()}
                className="w-12 h-12 bg-[#2BA3FF] text-white rounded-full flex items-center justify-center hover:bg-[#1a8fdb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                <Send className="w-5 h-5" />
                )}
              </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
