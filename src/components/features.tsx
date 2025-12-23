import React from 'react'
import { ShieldCheck, TrendingUp, Bot, LockKeyhole, Wallet, LineChart } from 'lucide-react'

type Feature = {
  title: string
  description: string
  icon: typeof ShieldCheck
  badgeClass: string
}

const features: Feature[] = [
  {
    title: 'Privacy-Preserving Verification',
    description:
      "Verify your identity using Self Protocol's zero-knowledge proofs. Prove you're 18+ without revealing personal data.",
    icon: ShieldCheck,
    badgeClass: 'badge-cyan',
  },
  {
    title: 'Automatic Yield Generation',
    description: 'Your funds are deployed to earning yield. Watch your balance grow with compound interest 24/7.',
    icon: TrendingUp,
    badgeClass: 'badge-green',
  },
  {
    title: 'AI-Powered Recommendations',
    description: 'Chat with your AI advisor. Get personalized strategies based on your goals and risk tolerance.',
    icon: Bot,
    badgeClass: 'badge-purple',
  },
  {
    title: 'Bank-Grade Security',
    description: 'Audited smart contracts and battle-tested DeFi protocols. Your funds stay under your control.',
    icon: LockKeyhole,
    badgeClass: 'badge-purple',
  },
  {
    title: 'Instant Withdrawals',
    description: 'No lock-ups, no penalties, no waiting. Withdraw anytime with one click. True financial freedom.',
    icon: Wallet,
    badgeClass: 'badge-cyan',
  },
  {
    title: 'Real-Time Analytics',
    description: 'Track performance, earnings history, and projected returns. Beautiful charts at your fingertips.',
    icon: LineChart,
    badgeClass: 'badge-green',
  },
]

const Features = () => {
  return (
    <section className="w-full py-12 px-4" style={{ backgroundColor: '#141414' }}>

        <div className='text-center mx-auto py-14 px-4'>
            <h3 className='text-white font-semibold tracking-tight text-3xl md:text-4xl mb-2'>Everything You Need to Earn with Confidence</h3>
            <p className='text-[#939393F2]'>Professional-grade features designed for everyone</p>
        </div>

      <div className="max-w-6xl mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ title, description, icon: Icon, badgeClass }) => (
          <div
            key={title}
            className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] border border-white/5 p-6 text-white shadow-lg"
          >
            <div
              className={`absolute -right-4 -top-4 flex h-14 w-14 items-center justify-center rounded-xl ${badgeClass} shadow-[0_0_35px_rgba(0,0,0,0.45)] ring-1 ring-white/10`}
            >
              <Icon size={22} />
            </div>
            <h3 className="mb-3 pr-12 text-xl font-semibold">{title}</h3>
            <p className="text-sm leading-6 text-gray-300">{description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default Features

