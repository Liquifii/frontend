'use client'

import { motion } from 'framer-motion'
import { Shield, Check, Monitor, Smartphone, QrCode } from 'lucide-react'
import Navbar from '../../components/navbar'
import sdk from '@farcaster/miniapp-sdk';
import { useState, useEffect } from 'react';

export default function VerifyPage() {
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
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-2">
            Identity Verification
          </h1>

          {/* Powered by */}
          <p className="text-sm text-gray-400 text-center mb-8">
            Powered by Self Protocol
          </p>

          {/* Why Verify Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Why verify?</h2>
            <div className="space-y-3">
              {[
                'Access to all platform features',
                'Secure and privacy-preserving',
                'One-time verification process',
                'Age 18+ and compliance checks'
              ].map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-[#2BA3FF] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                  <span className="text-white/90 text-sm leading-relaxed">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Info Text */}
          <p className="text-white/70 text-sm text-center mb-8 leading-relaxed">
            Self Protocol uses zero-knowledge proofs to verify your identity without sharing personal data on-chain.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Verify on Desktop */}
            <div className="flex-1">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-[#2BA3FF] text-white rounded-xl px-6 py-3 font-semibold hover:bg-[#1a8fdb] transition-colors flex items-center justify-center gap-2 h-12"
              >
                <Monitor className="w-5 h-5" />
                <span>Verify on Desktop</span>
              </motion.button>
              <p className="text-xs text-gray-400 text-center mt-2 flex items-center justify-center gap-1">
                <QrCode className="w-3 h-3" />
                Scan QR code with Self app
              </p>
            </div>

            {/* Verify on Mobile */}
            <div className="flex-1">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-[#2BA3FF] text-white rounded-xl px-6 py-3 font-semibold hover:bg-[#1a8fdb] transition-colors flex items-center justify-center gap-2 h-12"
              >
                <Smartphone className="w-5 h-5" />
                <span>Verify on Mobile</span>
              </motion.button>
              <p className="text-xs text-gray-400 text-center mt-2">
                Open Self app directly
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

