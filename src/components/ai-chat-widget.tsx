'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, X, MessageCircle } from 'lucide-react'
import Link from 'next/link'

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasAutoOpened, setHasAutoOpened] = useState(false)
  const [isMiniApp, setIsMiniApp] = useState(false)

  useEffect(() => {
    const inMiniApp =
      window.self !== window.top || !!window.ReactNativeWebView || window.location !== window.parent.location
    setIsMiniApp(inMiniApp)
  }, [])

  // Auto-open after 5 seconds on landing page (common pattern: 5-10 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasAutoOpened) {
        setIsOpen(true)
        setHasAutoOpened(true)
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [hasAutoOpened])

  // Floating widgets are prone to overflow issues in embedded mini-app webviews.
  // Keep this for the full web landing page, and hide it in mini-app context.
  if (isMiniApp) return null

  return (
    <>
      {/* Chat Widget Button */}
      <motion.div
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50"
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
            <motion.div
              className="relative"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onHoverStart={() => {
                if (!hasAutoOpened) {
                  setIsOpen(true)
                  setHasAutoOpened(true)
                }
              }}
            >
              <motion.button
                onClick={() => {
                  setIsOpen(true)
                  setHasAutoOpened(true)
                }}
                className="relative w-14 h-14 sm:w-16 sm:h-16 bg-[#2BA3FF] rounded-full shadow-2xl flex items-center justify-center text-white hover:bg-[#1a8fdb] transition-colors group"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 relative z-10" />
                
                {/* Subtle pulse animation (common pattern - no notification badge) */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-[#2BA3FF]"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0, 0.3],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.button>
            </motion.div>
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
              className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-24 sm:w-80 md:w-96 sm:max-w-sm bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-3 sm:p-4 md:p-5 z-50"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#2BA3FF] rounded-full flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm sm:text-base">Hi! 👋</h4>
                    <p className="text-white/60 text-[10px] sm:text-xs">I'm your AI Yield Advisor</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/60 hover:text-white hover:bg-white/10 rounded-full p-1 sm:p-1.5 transition-colors flex-shrink-0"
                  aria-label="Close chat widget"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              <p className="text-white/80 text-xs sm:text-sm mb-4 leading-relaxed">
                Need help? I can assist with deposits, withdrawals, and optimizing your yield strategy.
              </p>
              
              <Link
                href="/ai-assistant"
                onClick={() => setIsOpen(false)}
                className="block w-full bg-[#2BA3FF] text-white text-center py-2.5 sm:py-3 rounded-lg font-medium hover:bg-[#1a8fdb] transition-colors text-xs sm:text-sm"
              >
                Start chatting
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}
