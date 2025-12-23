'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section
      ref={ref}
      className="py-24 relative overflow-hidden"
      style={{ backgroundColor: '#141414' }}
    >
      {/* Background image with multiply blend mode - exact design from Figma */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Base gradient background */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, #2A94D6 0%, #9829DA 100%)'
          }}
        ></div>
        {/* Background image with multiply blend mode */}
        <div className="absolute inset-0" style={{ mixBlendMode: 'multiply' }}>
          <Image
            src="/2f22a92387b798e3c0e549562dfe4319514bc67a.jpg"
            alt=""
            fill
            className="object-cover"
            priority
            quality={100}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-4xl md:text-5xl font-bold text-white mb-6"
          >
            Ready to Start Earning?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-xl text-white mb-8 max-w-2xl mx-auto"
          >
            Join verified users earning passive income
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex justify-center"
          >
            <motion.button
              whileHover={{
                scale: 1.05,
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              }}
              whileTap={{ scale: 0.95 }}
              className="group px-8 py-4 bg-white border border-gray-200 text-black rounded-xl font-semibold shadow-lg hover:shadow-2xl transition-all duration-300 inline-flex items-center gap-2"
            >
              <Link href="/dashboard" className="flex items-center gap-2 text-black">
                Launch App
                <ArrowRight className="h-5 w-5 text-black" />
              </Link>
            </motion.button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
