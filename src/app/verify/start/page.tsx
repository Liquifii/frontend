'use client'

import { motion } from 'framer-motion'
import { Shield, Check, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Navbar from '../../../components/navbar'
import sdk from '@farcaster/miniapp-sdk'
import { useState, useEffect } from 'react'

export default function VerifyStartPage() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      sdk.actions.ready();
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);
  
  return (
    <div style={{ backgroundColor: '#141414', minHeight: '100vh' }}>
      <Navbar />
      
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[500px] bg-[#1a1a1a] rounded-2xl border border-white/10 p-6 sm:p-8 shadow-2xl"
        >
          {/* Shield Icon with Checkmark */}
          <div className="flex justify-center mb-6">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <Shield className="w-16 h-16 text-[#2BA3FF]" fill="#2BA3FF" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Check className="w-6 h-6 text-white" strokeWidth={3} />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-6">
            Verify Your Identity
          </h1>

          {/* Description */}
          <p className="text-white/80 text-center mb-8 leading-relaxed text-base">
            You need to verify your identity with Self protocol before you can start earning
          </p>

          {/* Start Verification Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-[#2BA3FF] text-white rounded-xl px-6 py-4 font-semibold hover:bg-[#1a8fdb] transition-colors flex items-center justify-center gap-2"
          >
            <Link href="/verify" className="flex items-center gap-2">
              Start Verification
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}

