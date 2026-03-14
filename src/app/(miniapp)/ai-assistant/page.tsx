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
import { useAccount } from 'wagmi'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits, type Address } from 'viem'
import { AttestifyVaultContract, CUSD_ADDRESS } from '../../abi'
import { sdk } from '@farcaster/miniapp-sdk'

// Utility to detect if we're in Farcaster MiniApp
function isInMiniApp(): boolean {
  if (typeof window === 'undefined') return false
  return window.self !== window.top || !!window.ReactNativeWebView
}

// ERC20 ABI for approvals
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
] as const

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  transactionRequest?: {
    action: 'deposit' | 'withdraw'
    amount_cusd: number
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
  const { writeContract, data: txHash } = useWriteContract()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId] = useState(() => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus | null>(null)
  const [approveHash, setApproveHash] = useState<`0x${string}` | undefined>()
  const [vaultHash, setVaultHash] = useState<`0x${string}` | undefined>()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  
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

  const { isLoading: isApproving, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  })
  const { isLoading: isExecuting, isSuccess: isExecuteSuccess } = useWaitForTransactionReceipt({
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

    try {
      setTransactionStatus((prev) => prev ? { ...prev, status: 'executing' } : null)

      const amountWei = parseUnits(transactionStatus.amount.toString(), 18)

      if (transactionStatus.type === 'deposit') {
        writeContract({
          address: AttestifyVaultContract.address as Address,
          abi: VAULT_ABI,
          functionName: 'deposit',
          args: [amountWei],
        })
      } else {
        // Withdraw with 1% slippage tolerance
        const minAssetsOut = (amountWei * BigInt(99)) / BigInt(100)
        writeContract({
          address: AttestifyVaultContract.address as Address,
          abi: VAULT_ABI,
          functionName: 'withdraw',
          args: [amountWei, minAssetsOut],
        })
      }
    } catch (error) {
      setTransactionStatus((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              error: error instanceof Error ? error.message : 'Transaction failed',
            }
          : null
      )
    }
  }

  const handleTransactionSuccess = async (txHash: string) => {
    if (!transactionStatus) return

    setTransactionStatus((prev) =>
      prev ? { ...prev, status: 'success', txHash } : null
    )

    // Add success message to chat
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: `✅ Transaction successful! Your ${transactionStatus.type} of $${transactionStatus.amount} cUSD has been completed.`,
        timestamp: new Date(),
        txHash: txHash,
      },
    ])

    // Clear transaction status after 5 seconds
    setTimeout(() => {
      setTransactionStatus(null)
    }, 5000)
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

    setMessages((prev) => [...prev, userMessage])
    const messageContent = input.trim()
    setInput('')
    setIsLoading(true)

    // Send message to AI agent
    try {
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
      const assistantContent = data.reply || 'I couldn\'t generate a response. Please try again.'

      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        transactionRequest: data.transactionRequest,
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Handle transaction request
      if (data.transactionRequest) {
        const { action, amount_cusd } = data.transactionRequest
        setTransactionStatus({
          type: action,
          amount: amount_cusd,
          status: 'pending',
        })
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveTransaction = async () => {
    if (!transactionStatus || !address) return

    try {
      setTransactionStatus((prev) => prev ? { ...prev, status: 'approving' } : null)

      const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

      writeContract({
        address: CUSD_ADDRESS as Address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [AttestifyVaultContract.address as Address, maxApproval],
      })
    } catch (error) {
      setTransactionStatus((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              error: error instanceof Error ? error.message : 'Approval failed',
            }
          : null
      )
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
                          Transaction Request: {message.transactionRequest.action} ${message.transactionRequest.amount_cusd} cUSD
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
                      <p className="text-white font-semibold">${transactionStatus.amount} cUSD</p>
                    </div>
                    {transactionStatus.status === 'approving' && (
                      <div className="flex items-center gap-2 text-[#2BA3FF]">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <p className="text-sm">Approving cUSD...</p>
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
                  Your {transactionStatus.type} of ${transactionStatus.amount} cUSD has been completed.
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
            <div className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3">
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
        </main>
      </div>
    </div>
  )
}
