'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface YieldAnimationProps {
  balance: number
  apy: number | null
  isVisible: boolean
}

export default function YieldAnimation({ balance, apy, isVisible }: YieldAnimationProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])

  // Calculate particle density based on APY
  const particleCount = apy ? Math.min(Math.max(Math.floor(apy * 2), 5), 30) : 10

  useEffect(() => {
    // Generate particles with random starting positions
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
    }))
    setParticles(newParticles)
  }, [particleCount])

  if (!isVisible) return null

  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
      {/* Root/Mycelium Growth Pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="rootGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2BA3FF" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#10B981" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        
        {/* Root system - grows from bottom center */}
        <motion.g
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.3 }}
          transition={{ duration: 3, delay: 0.5 }}
        >
          {/* Main root */}
          <motion.path
            d="M 200 180 Q 180 150 160 120 Q 140 90 120 60"
            stroke="url(#rootGradient)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
          <motion.path
            d="M 200 180 Q 220 150 240 120 Q 260 90 280 60"
            stroke="url(#rootGradient)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 4, delay: 0.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
          
          {/* Branching roots */}
          <motion.path
            d="M 160 120 Q 150 100 145 80"
            stroke="url(#rootGradient)"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, delay: 1, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
          <motion.path
            d="M 240 120 Q 250 100 255 80"
            stroke="url(#rootGradient)"
            strokeWidth="1"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, delay: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
        </motion.g>

        {/* Glowing nodes along roots */}
        {[120, 160, 200, 240, 280].map((x, i) => (
          <motion.circle
            key={`node-${i}`}
            cx={x}
            cy={60 + i * 20}
            r="2"
            fill="#2BA3FF"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2,
              delay: i * 0.3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </svg>

      {/* Particle Harvest */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            background: `radial-gradient(circle, #2BA3FF, #10B981)`,
            boxShadow: `0 0 8px #2BA3FF, 0 0 12px #10B981`,
          }}
          initial={{
            opacity: 0,
            scale: 0,
            y: 0,
          }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0, 1.2, 1, 0],
            y: [0, -100],
            x: [0, (Math.random() - 0.5) * 50],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            delay: particle.delay,
            repeat: Infinity,
            repeatDelay: Math.random() * 2,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Additional floating particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={`float-${i}`}
          className="absolute w-1 h-1 rounded-full bg-[#2BA3FF]"
          style={{
            left: `${20 + i * 10}%`,
            top: `${30 + (i % 3) * 20}%`,
            boxShadow: `0 0 6px #2BA3FF`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 4 + i * 0.5,
            delay: i * 0.3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
}
