import React from 'react'
import { User, Wallet, DollarSign } from 'lucide-react';

const Steps = () => {
  return (
    <section className="w-full py-16 px-4" style={{ backgroundColor: '#141414' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h3 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Start Earning in 3 Simple Steps
          </h3>
          <p className="text-lg text-gray-400">
            From zero to earning in less than 5 minutes.
          </p>
        </div>

        {/* Step 1 */}
        <div className="relative flex items-start gap-8 mb-16">
          <div className="shrink-0">
            <div className="w-20 h-20 rounded-full border-2 border-[#2BA3FF] flex items-center justify-center bg-transparent">
              <span className="text-white text-4xl font-bold">1</span>
            </div>
          </div>
          
          <div className="flex-1 pt-2">
            <h2 className="text-2xl font-semibold text-white mb-3">Verify Your Identity</h2>
            <p className="text-gray-400 leading-relaxed max-w-md">
              Scan your passport with your phone. Self Protocol creates a zero-knowledge proof. Your data never leaves your device.
            </p>
          </div>
          
          <div className="shrink-0 pt-2 relative">
            <div className="w-16 h-16 rounded-lg bg-[#2BA3FF]/20 flex items-center justify-center border border-[#2BA3FF]">
              <User className="w-8 h-8 text-[#2BA3FF]" />
            </div>
            {/* Connecting line */}
            <div className="absolute top-20 left-1/2 w-0.5 h-24 bg-[#2BA3FF] transform -translate-x-1/2"></div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="relative flex items-start gap-8 mb-16 flex-row-reverse">
          <div className="shrink-0">
            <div className="w-20 h-20 rounded-full border-2 border-[#2BA3FF] flex items-center justify-center bg-transparent">
              <span className="text-white text-4xl font-bold">2</span>
            </div>
          </div>
          
          <div className="flex-1 pt-2 text-right">
            <h2 className="text-2xl font-semibold text-white mb-3">Deposit cUSD</h2>
            <p className="text-gray-400 leading-relaxed max-w-md ml-auto">
              Start with as little as 10 cUSD. Funds automatically deploy. Interest starts immediately.
            </p>
          </div>
          
          <div className="shrink-0 pt-2 relative">
            <div className="w-16 h-16 rounded-lg bg-[#2BA3FF]/20 flex items-center justify-center border border-[#2BA3FF]">
              <Wallet className="w-8 h-8 text-[#2BA3FF]" />
            </div>
            {/* Connecting line */}
            <div className="absolute top-20 left-1/2 w-0.5 h-24 bg-[#2BA3FF] transform -translate-x-1/2"></div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="relative flex items-start gap-8">
          <div className="shrink-0">
            <div className="w-20 h-20 rounded-full border-2 border-[#2BA3FF] flex items-center justify-center bg-transparent">
              <span className="text-white text-4xl font-bold">3</span>
            </div>
          </div>
          
          <div className="flex-1 pt-2">
            <h2 className="text-2xl font-semibold text-white mb-3">Watch Your Money Grow</h2>
            <p className="text-gray-400 leading-relaxed max-w-md">
              Check dashboard daily. Chat with AI for advice. Withdraw anytime—no fees, no lock-ups.
            </p>
          </div>
          
          <div className="shrink-0 pt-2">
            <div className="w-16 h-16 rounded-lg bg-[#2BA3FF]/20 flex items-center justify-center border border-[#2BA3FF]">
              <DollarSign className="w-8 h-8 text-[#2BA3FF]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Steps
