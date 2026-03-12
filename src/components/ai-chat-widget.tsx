'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, X, MessageCircle } from 'lucide-react'
import Link from 'next/link'

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Chat Widget Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          delay: 2,
          type: "spring",
          stiffness: 200,
          damping: 15
        }}
      >
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              onClick={() => setIsOpen(true)}
              className="relative w-16 h-16 bg-[#2BA3FF] rounded-full shadow-2xl flex items-center justify-center text-white hover:bg-[#1a8fdb] transition-colors group"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <motion.div
                className="absolute inset-0 rounded-full bg-[#2BA3FF]"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <Brain className="w-7 h-7 relative z-10" />
              
              {/* Notification badge */}
              <motion.div
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold"
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <span className="text-white">!</span>
              </motion.div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Chat Bubble */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute bottom-20 right-0 w-80 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#2BA3FF] rounded-full flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm">AI Yield Advisor</h4>
                    <p className="text-white/60 text-xs">Always here to help</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-white/80 text-sm mb-4 leading-relaxed">
                Chat with LiquiFi Advisor to optimize your DeFi strategy, maximize your savings, and get personalized guidance on deposits, withdrawals, and yield generation.
              </p>
              
              <Link
                href="/ai-assistant"
                onClick={() => setIsOpen(false)}
                className="block w-full bg-[#2BA3FF] text-white text-center py-2.5 rounded-lg font-medium hover:bg-[#1a8fdb] transition-colors text-sm"
              >
                Chat with LiquiFi Advisor
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}
