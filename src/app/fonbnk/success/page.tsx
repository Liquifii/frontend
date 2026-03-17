'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, ArrowRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function FonbnkSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [type, setType] = useState<string | null>(null)

  useEffect(() => {
    const orderIdParam = searchParams.get('orderId')
    const statusParam = searchParams.get('status')
    const typeParam = searchParams.get('type')

    setOrderId(orderIdParam)
    setStatus(statusParam)
    setType(typeParam)
  }, [searchParams])

  const isSuccess = status === 'payout_successful' || status === 'success'
  const isPending = status === 'pending' || status === 'processing'
  const isFailed = status === 'payout_failed' || status === 'failed' || status === 'error'

  return (
    <div style={{ backgroundColor: '#0E0E11', minHeight: '100vh' }} className="flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="rounded-lg p-6 sm:p-8 border border-white/10 bg-[#1a1a1d]">
          {isSuccess ? (
            <>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
                <p className="text-white/70 text-sm">
                  {type === 'onramp'
                    ? 'Your cUSD has been sent to your wallet. You can now deposit it into the vault to start earning yield.'
                    : 'Your withdrawal has been processed successfully.'}
                </p>
              </div>
              {orderId && (
                <div className="mb-6 p-3 bg-white/5 rounded-lg">
                  <p className="text-white/60 text-xs mb-1">Order ID</p>
                  <p className="text-white font-mono text-sm break-all">{orderId}</p>
                </div>
              )}
              <div className="flex flex-col gap-3">
                <Link
                  href={type === 'onramp' ? '/deposits' : '/withdrawals'}
                  className="w-full py-3 bg-[#2BA3FF] text-white rounded-lg font-semibold hover:bg-[#1a8fdb] transition-colors flex items-center justify-center gap-2"
                >
                  {type === 'onramp' ? 'Go to Deposit' : 'Go to Withdrawals'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/dashboards"
                  className="w-full py-3 bg-white/5 text-white rounded-lg font-semibold hover:bg-white/10 transition-colors text-center"
                >
                  Back to Dashboard
                </Link>
              </div>
            </>
          ) : isPending ? (
            <>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                  <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Processing...</h1>
                <p className="text-white/70 text-sm">
                  Your payment is being processed. This may take a few minutes. You'll receive a notification once it's complete.
                </p>
              </div>
              {orderId && (
                <div className="mb-6 p-3 bg-white/5 rounded-lg">
                  <p className="text-white/60 text-xs mb-1">Order ID</p>
                  <p className="text-white font-mono text-sm break-all">{orderId}</p>
                </div>
              )}
              <Link
                href="/dashboards"
                className="w-full py-3 bg-white/5 text-white rounded-lg font-semibold hover:bg-white/10 transition-colors text-center block"
              >
                Back to Dashboard
              </Link>
            </>
          ) : isFailed ? (
            <>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                  <XCircle className="w-10 h-10 text-red-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Payment Failed</h1>
                <p className="text-white/70 text-sm">
                  Unfortunately, your payment could not be processed. Please try again or contact support if the issue persists.
                </p>
              </div>
              {orderId && (
                <div className="mb-6 p-3 bg-white/5 rounded-lg">
                  <p className="text-white/60 text-xs mb-1">Order ID</p>
                  <p className="text-white font-mono text-sm break-all">{orderId}</p>
                </div>
              )}
              <div className="flex flex-col gap-3">
                <Link
                  href={type === 'onramp' ? '/deposits' : '/withdrawals'}
                  className="w-full py-3 bg-[#2BA3FF] text-white rounded-lg font-semibold hover:bg-[#1a8fdb] transition-colors text-center"
                >
                  Try Again
                </Link>
                <Link
                  href="/dashboards"
                  className="w-full py-3 bg-white/5 text-white rounded-lg font-semibold hover:bg-white/10 transition-colors text-center"
                >
                  Back to Dashboard
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-10 h-10 text-yellow-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Unknown Status</h1>
                <p className="text-white/70 text-sm">
                  We couldn't determine the payment status. Please check your wallet or contact support.
                </p>
              </div>
              <Link
                href="/dashboards"
                className="w-full py-3 bg-[#2BA3FF] text-white rounded-lg font-semibold hover:bg-[#1a8fdb] transition-colors text-center block"
              >
                Back to Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
