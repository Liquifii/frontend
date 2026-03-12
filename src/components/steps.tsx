'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { User, Wallet, Brain } from 'lucide-react'

export default function Steps() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section className="w-full py-16 px-4" style={{ backgroundColor: '#141414' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Start Earning in 3 Simple Steps
          </h3>
          <p className="text-lg text-gray-400">
            From zero to earning in less than 5 minutes.
          </p>
        </motion.div>

      {/* Step 1 */}
        <motion.div 
          ref={ref}
          className="relative flex items-start gap-8 mb-16"
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.div 
            className="shrink-0"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <motion.div 
              className="w-20 h-20 rounded-full border-2 border-[#2BA3FF] flex items-center justify-center bg-transparent relative"
              animate={{
                boxShadow: [
                  "0 0 0px rgba(43, 163, 255, 0.4)",
                  "0 0 20px rgba(43, 163, 255, 0.6)",
                  "0 0 0px rgba(43, 163, 255, 0.4)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-white text-4xl font-bold">1</span>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="flex-1 pt-2"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h2 className="text-2xl font-semibold text-white mb-3">Connect Your Wallet</h2>
            <p className="text-gray-400 leading-relaxed max-w-md">
              Connect your Farcaster or Web3 wallet in seconds. No KYC, no verification needed. Our AI advisor is ready to help you get started and answer any questions.
            </p>
          </motion.div>
          
          <motion.div 
            className="shrink-0 pt-2 relative"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.6, delay: 0.6, type: "spring" }}
            whileHover={{ scale: 1.1 }}
          >
            <motion.div 
              className="w-16 h-16 rounded-lg bg-[#2BA3FF]/20 flex items-center justify-center border border-[#2BA3FF]"
              animate={{ 
                rotate: [0, 5, -5, 0],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <User className="w-8 h-8 text-[#2BA3FF]" />
            </motion.div>
            {/* Animated Connecting line */}
            <motion.div 
              className="absolute top-20 left-1/2 w-0.5 bg-[#2BA3FF] transform -translate-x-1/2"
              initial={{ height: 0 }}
              animate={isInView ? { height: 96 } : { height: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            />
          </motion.div>
        </motion.div>

        {/* Step 2 */}
        <motion.div 
          className="relative flex items-start gap-8 mb-16 flex-row-reverse"
          initial={{ opacity: 0, x: 50 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <motion.div 
            className="shrink-0"
            whileHover={{ scale: 1.1, rotate: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <motion.div 
              className="w-20 h-20 rounded-full border-2 border-[#2BA3FF] flex items-center justify-center bg-transparent"
              animate={{
                boxShadow: [
                  "0 0 0px rgba(43, 163, 255, 0.4)",
                  "0 0 20px rgba(43, 163, 255, 0.6)",
                  "0 0 0px rgba(43, 163, 255, 0.4)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            >
              <span className="text-white text-4xl font-bold">2</span>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="flex-1 pt-2 text-right"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <h2 className="text-2xl font-semibold text-white mb-3">Deposit & Let AI Help You Save</h2>
            <p className="text-gray-400 leading-relaxed max-w-md ml-auto">
              Start with as little as 10 cUSD. Our AI analyzes your goals and suggests optimal deposit amounts and strategies to maximize your savings. Funds automatically deploy with AI-optimized strategies.
            </p>
          </motion.div>
          
          <motion.div 
            className="shrink-0 pt-2 relative"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.6, delay: 0.8, type: "spring" }}
            whileHover={{ scale: 1.1 }}
          >
            <motion.div 
              className="w-16 h-16 rounded-lg bg-[#2BA3FF]/20 flex items-center justify-center border border-[#2BA3FF] relative"
              animate={{ 
                rotate: [0, -5, 5, 0],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
              <Wallet className="w-8 h-8 text-[#2BA3FF]" />
              {/* AI indicator */}
              <motion.div
                className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center"
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Brain className="w-3 h-3 text-white" />
              </motion.div>
            </motion.div>
            {/* Animated Connecting line */}
            <motion.div 
              className="absolute top-20 left-1/2 w-0.5 bg-[#2BA3FF] transform -translate-x-1/2"
              initial={{ height: 0 }}
              animate={isInView ? { height: 96 } : { height: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
            />
          </motion.div>
        </motion.div>

        {/* Step 3 */}
        <motion.div 
          className="relative flex items-start gap-8"
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <motion.div 
            className="shrink-0"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <motion.div 
              className="w-20 h-20 rounded-full border-2 border-[#2BA3FF] flex items-center justify-center bg-transparent"
              animate={{
                boxShadow: [
                  "0 0 0px rgba(43, 163, 255, 0.4)",
                  "0 0 20px rgba(43, 163, 255, 0.6)",
                  "0 0 0px rgba(43, 163, 255, 0.4)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            >
              <span className="text-white text-4xl font-bold">3</span>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="flex-1 pt-2"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <h2 className="text-2xl font-semibold text-white mb-3">Watch AI Optimize Your Savings</h2>
            <p className="text-gray-400 leading-relaxed max-w-md">
              Your AI Yield Advisor continuously monitors market conditions and optimizes your strategy to help you save more. Chat anytime for personalized advice on maximizing returns, timing withdrawals, and adjusting your strategy. Withdraw anytime—no fees, no lock-ups.
            </p>
          </motion.div>
          
          <motion.div 
            className="shrink-0 pt-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.6, delay: 1, type: "spring" }}
            whileHover={{ scale: 1.1 }}
          >
            <motion.div 
              className="w-16 h-16 rounded-lg bg-[#2BA3FF]/20 flex items-center justify-center border border-[#2BA3FF]"
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
              <Brain className="w-8 h-8 text-[#2BA3FF]" />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
