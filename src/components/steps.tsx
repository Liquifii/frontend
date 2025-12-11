import React from 'react'
import { UserCheck, Wallet } from 'lucide-react'
import { User, TrendingUp, DollarSign } from 'lucide-react';

const Steps = () => {
  return (
    <section className="w-full py-16 px-4 bg-[#221F24]">
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
        <div className="flex items-start gap-8">
          <div className="shrink-0">
            <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center">
              <span className="text-white text-4xl font-bold">1</span>
            </div>
          </div>
          
          <div className="flex-1 pt-4">
            <h2 className="text-2xl font-light text-gray-400 mb-4">Verify Your Identity</h2>
            <p className="text-gray-500 leading-relaxed max-w-md">
              Scan your passport with your phone. Self Protocol creates a zero-knowledge proof. Your data never leaves your device.
            </p>
          </div>
          
          <div className="shrink-0 pt-8">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          
          <div className="flex-1 border-t border-gray-200 mt-12"></div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-8">
          <div className="flex-1 border-t border-gray-200 mt-12"></div>
          
          <div className="shrink-0 pt-8">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          
          <div className="flex-1 pt-4 text-right">
            <h2 className="text-2xl font-light text-gray-400 mb-4">Deposit cUSD</h2>
            <p className="text-gray-500 leading-relaxed max-w-md ml-auto">
              Start with as little as 10 cUSD. Funds automatically deploy. Interest starts immediately.
            </p>
          </div>
          
          <div className="shrink-0">
            <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center">
              <span className="text-white text-4xl font-bold">2</span>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-8">
          <div className="shrink-0">
            <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center">
              <span className="text-white text-4xl font-bold">3</span>
            </div>
          </div>
          
          <div className="flex-1 pt-4">
            <h2 className="text-2xl font-light text-gray-400 mb-4">Watch Your Money Grow</h2>
            <p className="text-gray-500 leading-relaxed max-w-md">
              Check dashboard daily. Chat with AI for advice. Withdraw anytime—no fees, no lock-ups.
            </p>
          </div>
          
          <div className="shrink-0 pt-8">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          
          <div className="flex-1 border-t border-gray-200 mt-12"></div>
        </div>
      </div>
    </section>
  )
}

export default Steps
