'use client'

import React, { useRef } from 'react'
import { motion, useInView, Variants } from 'framer-motion'
import { ShieldCheck, TrendingUp, Bot, LockKeyhole, Wallet, LineChart } from 'lucide-react'

type Feature = {
  title: string
  description: string
  icon: typeof ShieldCheck
  badgeClass: string
}

const features: Feature[] = [
  {
    title: 'AI Yield Advisor',
    description:
      "Get personalized help with deposits, withdrawals, and strategy. Our AI assistant understands your goals and provides real-time recommendations to maximize your returns.",
    icon: Bot,
    badgeClass: 'badge-purple',
  },
  {
    title: 'Automatic Yield Generation',
    description: 'Your funds are deployed to earning yield. Watch your balance grow with compound interest 24/7.',
    icon: TrendingUp,
    badgeClass: 'badge-green',
  },
  {
    title: 'Smart Contract Security',
    description: 'Audited smart contracts and battle-tested DeFi protocols. Your funds stay under your control with transparent, on-chain operations.',
    icon: ShieldCheck,
    badgeClass: 'badge-cyan',
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
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 12,
      },
    },
  }

  return (
    <section className="w-full py-12 px-4" style={{ backgroundColor: '#141414' }}>
      <motion.div 
        className='text-center mx-auto py-14 px-4'
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h3 className='text-white font-semibold tracking-tight text-3xl md:text-4xl mb-2'>Everything You Need to Earn with Confidence</h3>
        <p className='text-[#939393F2]'>Professional-grade features designed for everyone</p>
      </motion.div>

      <motion.div 
        ref={ref}
        className="max-w-6xl mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        {features.map(({ title, description, icon: Icon, badgeClass }, index) => (
          <motion.div
            key={title}
            variants={itemVariants}
            whileHover={{ 
              y: -8,
              scale: 1.02,
              transition: { duration: 0.2 }
            }}
            className="relative overflow-hidden rounded-2xl bg-[#0a0a0a] border border-white/5 p-6 text-white shadow-lg group cursor-pointer"
          >
            <motion.div
              className={`absolute -right-4 -top-4 flex h-14 w-14 items-center justify-center rounded-xl ${badgeClass} shadow-[0_0_35px_rgba(0,0,0,0.45)] ring-1 ring-white/10`}
              whileHover={{ 
                rotate: [0, -10, 10, -10, 0],
                scale: 1.1,
              }}
              transition={{ duration: 0.5 }}
            >
              <Icon size={22} />
            </motion.div>
            
            {/* Hover gradient effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-[#2BA3FF]/0 via-[#2BA3FF]/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              initial={false}
            />
            
            <h3 className="mb-3 pr-12 text-xl font-semibold relative z-10">{title}</h3>
            <p className="text-sm leading-6 text-gray-300 relative z-10">{description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}

export default Features

