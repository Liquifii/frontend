'use client'

import { useState } from 'react'
import { 
  Home, 
  Brain, 
  Settings, 
  Rocket,
  ArrowUpDown,
  Send,
  TrendingUp
} from 'lucide-react'
import Navbar from '../../components/navbar'
import Link from 'next/link'

export default function AIAssistantPage() {
  const [message, setMessage] = useState('')

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
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-[#2BA3FF]/20 text-[#2BA3FF] rounded-lg font-medium">
              <Brain className="w-5 h-5" />
              <span>AI Assistant</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
              <span>Strategy</span>
            </a>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col" style={{ backgroundColor: '#0E0E11' }}>
          <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Your AI Yield Advisor</h1>
                  <p className="text-white/60 text-sm sm:text-base">AI helps you optimize your earnings</p>
                </div>
                <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-full px-3 sm:px-4 py-2 text-sm sm:text-base">
                  <span className="text-white/70 text-sm">Est. APY</span>
                  <div className="flex items-center gap-1">
                    <span className="text-green-400 font-semibold">6.25% - 7.10%</span>
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                </div>
              </div>

              {/* AI Insights Box */}
              <div 
                className="rounded-lg p-6 border border-white/10 mb-6"
                style={{ backgroundColor: '#1a1a1d' }}
              >
                <div className="space-y-4">
                  <p className="text-white text-base">
                    Your balance grew by <span className="text-green-400 font-semibold">2.49%</span> this week.
                  </p>
                  <p className="text-white text-base">
                    Increasing your daily deposit by <span className="text-[#2BA3FF] font-semibold">$5/day</span> boosts yearly returns by <span className="text-green-400 font-semibold">+$109.50</span>.
                  </p>
                  <p className="text-white text-base">
                    You are outperforming <span className="text-green-400 font-semibold">78%</span> of users in your tier.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <button className="flex items-center justify-center gap-2 px-6 py-3 bg-[#2BA3FF] text-white rounded-lg font-semibold hover:bg-[#1a8fdb] transition-colors">
                  <Rocket className="w-5 h-5" />
                  Boost Earnings
                </button>
                <button className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-lg font-semibold hover:bg-white/10 transition-colors">
                  <div className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-xs font-bold">A</span>
                  </div>
                  Auto-Deposit Setup
                </button>
                <button className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-lg font-semibold hover:bg-white/10 transition-colors">
                  <ArrowUpDown className="w-5 h-5" />
                  Switch Yield Mode
                </button>
              </div>
            </div>
          </div>

          {/* Chat Input - Fixed at bottom */}
          <div className="p-4 lg:p-6 border-t border-white/10">
            <div className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask to boost your earnings"
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#2BA3FF] transition-colors"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    // Handle send message
                    setMessage('')
                  }
                }}
              />
              <button className="w-12 h-12 bg-[#2BA3FF] text-white rounded-full flex items-center justify-center hover:bg-[#1a8fdb] transition-colors">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

